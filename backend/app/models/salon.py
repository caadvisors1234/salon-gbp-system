from __future__ import annotations

from sqlalchemy import Boolean, String, Text
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Salon(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "salons"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)

    hotpepper_salon_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hotpepper_blog_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hotpepper_style_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hotpepper_coupon_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    user_memberships: Mapped[list["UserSalon"]] = relationship(
        back_populates="salon",
        cascade="all,delete-orphan",
    )

if TYPE_CHECKING:  # pragma: no cover
    from app.models.user_salon import UserSalon
