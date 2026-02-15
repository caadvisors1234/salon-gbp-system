from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_salon
from app.models.alert import Alert
from app.models.gbp_media_upload import GbpMediaUpload
from app.models.gbp_post import GbpPost

router = APIRouter()


class NavCountsResponse(BaseModel):
    pending_posts: int
    pending_media: int
    open_alerts: int


@router.get("", response_model=NavCountsResponse)
def get_nav_counts(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> NavCountsResponse:
    salon_id = require_salon(user, x_salon_id)

    pending_posts = (
        db.query(func.count(GbpPost.id))
        .filter(GbpPost.salon_id == salon_id, GbpPost.status == "pending")
        .scalar()
    )

    pending_media = (
        db.query(func.count(GbpMediaUpload.id))
        .filter(GbpMediaUpload.salon_id == salon_id, GbpMediaUpload.status == "pending")
        .scalar()
    )

    alert_filter = Alert.salon_id == salon_id
    if user.is_super_admin():
        alert_filter = (Alert.salon_id == salon_id) | (Alert.salon_id.is_(None))

    open_alerts = (
        db.query(func.count(Alert.id))
        .filter(alert_filter, Alert.status == "open")
        .scalar()
    )

    return NavCountsResponse(
        pending_posts=pending_posts or 0,
        pending_media=pending_media or 0,
        open_alerts=open_alerts or 0,
    )
