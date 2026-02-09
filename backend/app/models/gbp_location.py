from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SalonScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class GbpLocation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SalonScopedMixin):
    __tablename__ = "gbp_locations"

    gbp_connection_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("gbp_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    connection: Mapped["GbpConnection"] = relationship(back_populates="locations")

if TYPE_CHECKING:  # pragma: no cover
    from app.models.gbp_connection import GbpConnection
