from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import AccountType


class InstagramAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID
    ig_user_id: str
    ig_username: str
    account_type: AccountType
    staff_name: str | None = None
    token_expires_at: datetime
    is_active: bool
    sync_hashtags: bool


class InstagramAccountCreateRequest(BaseModel):
    ig_user_id: str = Field(..., max_length=100)
    ig_username: str = Field(..., max_length=100)
    account_type: AccountType
    staff_name: str | None = Field(default=None, max_length=100)

    access_token: str = Field(..., min_length=10)
    expires_in_days: int = Field(default=60, ge=1, le=365)
    is_active: bool = True
    sync_hashtags: bool = False


class InstagramAccountPatchRequest(BaseModel):
    account_type: AccountType | None = None
    staff_name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    sync_hashtags: bool | None = None

