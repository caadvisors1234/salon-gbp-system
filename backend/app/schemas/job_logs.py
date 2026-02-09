from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID | None = None
    job_type: str
    status: str
    items_found: int
    items_processed: int
    error_message: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

