from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_salon
from app.models.gbp_media_upload import GbpMediaUpload
from app.schemas.media_uploads import MediaUploadDetail, MediaUploadListItem, MediaUploadUpdateRequest
from app.worker.tasks import upload_gbp_media


router = APIRouter()


@router.get("", response_model=list[MediaUploadListItem])
def list_uploads(
    status_filter: str | None = Query(default=None, alias="status"),
    exclude_status: str | None = Query(default=None),
    salon_id: uuid.UUID | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[MediaUploadListItem]:
    q = db.query(GbpMediaUpload)
    if user.is_super_admin():
        if salon_id:
            q = q.filter(GbpMediaUpload.salon_id == salon_id)
    else:
        q = q.filter(GbpMediaUpload.salon_id == require_salon(user))
    if status_filter:
        q = q.filter(GbpMediaUpload.status == status_filter)
    if exclude_status:
        excluded = [s.strip() for s in exclude_status.split(",") if s.strip()]
        q = q.filter(GbpMediaUpload.status.notin_(excluded))

    ups = q.order_by(GbpMediaUpload.created_at.desc()).offset(offset).limit(limit).all()
    return [MediaUploadListItem.model_validate(u) for u in ups]


@router.get("/{upload_id}", response_model=MediaUploadDetail)
def get_upload(
    upload_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MediaUploadDetail:
    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == upload_id).one_or_none()
    if up is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if not user.is_super_admin() and up.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    return MediaUploadDetail.model_validate(up)


@router.patch("/{upload_id}", response_model=MediaUploadDetail)
def update_upload(
    upload_id: uuid.UUID,
    payload: MediaUploadUpdateRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MediaUploadDetail:
    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == upload_id).one_or_none()
    if up is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if not user.is_super_admin() and up.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(up, k, v)
    db.add(up)
    db.commit()
    db.refresh(up)
    return MediaUploadDetail.model_validate(up)


@router.post("/{upload_id}/approve", response_model=MediaUploadDetail)
def approve_upload(
    upload_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MediaUploadDetail:
    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == upload_id).one_or_none()
    if up is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if not user.is_super_admin() and up.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if up.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Upload is not pending")
    up.status = "queued"
    up.error_message = None
    db.add(up)
    db.commit()
    db.refresh(up)
    upload_gbp_media.delay(str(up.id))
    return MediaUploadDetail.model_validate(up)


@router.post("/{upload_id}/retry", response_model=MediaUploadDetail)
def retry_upload(
    upload_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MediaUploadDetail:
    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == upload_id).one_or_none()
    if up is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if not user.is_super_admin() and up.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if up.status != "failed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Upload is not failed")
    up.status = "queued"
    up.error_message = None
    db.add(up)
    db.commit()
    db.refresh(up)
    upload_gbp_media.delay(str(up.id))
    return MediaUploadDetail.model_validate(up)


@router.post("/{upload_id}/skip", response_model=MediaUploadDetail)
def skip_upload(
    upload_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MediaUploadDetail:
    up = db.query(GbpMediaUpload).filter(GbpMediaUpload.id == upload_id).one_or_none()
    if up is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if not user.is_super_admin() and up.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    if up.status in ("uploaded",):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Upload already completed")
    up.status = "skipped"
    db.add(up)
    db.commit()
    db.refresh(up)
    return MediaUploadDetail.model_validate(up)

