from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import CreatedAtMixin, SalonScopedMixin, UUIDPrimaryKeyMixin


class GbpMediaUpload(Base, UUIDPrimaryKeyMixin, CreatedAtMixin, SalonScopedMixin):
    __tablename__ = "gbp_media_uploads"

    source_content_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_contents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    gbp_location_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("gbp_locations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    media_asset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("media_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    media_format: Mapped[str] = mapped_column(String(10), nullable=False)  # PHOTO / VIDEO
    category: Mapped[str] = mapped_column(String(30), nullable=False, server_default="ADDITIONAL")

    source_image_url: Mapped[str] = mapped_column(Text, nullable=False)

    gbp_media_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="pending",
        index=True,
    )  # pending / queued / uploading / uploaded / failed / skipped

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

