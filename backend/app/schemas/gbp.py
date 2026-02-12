from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import ConnectionStatus


class GbpConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID
    google_account_email: str
    token_expires_at: datetime
    status: ConnectionStatus


class GbpAvailableLocation(BaseModel):
    account_id: str
    location_id: str
    location_name: str | None = None


class GbpLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID
    gbp_connection_id: uuid.UUID
    account_id: str
    location_id: str
    location_name: str | None = None
    is_active: bool


class GbpLocationSelectItem(BaseModel):
    account_id: str = Field(..., max_length=255)
    location_id: str = Field(..., max_length=255)
    location_name: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class GbpLocationSelectRequest(BaseModel):
    location: GbpLocationSelectItem | None = None


class GbpLocationPatchRequest(BaseModel):
    location_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
