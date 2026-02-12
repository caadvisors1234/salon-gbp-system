from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_salon
from app.models.alert import Alert
from app.schemas.alerts import AlertResponse
from app.services.alerts import ack_alert


router = APIRouter()


@router.get("", response_model=list[AlertResponse])
def list_alerts(
    status_filter: str | None = Query(default="open", alias="status"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[AlertResponse]:
    q = db.query(Alert)
    if user.is_super_admin():
        if status_filter:
            q = q.filter(Alert.status == status_filter)
    else:
        salon_id = require_salon(user, x_salon_id)
        q = q.filter((Alert.salon_id == salon_id) | (Alert.salon_id.is_(None)))
        if status_filter:
            q = q.filter(Alert.status == status_filter)

    alerts = q.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()
    return [AlertResponse.model_validate(a) for a in alerts]


@router.post("/{alert_id}/ack", response_model=AlertResponse)
def ack(
    alert_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> AlertResponse:
    alert = db.query(Alert).filter(Alert.id == alert_id).one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if not user.is_super_admin():
        salon_id = require_salon(user, x_salon_id)
        if alert.salon_id not in (None, salon_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert = ack_alert(db, alert, user_id=user.id)
    return AlertResponse.model_validate(alert)
