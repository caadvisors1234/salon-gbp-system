from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import update
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.config import get_settings
from app.core.crypto import decrypt_str, encrypt_str
from app.db.session import SessionLocal
from app.models.gbp_connection import GbpConnection
from app.models.gbp_location import GbpLocation
from app.models.gbp_media_upload import GbpMediaUpload
from app.models.gbp_post import GbpPost
from app.models.instagram_account import InstagramAccount
from app.models.job_log import JobLog
from app.models.media_asset import MediaAsset
from app.models.salon import Salon
from app.models.source_content import SourceContent
from app.scrapers.hotpepper_blog import fetch_blog_article, fetch_blog_links
from app.scrapers.hotpepper_coupon import fetch_coupons
from app.scrapers.hotpepper_style import fetch_style_images
from app.scrapers.text_transform import hotpepper_blog_to_gbp, instagram_caption_to_gbp
from app.services import gbp_client
from app.services.alerts import create_alert
from app.services.gbp_tokens import get_access_token
from app.services.meta_oauth import refresh_long_lived_token
from app.services.media_storage import (
    cleanup_old_assets,
    create_pending_asset,
    download_asset,
    mark_asset_available,
    mark_asset_failed,
)
from app.worker.celery_app import celery_app
from app.worker.scraper_helpers import create_gbp_posts_for_source, create_media_uploads_for_source


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _start_job(db: Session, *, salon_id: uuid.UUID | None, job_type: str) -> JobLog:
    job = JobLog(
        salon_id=salon_id,
        job_type=job_type,
        status="started",
        items_found=0,
        items_processed=0,
        started_at=_now(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _finish_job(
    db: Session,
    job: JobLog,
    *,
    status: str,
    items_found: int,
    items_processed: int,
    error_message: str | None = None,
) -> None:
    job.status = status
    job.items_found = items_found
    job.items_processed = items_processed
    job.error_message = (error_message or None)[:2000] if error_message else None
    job.completed_at = _now()
    db.add(job)
    db.commit()


def _salon_blog_url(salon: Salon) -> str | None:
    if salon.hotpepper_blog_url:
        return salon.hotpepper_blog_url
    if salon.hotpepper_salon_id:
        return f"https://beauty.hotpepper.jp/slnH{salon.hotpepper_salon_id}/blog/"
    return None


def _salon_style_url(salon: Salon) -> str | None:
    if salon.hotpepper_style_url:
        return salon.hotpepper_style_url
    if salon.hotpepper_salon_id:
        return f"https://beauty.hotpepper.jp/slnH{salon.hotpepper_salon_id}/style/"
    return None


def _salon_coupon_url(salon: Salon) -> str | None:
    if salon.hotpepper_coupon_url:
        return salon.hotpepper_coupon_url
    if salon.hotpepper_salon_id:
        return f"https://beauty.hotpepper.jp/slnH{salon.hotpepper_salon_id}/coupon/"
    return None


@celery_app.task(name="app.worker.tasks.download_media_asset", bind=True, max_retries=3)
def download_media_asset(self, asset_id: str) -> None:
    with SessionLocal() as db:
        asset = db.query(MediaAsset).filter(MediaAsset.id == uuid.UUID(asset_id)).one_or_none()
        if asset is None:
            return
        try:
            result = download_asset(db, asset)
            mark_asset_available(db, asset, result)
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            mark_asset_failed(db, asset, error_message=msg)
            try:
                create_alert(
                    db,
                    salon_id=asset.salon_id,
                    severity="warning",
                    alert_type="media_download_failed",
                    message=f"Media download failed: {msg}",
                    entity_type="media_asset",
                    entity_id=asset.id,
                )
            except Exception:
                pass
            raise self.retry(countdown=30) from e


@celery_app.task(name="app.worker.tasks.cleanup_media_assets")
def cleanup_media_assets() -> dict[str, Any]:
    with SessionLocal() as db:
        deleted = cleanup_old_assets(db)
    return {"deleted": deleted}


@celery_app.task(name="app.worker.tasks.refresh_instagram_tokens")
def refresh_instagram_tokens() -> dict[str, Any]:
    """Refresh Instagram long-lived tokens expiring within 14 days."""
    from datetime import timedelta

    settings = get_settings()
    refreshed = 0
    failed = 0
    with SessionLocal() as db:
        threshold = _now() + timedelta(days=14)
        accounts = (
            db.query(InstagramAccount)
            .filter(InstagramAccount.is_active.is_(True))
            .filter(InstagramAccount.token_expires_at <= threshold)
            .all()
        )
        logger.info("refresh_instagram_tokens: %d accounts to refresh", len(accounts))
        for acc in accounts:
            try:
                current_token = decrypt_str(acc.access_token_enc, settings.token_enc_key_b64)
                new_token = refresh_long_lived_token(settings, current_token=current_token)
                acc.access_token_enc = encrypt_str(new_token.access_token, settings.token_enc_key_b64)
                acc.token_expires_at = new_token.expires_at
                db.add(acc)
                db.commit()
                refreshed += 1
                logger.info("Refreshed Instagram token for account %s (%s)", acc.ig_username, acc.id)
            except Exception as e:  # noqa: BLE001
                db.rollback()
                failed += 1
                logger.error("Failed to refresh Instagram token for %s: %s", acc.ig_username, e)
                try:
                    create_alert(
                        db,
                        salon_id=acc.salon_id,
                        severity="critical",
                        alert_type="instagram_token_expiring",
                        message=f"Instagram token refresh failed for {acc.ig_username}. Re-authenticate required: {e}",
                        entity_type="instagram_account",
                        entity_id=acc.id,
                    )
                except Exception:
                    pass
    return {"refreshed": refreshed, "failed": failed}


@celery_app.task(name="app.worker.tasks.scrape_hotpepper_blog")
def scrape_hotpepper_blog() -> dict[str, Any]:
    found = 0
    processed = 0
    with SessionLocal() as db:
        job = _start_job(db, salon_id=None, job_type="scrape_blog")
        try:
            salons = db.query(Salon).filter(Salon.is_active.is_(True)).all()
            for salon in salons:
                blog_url = _salon_blog_url(salon)
                if not blog_url:
                    continue
                time.sleep(5)
                try:
                    links = fetch_blog_links(blog_url=blog_url)[:20]
                except Exception as e:  # noqa: BLE001
                    create_alert(
                        db,
                        salon_id=salon.id,
                        severity="warning",
                        alert_type="scrape_failed",
                        message=f"HotPepper blog list fetch failed: {e}",
                        entity_type="salon",
                        entity_id=salon.id,
                    )
                    continue

                for url in links:
                    exists = (
                        db.query(SourceContent)
                        .filter(SourceContent.salon_id == salon.id)
                        .filter(SourceContent.source_type == "hotpepper_blog")
                        .filter(SourceContent.source_id == url)
                        .one_or_none()
                    )
                    if exists:
                        continue
                    found += 1
                    try:
                        article = fetch_blog_article(url=url)
                        summary, first_img = hotpepper_blog_to_gbp(
                            title=article.title or "ブログ更新",
                            body_html=article.body_html,
                            article_url=article.url,
                        )
                        sc = SourceContent(
                            salon_id=salon.id,
                            source_type="hotpepper_blog",
                            source_id=url,
                            title=article.title,
                            body_html=article.body_html,
                            body_text=None,
                            image_urls=article.image_urls,
                            source_url=article.url,
                            source_published_at=article.published_at,
                        )
                        db.add(sc)
                        db.commit()
                        db.refresh(sc)

                        image_asset_id: uuid.UUID | None = None
                        if first_img:
                            asset = create_pending_asset(db, salon_id=salon.id, source_url=first_img)
                            image_asset_id = asset.id
                            download_media_asset.delay(str(asset.id))

                        create_gbp_posts_for_source(
                            db,
                            salon_id=salon.id,
                            sc=sc,
                            summary=summary,
                            image_asset_id=image_asset_id,
                            post_type="STANDARD",
                            cta_type="LEARN_MORE",
                            cta_url=article.url,
                            offer_redeem_online_url=None,
                        )
                        db.commit()
                        processed += 1
                    except Exception as e:  # noqa: BLE001
                        db.rollback()
                        create_alert(
                            db,
                            salon_id=salon.id,
                            severity="warning",
                            alert_type="scrape_failed",
                            message=f"HotPepper blog ingest failed: {e}",
                            entity_type="salon",
                            entity_id=salon.id,
                        )
                        continue

            _finish_job(db, job, status="completed", items_found=found, items_processed=processed)
            return {"found": found, "processed": processed}
        except Exception as e:  # noqa: BLE001
            _finish_job(db, job, status="failed", items_found=found, items_processed=processed, error_message=str(e))
            raise


@celery_app.task(name="app.worker.tasks.scrape_hotpepper_style")
def scrape_hotpepper_style() -> dict[str, Any]:
    found = 0
    processed = 0
    with SessionLocal() as db:
        job = _start_job(db, salon_id=None, job_type="scrape_style")
        try:
            salons = db.query(Salon).filter(Salon.is_active.is_(True)).all()
            for salon in salons:
                style_url = _salon_style_url(salon)
                if not style_url:
                    continue
                time.sleep(5)
                try:
                    images = fetch_style_images(style_url=style_url)
                except Exception as e:  # noqa: BLE001
                    create_alert(
                        db,
                        salon_id=salon.id,
                        severity="warning",
                        alert_type="scrape_failed",
                        message=f"HotPepper style fetch failed: {e}",
                        entity_type="salon",
                        entity_id=salon.id,
                    )
                    continue

                for img in images:
                    exists = (
                        db.query(SourceContent)
                        .filter(SourceContent.salon_id == salon.id)
                        .filter(SourceContent.source_type == "hotpepper_style")
                        .filter(SourceContent.source_id == img.image_url)
                        .one_or_none()
                    )
                    if exists:
                        continue
                    found += 1
                    try:
                        sc = SourceContent(
                            salon_id=salon.id,
                            source_type="hotpepper_style",
                            source_id=img.image_url,
                            title=img.title,
                            body_html=None,
                            body_text=None,
                            image_urls=[img.image_url],
                            source_url=img.page_url,
                            source_published_at=None,
                        )
                        db.add(sc)
                        db.commit()
                        db.refresh(sc)

                        asset = create_pending_asset(db, salon_id=salon.id, source_url=img.image_url)
                        download_media_asset.delay(str(asset.id))

                        create_media_uploads_for_source(
                            db,
                            salon_id=salon.id,
                            sc=sc,
                            media_asset_id=asset.id,
                            source_image_url=img.image_url,
                            category="ADDITIONAL",
                            media_format="PHOTO",
                        )
                        db.commit()
                        processed += 1
                    except Exception as e:  # noqa: BLE001
                        db.rollback()
                        create_alert(
                            db,
                            salon_id=salon.id,
                            severity="warning",
                            alert_type="scrape_failed",
                            message=f"HotPepper style ingest failed: {e}",
                            entity_type="salon",
                            entity_id=salon.id,
                        )
                        continue

            _finish_job(db, job, status="completed", items_found=found, items_processed=processed)
            return {"found": found, "processed": processed}
        except Exception as e:  # noqa: BLE001
            _finish_job(db, job, status="failed", items_found=found, items_processed=processed, error_message=str(e))
            raise


@celery_app.task(name="app.worker.tasks.scrape_hotpepper_coupon")
def scrape_hotpepper_coupon() -> dict[str, Any]:
    found = 0
    processed = 0
    with SessionLocal() as db:
        job = _start_job(db, salon_id=None, job_type="scrape_coupon")
        try:
            salons = db.query(Salon).filter(Salon.is_active.is_(True)).all()
            for salon in salons:
                coupon_url = _salon_coupon_url(salon)
                if not coupon_url:
                    continue
                time.sleep(5)
                try:
                    coupons = fetch_coupons(coupon_url=coupon_url)
                except Exception as e:  # noqa: BLE001
                    create_alert(
                        db,
                        salon_id=salon.id,
                        severity="warning",
                        alert_type="scrape_failed",
                        message=f"HotPepper coupon fetch failed: {e}",
                        entity_type="salon",
                        entity_id=salon.id,
                    )
                    continue

                for c in coupons:
                    exists = (
                        db.query(SourceContent)
                        .filter(SourceContent.salon_id == salon.id)
                        .filter(SourceContent.source_type == "hotpepper_coupon")
                        .filter(SourceContent.source_id == c.source_id)
                        .one_or_none()
                    )
                    if exists:
                        continue
                    found += 1
                    try:
                        sc = SourceContent(
                            salon_id=salon.id,
                            source_type="hotpepper_coupon",
                            source_id=c.source_id,
                            title=c.title,
                            body_html=None,
                            body_text=c.body_text,
                            image_urls=[],
                            source_url=c.url,
                            source_published_at=None,
                        )
                        db.add(sc)
                        db.commit()
                        db.refresh(sc)

                        summary = f"{c.title}\n{c.body_text}".strip()
                        # Keep within 1500.
                        summary = summary[:1500]

                        create_gbp_posts_for_source(
                            db,
                            salon_id=salon.id,
                            sc=sc,
                            summary=summary,
                            image_asset_id=None,
                            post_type="OFFER",
                            cta_type=None,
                            cta_url=None,
                            offer_redeem_online_url=coupon_url,
                        )
                        db.commit()
                        processed += 1
                    except Exception as e:  # noqa: BLE001
                        db.rollback()
                        create_alert(
                            db,
                            salon_id=salon.id,
                            severity="warning",
                            alert_type="scrape_failed",
                            message=f"HotPepper coupon ingest failed: {e}",
                            entity_type="salon",
                            entity_id=salon.id,
                        )
                        continue

            _finish_job(db, job, status="completed", items_found=found, items_processed=processed)
            return {"found": found, "processed": processed}
        except Exception as e:  # noqa: BLE001
            _finish_job(db, job, status="failed", items_found=found, items_processed=processed, error_message=str(e))
            raise


@celery_app.task(name="app.worker.tasks.fetch_instagram_media")
def fetch_instagram_media() -> dict[str, Any]:
    settings = get_settings()
    found = 0
    processed = 0
    with SessionLocal() as db:
        job = _start_job(db, salon_id=None, job_type="fetch_instagram")
        try:
            accounts = db.query(InstagramAccount).filter(InstagramAccount.is_active.is_(True)).all()
            for acc in accounts:
                time.sleep(1)
                try:
                    token = decrypt_str(acc.access_token_enc, settings.token_enc_key_b64)
                    url = f"https://graph.facebook.com/v19.0/{acc.ig_user_id}/media"
                    params = {
                        "fields": "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink",
                        "limit": 10,
                        "access_token": token,
                    }
                    with httpx.Client(timeout=20) as client:
                        r = client.get(url, params=params)
                        r.raise_for_status()
                        data = r.json()
                    items = data.get("data") or []
                except Exception as e:  # noqa: BLE001
                    create_alert(
                        db,
                        salon_id=acc.salon_id,
                        severity="warning",
                        alert_type="instagram_fetch_failed",
                        message=f"Instagram fetch failed for {acc.ig_username}: {e}",
                        entity_type="instagram_account",
                        entity_id=acc.id,
                    )
                    continue

                for item in items:
                    media_id = str(item.get("id") or "")
                    if not media_id:
                        continue
                    exists = (
                        db.query(SourceContent)
                        .filter(SourceContent.salon_id == acc.salon_id)
                        .filter(SourceContent.source_type == "instagram")
                        .filter(SourceContent.source_id == media_id)
                        .one_or_none()
                    )
                    if exists:
                        continue
                    found += 1
                    try:
                        caption = str(item.get("caption") or "")
                        permalink = str(item.get("permalink") or "")
                        media_type = str(item.get("media_type") or "")
                        media_url = str(item.get("media_url") or "")
                        thumb = str(item.get("thumbnail_url") or "")
                        image_url = None
                        if media_type in ("IMAGE", "CAROUSEL_ALBUM"):
                            image_url = media_url
                        elif media_type == "VIDEO":
                            image_url = thumb or media_url

                        sc = SourceContent(
                            salon_id=acc.salon_id,
                            source_type="instagram",
                            source_id=media_id,
                            instagram_account_id=acc.id,
                            title=None,
                            body_html=None,
                            body_text=caption,
                            image_urls=[u for u in [image_url] if u],
                            source_url=permalink or None,
                            source_published_at=None,
                        )
                        db.add(sc)
                        db.commit()
                        db.refresh(sc)

                        image_asset_id = None
                        if image_url:
                            asset = create_pending_asset(db, salon_id=acc.salon_id, source_url=image_url)
                            image_asset_id = asset.id
                            download_media_asset.delay(str(asset.id))

                        summary = instagram_caption_to_gbp(
                            caption=caption,
                            permalink=permalink,
                            sync_hashtags=bool(acc.sync_hashtags),
                        )

                        create_gbp_posts_for_source(
                            db,
                            salon_id=acc.salon_id,
                            sc=sc,
                            summary=summary,
                            image_asset_id=image_asset_id,
                            post_type="STANDARD",
                            cta_type="LEARN_MORE",
                            cta_url=permalink or None,
                            offer_redeem_online_url=None,
                        )
                        db.commit()
                        processed += 1
                    except Exception as e:  # noqa: BLE001
                        db.rollback()
                        create_alert(
                            db,
                            salon_id=acc.salon_id,
                            severity="warning",
                            alert_type="instagram_ingest_failed",
                            message=f"Instagram ingest failed: {e}",
                            entity_type="instagram_account",
                            entity_id=acc.id,
                        )
                        continue

            _finish_job(db, job, status="completed", items_found=found, items_processed=processed)
            return {"found": found, "processed": processed}
        except Exception as e:  # noqa: BLE001
            _finish_job(db, job, status="failed", items_found=found, items_processed=processed, error_message=str(e))
            raise


@celery_app.task(name="app.worker.tasks.post_gbp_post", bind=True, max_retries=5)
def post_gbp_post(self, gbp_post_id: str) -> None:
    logger.info("post_gbp_post started post_id=%s", gbp_post_id)
    with SessionLocal() as db:
        # CAS: atomically claim the post for processing
        result = db.execute(
            update(GbpPost)
            .where(GbpPost.id == uuid.UUID(gbp_post_id))
            .where(GbpPost.status.in_(["queued", "pending"]))
            .values(status="posting")
            .returning(GbpPost.id)
        )
        row = result.fetchone()
        db.commit()
        if row is None:
            logger.info("post_gbp_post skipped (already processed) post_id=%s", gbp_post_id)
            return
        post = db.query(GbpPost).filter(GbpPost.id == uuid.UUID(gbp_post_id)).one()

        loc = db.query(GbpLocation).filter(GbpLocation.id == post.gbp_location_id).one()
        conn = db.query(GbpConnection).filter(GbpConnection.id == loc.gbp_connection_id).one()

        image_url = None
        if post.image_asset_id:
            asset = db.query(MediaAsset).filter(MediaAsset.id == post.image_asset_id).one_or_none()
            if asset and asset.status == "available":
                image_url = asset.public_url

        try:
            access_token = get_access_token(db, conn)
            payload = gbp_client.create_local_post(
                access_token=access_token,
                account_id=loc.account_id,
                location_id=loc.location_id,
                summary=post.summary_final,
                image_url=image_url,
                cta_type=post.cta_type,
                cta_url=post.cta_url,
                topic_type=post.post_type,
                offer_redeem_online_url=post.offer_redeem_online_url,
            )
            post.gbp_post_id = str(payload.get("name") or payload.get("id") or "")
            post.status = "posted"
            post.posted_at = _now()
            post.error_message = None
            db.add(post)
            db.commit()
            logger.info("post_gbp_post completed post_id=%s", gbp_post_id)
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            if status_code == 429:
                countdown = min(600, 30 * (2 ** self.request.retries))
                logger.warning("post_gbp_post rate limited (429), retrying in %ds post_id=%s", countdown, gbp_post_id)
                # CAS: atomically reset to retryable state
                db.execute(
                    update(GbpPost)
                    .where(GbpPost.id == uuid.UUID(gbp_post_id))
                    .where(GbpPost.status == "posting")
                    .values(status="queued", error_message=None)
                )
                db.commit()
                try:
                    raise self.retry(countdown=countdown) from e
                except MaxRetriesExceededError:
                    post = db.query(GbpPost).filter(GbpPost.id == uuid.UUID(gbp_post_id)).one()
                    post.status = "failed"
                    post.error_message = "GBP API rate limited (429) - max retries exceeded"
                    db.add(post)
                    db.commit()
                    logger.error("post_gbp_post max retries exceeded post_id=%s", gbp_post_id)
                    raise
            if status_code == 401:
                conn.status = "expired"
                db.add(conn)
                db.commit()
                create_alert(
                    db,
                    salon_id=post.salon_id,
                    severity="critical",
                    alert_type="oauth_expired",
                    message="GBP token expired or revoked. Reconnect Google account.",
                    entity_type="gbp_connection",
                    entity_id=conn.id,
                )
            post.status = "failed"
            post.error_message = f"GBP API error: {status_code}"
            db.add(post)
            db.commit()
            logger.error("post_gbp_post failed status=%d post_id=%s", status_code, gbp_post_id)
        except Exception as e:  # noqa: BLE001
            post.status = "failed"
            post.error_message = str(e)[:2000]
            db.add(post)
            db.commit()
            logger.error("post_gbp_post failed post_id=%s error=%s", gbp_post_id, e)
            create_alert(
                db,
                salon_id=post.salon_id,
                severity="warning",
                alert_type="gbp_post_failed",
                message=f"GBP post failed: {e}",
                entity_type="gbp_post",
                entity_id=post.id,
            )


@celery_app.task(name="app.worker.tasks.upload_gbp_media", bind=True, max_retries=5)
def upload_gbp_media(self, upload_id: str) -> None:
    logger.info("upload_gbp_media started upload_id=%s", upload_id)
    with SessionLocal() as db:
        # CAS: atomically claim the upload for processing
        result = db.execute(
            update(GbpMediaUpload)
            .where(GbpMediaUpload.id == uuid.UUID(upload_id))
            .where(GbpMediaUpload.status.in_(["queued", "pending"]))
            .values(status="uploading")
            .returning(GbpMediaUpload.id)
        )
        row = result.fetchone()
        db.commit()
        if row is None:
            logger.info("upload_gbp_media skipped (already processed) upload_id=%s", upload_id)
            return
        up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == uuid.UUID(upload_id)).one()

        loc = db.query(GbpLocation).filter(GbpLocation.id == up.gbp_location_id).one()
        conn = db.query(GbpConnection).filter(GbpConnection.id == loc.gbp_connection_id).one()

        asset = db.query(MediaAsset).filter(MediaAsset.id == up.media_asset_id).one_or_none()
        if not asset or asset.status != "available":
            up.status = "failed"
            up.error_message = "Media asset not available"
            db.add(up)
            db.commit()
            return

        try:
            access_token = get_access_token(db, conn)
            payload = gbp_client.upload_media(
                access_token=access_token,
                account_id=loc.account_id,
                location_id=loc.location_id,
                source_url=asset.public_url,
                category=up.category,
                media_format=up.media_format,
            )
            up.gbp_media_name = str(payload.get("name") or "")
            up.status = "uploaded"
            up.uploaded_at = _now()
            up.error_message = None
            db.add(up)
            db.commit()
            logger.info("upload_gbp_media completed upload_id=%s", upload_id)
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            if status_code == 429:
                countdown = min(600, 30 * (2 ** self.request.retries))
                logger.warning("upload_gbp_media rate limited (429), retrying in %ds upload_id=%s", countdown, upload_id)
                # CAS: atomically reset to retryable state
                db.execute(
                    update(GbpMediaUpload)
                    .where(GbpMediaUpload.id == uuid.UUID(upload_id))
                    .where(GbpMediaUpload.status == "uploading")
                    .values(status="queued", error_message=None)
                )
                db.commit()
                try:
                    raise self.retry(countdown=countdown) from e
                except MaxRetriesExceededError:
                    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == uuid.UUID(upload_id)).one()
                    up.status = "failed"
                    up.error_message = "GBP API rate limited (429) - max retries exceeded"
                    db.add(up)
                    db.commit()
                    logger.error("upload_gbp_media max retries exceeded upload_id=%s", upload_id)
                    raise
            if status_code == 401:
                conn.status = "expired"
                db.add(conn)
                db.commit()
                create_alert(
                    db,
                    salon_id=up.salon_id,
                    severity="critical",
                    alert_type="oauth_expired",
                    message="GBP token expired or revoked. Reconnect Google account.",
                    entity_type="gbp_connection",
                    entity_id=conn.id,
                )
            up.status = "failed"
            up.error_message = f"GBP API error: {status_code}"
            db.add(up)
            db.commit()
            logger.error("upload_gbp_media failed status=%d upload_id=%s", status_code, upload_id)
        except Exception as e:  # noqa: BLE001
            up.status = "failed"
            up.error_message = str(e)[:2000]
            db.add(up)
            db.commit()
            logger.error("upload_gbp_media failed upload_id=%s error=%s", upload_id, e)
            create_alert(
                db,
                salon_id=up.salon_id,
                severity="warning",
                alert_type="gbp_media_failed",
                message=f"GBP media upload failed: {e}",
                entity_type="gbp_media_upload",
                entity_id=up.id,
            )
