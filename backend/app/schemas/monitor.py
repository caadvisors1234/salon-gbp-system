from __future__ import annotations

import uuid

from pydantic import BaseModel


class SalonMonitorItem(BaseModel):
    salon_id: uuid.UUID
    slug: str
    name: str
    is_active: bool

    open_alerts: int
    gbp_connection_status: str  # none / active / expired / revoked
    active_locations: int

