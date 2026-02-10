from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.enums import AlertSeverity, AlertStatus


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID | None = None
    severity: AlertSeverity
    alert_type: str
    message: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    status: AlertStatus
    acked_by: uuid.UUID | None = None
    acked_at: datetime | None = None
    created_at: datetime

