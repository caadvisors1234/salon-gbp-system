from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

_HOTPEPPER_RE = re.compile(r"https?://beauty\.hotpepper\.jp/slnH([a-zA-Z0-9]+)")


class AdminSalonCreate(BaseModel):
    name: str = Field(..., max_length=255)
    hotpepper_top_url: str = Field(...)

    # 以下は model_validator で自動導出される
    slug: str | None = None
    hotpepper_salon_id: str | None = None
    hotpepper_blog_url: str | None = None
    hotpepper_style_url: str | None = None
    hotpepper_coupon_url: str | None = None

    @field_validator("hotpepper_top_url")
    @classmethod
    def validate_hotpepper_url_format(cls, v: str) -> str:
        if not _HOTPEPPER_RE.search(v):
            raise ValueError(
                "HotPepper Beauty のURLからサロンIDを抽出できません。"
                " 例: https://beauty.hotpepper.jp/slnHXXXXXXXXX/"
            )
        return v

    @model_validator(mode="after")
    def derive_fields(self) -> AdminSalonCreate:
        m = _HOTPEPPER_RE.search(self.hotpepper_top_url)
        # field_validator が通過済みなので必ずマッチする
        assert m is not None, "hotpepper_top_url should have been validated"
        salon_id = m.group(1)
        base = f"https://beauty.hotpepper.jp/slnH{salon_id}"
        self.slug = salon_id
        self.hotpepper_salon_id = salon_id
        self.hotpepper_blog_url = f"{base}/blog/"
        self.hotpepper_style_url = f"{base}/style/"
        self.hotpepper_coupon_url = f"{base}/coupon/"
        return self


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
