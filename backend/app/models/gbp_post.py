from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import CreatedAtMixin, SalonScopedMixin, UUIDPrimaryKeyMixin


class GbpPost(Base, UUIDPrimaryKeyMixin, CreatedAtMixin, SalonScopedMixin):
    __tablename__ = "gbp_posts"

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

    post_type: Mapped[str] = mapped_column(String(20), nullable=False)  # STANDARD / OFFER / EVENT

    summary_generated: Mapped[str] = mapped_column(Text, nullable=False)
    summary_final: Mapped[str] = mapped_column(Text, nullable=False)

    image_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("media_assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    cta_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cta_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    offer_redeem_online_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    gbp_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="pending",
        index=True,
    )  # pending / queued / posting / posted / failed / skipped

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    edited_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="SET NULL"),
        nullable=True,
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

