from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppUser(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "app_users"

    salon_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("salons.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    supabase_user_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="staff")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    salon: Mapped["Salon | None"] = relationship(back_populates="users")

if TYPE_CHECKING:  # pragma: no cover
    from app.models.salon import Salon
