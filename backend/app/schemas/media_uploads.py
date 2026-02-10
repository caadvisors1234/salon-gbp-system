from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import MediaFormat, UploadStatus


class MediaUploadListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    salon_id: uuid.UUID
    gbp_location_id: uuid.UUID
    source_content_id: uuid.UUID
    media_asset_id: uuid.UUID
    media_format: MediaFormat
    category: str
    status: UploadStatus
    source_image_url: str
    error_message: str | None = None
    created_at: datetime
    uploaded_at: datetime | None = None


class MediaUploadDetail(MediaUploadListItem):
    gbp_media_name: str | None = None


class MediaUploadUpdateRequest(BaseModel):
    category: str | None = Field(default=None, max_length=30)

