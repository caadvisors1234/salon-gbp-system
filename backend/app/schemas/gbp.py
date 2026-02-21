from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.enums import ConnectionStatus


class GbpConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    google_account_email: str
    token_expires_at: datetime
    status: ConnectionStatus


class GbpConnectionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    google_account_email: str
    token_expires_at: datetime
    status: ConnectionStatus
    location_count: int = 0


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
    gbp_connection_id: uuid.UUID
    location: GbpLocationSelectItem | None = None


class GbpLocationPatchRequest(BaseModel):
    location_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


# --- Bulk mapping schemas ---

class BulkMappingLocationInfo(BaseModel):
    id: uuid.UUID
    location_name: str | None = None
    account_id: str
    location_id: str
    gbp_connection_id: uuid.UUID


class BulkMappingItem(BaseModel):
    salon_id: uuid.UUID
    salon_name: str
    gbp_location: BulkMappingLocationInfo | None = None


class BulkMappingEntry(BaseModel):
    salon_id: uuid.UUID
    gbp_connection_id: uuid.UUID | None = None
    account_id: str | None = None
    location_id: str | None = None
    location_name: str | None = None

    @model_validator(mode="after")
    def _all_or_none(self) -> "BulkMappingEntry":
        keys = (self.gbp_connection_id, self.account_id, self.location_id)
        provided = sum(v is not None for v in keys)
        if provided not in (0, 3):
            raise ValueError("gbp_connection_id, account_id, and location_id must all be provided or all be null")
        return self


class BulkMappingRequest(BaseModel):
    mappings: list[BulkMappingEntry]
