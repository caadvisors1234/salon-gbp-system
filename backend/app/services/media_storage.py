from __future__ import annotations

import hashlib
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.media_asset import MediaAsset


@dataclass(frozen=True)
class DownloadResult:
    content_type: str | None
    bytes: int
    sha256: str
    local_path: str
    public_url: str


def _guess_ext(content_type: str | None) -> str:
    if not content_type:
        return ".bin"
    ct = content_type.split(";", 1)[0].strip().lower()
    return {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(ct, ".bin")


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def create_pending_asset(db: Session, *, salon_id: uuid.UUID, source_url: str) -> MediaAsset:
    settings = get_settings()
    file_id = uuid.uuid4().hex
    rel_dir = f"{salon_id}"
    rel_name = f"{file_id}.bin"

    local_path = str(Path(settings.media_root) / rel_dir / rel_name)
    public_url = settings.app_public_base_url.rstrip("/") + settings.media_public_path.rstrip("/") + f"/{rel_dir}/{rel_name}"

    asset = MediaAsset(
        salon_id=salon_id,
        source_url=source_url,
        content_type=None,
        sha256=None,
        local_path=local_path,
        public_url=public_url,
        bytes=None,
        status="pending",
        error_message=None,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def download_asset(db: Session, asset: MediaAsset) -> DownloadResult:
    settings = get_settings()
    local_path = Path(asset.local_path)
    _ensure_dir(local_path.parent)

    with httpx.Client(timeout=30, follow_redirects=True) as client:
        r = client.get(asset.source_url)
        r.raise_for_status()
        content = r.content
        content_type = r.headers.get("content-type")

    sha = hashlib.sha256(content).hexdigest()
    ext = _guess_ext(content_type)

    # If ext differs, rename file deterministically.
    final_local = local_path.with_suffix(ext)
    final_rel = final_local.relative_to(Path(settings.media_root))
    final_public_url = (
        settings.app_public_base_url.rstrip("/") + settings.media_public_path.rstrip("/") + "/" + str(final_rel)
    )

    tmp_path = final_local.with_suffix(final_local.suffix + ".tmp")
    with open(tmp_path, "wb") as f:
        f.write(content)
    os.replace(tmp_path, final_local)

    return DownloadResult(
        content_type=content_type,
        bytes=len(content),
        sha256=sha,
        local_path=str(final_local),
        public_url=final_public_url,
    )


def mark_asset_available(db: Session, asset: MediaAsset, result: DownloadResult) -> MediaAsset:
    asset.content_type = result.content_type
    asset.bytes = result.bytes
    asset.sha256 = result.sha256
    asset.local_path = result.local_path
    asset.public_url = result.public_url
    asset.status = "available"
    asset.error_message = None
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def mark_asset_failed(db: Session, asset: MediaAsset, *, error_message: str) -> MediaAsset:
    asset.status = "failed"
    asset.error_message = error_message[:2000]
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def cleanup_old_assets(db: Session) -> int:
    settings = get_settings()
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=settings.media_retention_days)
    q = (
        db.query(MediaAsset)
        .filter(MediaAsset.status == "available")
        .filter(MediaAsset.created_at < cutoff)
    )
    assets = q.all()
    deleted = 0
    for a in assets:
        try:
            Path(a.local_path).unlink(missing_ok=True)
        except Exception:
            # Best-effort.
            pass
        a.status = "deleted"
        db.add(a)
        deleted += 1
    if deleted:
        db.commit()
    return deleted

