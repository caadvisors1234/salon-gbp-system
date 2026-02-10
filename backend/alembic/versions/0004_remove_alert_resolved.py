"""remove alert resolved status

Revision ID: 0004_remove_alert_resolved
Revises: 0003_add_scrape_seeded
Create Date: 2026-02-10
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0004_remove_alert_resolved"
down_revision = "0003_add_scrape_seeded"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update any existing resolved alerts to acked before changing constraint
    op.execute("UPDATE alerts SET status = 'acked' WHERE status = 'resolved'")

    # Replace check constraint: remove 'resolved'
    op.drop_constraint("ck_alerts_status", "alerts", type_="check")
    op.create_check_constraint(
        "ck_alerts_status",
        "alerts",
        "status IN ('open', 'acked')",
    )

    # Drop resolved columns
    op.drop_column("alerts", "resolved_by")
    op.drop_column("alerts", "resolved_at")


def downgrade() -> None:
    # Restore resolved columns
    op.add_column(
        "alerts",
        sa.Column(
            "resolved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("app_users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "alerts",
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Restore check constraint with 'resolved'
    op.drop_constraint("ck_alerts_status", "alerts", type_="check")
    op.create_check_constraint(
        "ck_alerts_status",
        "alerts",
        "status IN ('open', 'acked', 'resolved')",
    )
