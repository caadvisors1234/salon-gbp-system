from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class SalonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    hotpepper_salon_id: str | None = None
    hotpepper_blog_url: str | None = None
    hotpepper_style_url: str | None = None
    hotpepper_coupon_url: str | None = None
    is_active: bool


class SalonSettingsUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    slug: str | None = Field(default=None, max_length=100)
    hotpepper_salon_id: str | None = Field(default=None, max_length=100)
    hotpepper_blog_url: str | None = None
    hotpepper_style_url: str | None = None
    hotpepper_coupon_url: str | None = None
    is_active: bool | None = None

