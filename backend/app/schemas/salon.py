from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, computed_field


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

    @computed_field  # type: ignore[prop-decorator]
    @property
    def hotpepper_top_url(self) -> str | None:
        if self.hotpepper_salon_id:
            return f"https://beauty.hotpepper.jp/slnH{self.hotpepper_salon_id}/"
        return None
