from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SalonScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class GbpConnection(Base, UUIDPrimaryKeyMixin, TimestampMixin, SalonScopedMixin):
    __tablename__ = "gbp_connections"

    google_account_email: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")

    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    locations: Mapped[list["GbpLocation"]] = relationship(back_populates="connection", cascade="all,delete-orphan")

if TYPE_CHECKING:  # pragma: no cover
    from app.models.gbp_location import GbpLocation
