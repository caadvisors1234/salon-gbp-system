from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppUser(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "app_users"

    supabase_user_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="staff")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    salon_memberships: Mapped[list["UserSalon"]] = relationship(
        back_populates="user",
        cascade="all,delete-orphan",
    )

if TYPE_CHECKING:  # pragma: no cover
    from app.models.user_salon import UserSalon
