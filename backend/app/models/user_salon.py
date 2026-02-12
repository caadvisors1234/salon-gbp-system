from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class UserSalon(Base, UUIDPrimaryKeyMixin, CreatedAtMixin):
    __tablename__ = "user_salons"
    __table_args__ = (
        UniqueConstraint("user_id", "salon_id", name="uq_user_salons_user_id_salon_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    salon_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("salons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user: Mapped["AppUser"] = relationship(back_populates="salon_memberships")
    salon: Mapped["Salon"] = relationship(back_populates="user_memberships")


if TYPE_CHECKING:  # pragma: no cover
    from app.models.salon import Salon
    from app.models.user import AppUser
