from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import SalonScopedMixin, UUIDPrimaryKeyMixin


class ScrapeSeeded(Base, UUIDPrimaryKeyMixin, SalonScopedMixin):
    __tablename__ = "scrape_seeded"
    __table_args__ = (
        UniqueConstraint("salon_id", "source_type", name="uq_scrape_seeded_salon_source"),
    )

    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    seeded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
