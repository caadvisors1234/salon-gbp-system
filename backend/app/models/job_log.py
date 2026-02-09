from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import OptionalSalonScopedMixin, UUIDPrimaryKeyMixin


class JobLog(Base, UUIDPrimaryKeyMixin, OptionalSalonScopedMixin):
    __tablename__ = "job_logs"

    job_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # started/completed/failed

    items_found: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    items_processed: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

