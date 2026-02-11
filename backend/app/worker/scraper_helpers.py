"""Shared helpers for scraper tasks to avoid code duplication."""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.gbp_location import GbpLocation
from app.models.gbp_media_upload import GbpMediaUpload
from app.models.gbp_post import GbpPost
from app.models.scrape_seed import ScrapeSeeded
from app.models.source_content import SourceContent

logger = logging.getLogger(__name__)


def _active_gbp_locations(db: Session, salon_id: uuid.UUID) -> list[GbpLocation]:
    return (
        db.query(GbpLocation)
        .filter(GbpLocation.salon_id == salon_id)
        .filter(GbpLocation.is_active.is_(True))
        .all()
    )


def create_gbp_posts_for_source(
    db: Session,
    *,
    salon_id: uuid.UUID,
    sc: SourceContent,
    summary: str,
    image_asset_id: uuid.UUID | None,
    post_type: str,
    cta_type: str | None,
    cta_url: str | None,
    offer_redeem_online_url: str | None,
    event_title: str | None = None,
    event_start_date: date | None = None,
    event_end_date: date | None = None,
) -> list[GbpPost]:
    """Create pending GbpPost for each active location, skipping duplicates."""
    locations = _active_gbp_locations(db, salon_id)
    posts: list[GbpPost] = []
    for loc in locations:
        dup = (
            db.query(GbpPost)
            .filter(GbpPost.salon_id == salon_id)
            .filter(GbpPost.gbp_location_id == loc.id)
            .filter(GbpPost.source_content_id == sc.id)
            .filter(GbpPost.post_type == post_type)
            .one_or_none()
        )
        if dup:
            continue
        post = GbpPost(
            id=uuid.uuid4(),
            salon_id=salon_id,
            source_content_id=sc.id,
            gbp_location_id=loc.id,
            post_type=post_type,
            summary_generated=summary,
            summary_final=summary,
            image_asset_id=image_asset_id,
            cta_type=cta_type,
            cta_url=cta_url,
            offer_redeem_online_url=offer_redeem_online_url,
            event_title=event_title,
            event_start_date=event_start_date,
            event_end_date=event_end_date,
            status="pending",
            error_message=None,
            posted_at=None,
            edited_by=None,
            edited_at=None,
            gbp_post_id=None,
        )
        db.add(post)
        posts.append(post)
    return posts


def create_media_uploads_for_source(
    db: Session,
    *,
    salon_id: uuid.UUID,
    sc: SourceContent,
    media_asset_id: uuid.UUID,
    source_image_url: str,
    category: str,
    media_format: str,
) -> list[GbpMediaUpload]:
    """Create pending GbpMediaUpload for each active location, skipping duplicates."""
    locations = _active_gbp_locations(db, salon_id)
    uploads: list[GbpMediaUpload] = []
    for loc in locations:
        dup = (
            db.query(GbpMediaUpload)
            .filter(GbpMediaUpload.salon_id == salon_id)
            .filter(GbpMediaUpload.gbp_location_id == loc.id)
            .filter(GbpMediaUpload.source_content_id == sc.id)
            .filter(GbpMediaUpload.media_asset_id == media_asset_id)
            .one_or_none()
        )
        if dup:
            continue
        up = GbpMediaUpload(
            id=uuid.uuid4(),
            salon_id=salon_id,
            source_content_id=sc.id,
            gbp_location_id=loc.id,
            media_asset_id=media_asset_id,
            media_format=media_format,
            category=category,
            source_image_url=source_image_url,
            status="pending",
            error_message=None,
            uploaded_at=None,
            gbp_media_name=None,
        )
        db.add(up)
        uploads.append(up)
    return uploads


def is_seeded(db: Session, *, salon_id: uuid.UUID, source_type: str) -> bool:
    """Return True if the initial seed scrape has already completed for this salon/source_type."""
    return (
        db.query(ScrapeSeeded)
        .filter(ScrapeSeeded.salon_id == salon_id)
        .filter(ScrapeSeeded.source_type == source_type)
        .one_or_none()
    ) is not None


def mark_seeded(db: Session, *, salon_id: uuid.UUID, source_type: str) -> None:
    """Record that the initial seed scrape is complete. Idempotent.

    Uses a SAVEPOINT so that an IntegrityError (duplicate) does not
    roll back the caller's pending transaction state.
    """
    record = ScrapeSeeded(
        id=uuid.uuid4(),
        salon_id=salon_id,
        source_type=source_type,
        seeded_at=datetime.now(tz=timezone.utc),
    )
    nested = db.begin_nested()
    try:
        db.add(record)
        nested.commit()
        logger.info("Marked seeded: salon_id=%s source_type=%s", salon_id, source_type)
    except IntegrityError:
        nested.rollback()
        logger.debug("Already seeded: salon_id=%s source_type=%s", salon_id, source_type)
