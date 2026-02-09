from __future__ import annotations

import re
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator


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


_HOTPEPPER_RE = re.compile(r"beauty\.hotpepper\.jp/slnH([a-zA-Z0-9]+)")


class SalonSettingsUpdate(BaseModel):
    # None = フィールド未送信（変更なし）, "" = HotPepper連携を解除
    hotpepper_top_url: str | None = None
    hotpepper_salon_id: str | None = Field(default=None, max_length=100)
    hotpepper_blog_url: str | None = None
    hotpepper_style_url: str | None = None
    hotpepper_coupon_url: str | None = None
    is_active: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def derive_from_top_url(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        top_url = data.get("hotpepper_top_url")

        # hotpepper_top_url が未指定の場合は個別フィールドをそのまま通す（後方互換）。
        if top_url is None:
            return data

        # hotpepper_top_url が指定された場合、個別URLフィールドを導出する。
        # 同時に送られた個別フィールドは hotpepper_top_url の導出値で上書きされる。
        # URL形式のバリデーションは field_validator で行う。
        if top_url:
            m = _HOTPEPPER_RE.search(top_url)
            if m:
                salon_id = m.group(1)
                base = f"https://beauty.hotpepper.jp/slnH{salon_id}"
                data["hotpepper_salon_id"] = salon_id
                data["hotpepper_blog_url"] = f"{base}/blog/"
                data["hotpepper_style_url"] = f"{base}/style/"
                data["hotpepper_coupon_url"] = f"{base}/coupon/"
            # 形式が不正な場合は導出をスキップし field_validator でエラーにする
        else:
            # 空文字 "" → HotPepper連携を解除（全フィールドを None に）
            data["hotpepper_salon_id"] = None
            data["hotpepper_blog_url"] = None
            data["hotpepper_style_url"] = None
            data["hotpepper_coupon_url"] = None
        return data

    @field_validator("hotpepper_top_url")
    @classmethod
    def validate_hotpepper_url_format(cls, v: str | None) -> str | None:
        if v is not None and v != "":
            if not _HOTPEPPER_RE.search(v):
                raise ValueError(
                    "HotPepper Beauty のURLからサロンIDを抽出できません。"
                    " 例: https://beauty.hotpepper.jp/slnH000232182/"
                )
        return v

