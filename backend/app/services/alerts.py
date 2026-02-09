from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.alert import Alert


def create_alert(
    db: Session,
    *,
    salon_id: uuid.UUID | None,
    severity: str,
    alert_type: str,
    message: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> Alert:
    alert = Alert(
        salon_id=salon_id,
        severity=severity,
        alert_type=alert_type,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        status="open",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def ack_alert(db: Session, alert: Alert, *, user_id: uuid.UUID) -> Alert:
    alert.status = "acked"
    alert.acked_by = user_id
    alert.acked_at = datetime.now(tz=timezone.utc)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def resolve_alert(db: Session, alert: Alert, *, user_id: uuid.UUID) -> Alert:
    alert.status = "resolved"
    alert.resolved_by = user_id
    alert.resolved_at = datetime.now(tz=timezone.utc)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

