from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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
    gbp_post_id: str | None = None
    edited_by: uuid.UUID | None = None
    edited_at: datetime | None = None


class PostUpdateRequest(BaseModel):
    summary_final: str | None = Field(default=None, max_length=1500)
    image_asset_id: uuid.UUID | None = None
    cta_type: str | None = Field(default=None, max_length=50)
    cta_url: str | None = None
    offer_redeem_online_url: str | None = None

