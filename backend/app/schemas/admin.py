from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminSalonCreate(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)


class AdminUserInviteRequest(BaseModel):
    email: EmailStr
    password: str | None = Field(default=None, min_length=8, max_length=128, repr=False)
    role: Literal["staff", "salon_admin", "super_admin"] = "staff"
    salon_id: uuid.UUID | None = None
    display_name: str | None = Field(default=None, max_length=100)


class AppUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID | None
    supabase_user_id: uuid.UUID
    email: str
    display_name: str | None
    role: str
    is_active: bool

