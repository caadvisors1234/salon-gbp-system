from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import SalonScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class InstagramAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin, SalonScopedMixin):
    __tablename__ = "instagram_accounts"

    ig_user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    ig_username: Mapped[str] = mapped_column(String(100), nullable=False)

    account_type: Mapped[str] = mapped_column(String(20), nullable=False)  # official / staff
    staff_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sync_hashtags: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

