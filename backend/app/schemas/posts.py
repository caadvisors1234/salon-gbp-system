from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.enums import PostStatus, PostType


class PostListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID
    gbp_location_id: uuid.UUID
    source_content_id: uuid.UUID
    post_type: PostType
    status: PostStatus
    summary_final: str
    cta_url: str | None = None
    image_asset_id: uuid.UUID | None = None
    error_message: str | None = None
    created_at: datetime
    posted_at: datetime | None = None


class PostDetail(PostListItem):
    summary_generated: str
    cta_type: str | None = None
    offer_redeem_online_url: str | None = None
    event_title: str | None = None
    event_start_date: date | None = None
    event_end_date: date | None = None
    gbp_post_id: str | None = None
    edited_by: uuid.UUID | None = None
    edited_at: datetime | None = None


class PostUpdateRequest(BaseModel):
    summary_final: str | None = Field(default=None, max_length=1500)
    image_asset_id: uuid.UUID | None = None
    cta_type: str | None = Field(default=None, max_length=50)
    cta_url: str | None = None
    offer_redeem_online_url: str | None = None
    event_title: str | None = Field(default=None, max_length=58)
    event_start_date: date | None = None
    event_end_date: date | None = None

    @model_validator(mode="after")
    def _check_event_date_range(self) -> PostUpdateRequest:
        if self.event_start_date and self.event_end_date and self.event_start_date > self.event_end_date:
            raise ValueError("event_end_date must be on or after event_start_date")
        return self

