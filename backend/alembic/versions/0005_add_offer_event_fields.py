"""add offer event fields

Revision ID: 0005_add_offer_event_fields
Revises: 0004_remove_alert_resolved
Create Date: 2026-02-11
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0005_add_offer_event_fields"
down_revision = "0004_remove_alert_resolved"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("gbp_posts", sa.Column("event_title", sa.String(58), nullable=True))
    op.add_column("gbp_posts", sa.Column("event_start_date", sa.Date(), nullable=True))
    op.add_column("gbp_posts", sa.Column("event_end_date", sa.Date(), nullable=True))

    # Backfill existing pending/failed OFFER posts with sensible defaults.
    # Sanitize: replace newlines/tabs with spaces, compress consecutive spaces, trim, truncate to 58 chars.
    op.execute(
        """
        UPDATE gbp_posts
        SET event_title = LEFT(
                TRIM(regexp_replace(
                    regexp_replace(summary_final, E'[\\n\\r\\t]+', ' ', 'g'),
                    ' {2,}', ' ', 'g'
                )),
                58
            ),
            event_start_date = CURRENT_DATE,
            event_end_date = CURRENT_DATE + INTERVAL '30 days'
        WHERE post_type = 'OFFER'
          AND event_title IS NULL
          AND status IN ('pending', 'failed', 'queued', 'posting')
        """
    )


def downgrade() -> None:
    op.drop_column("gbp_posts", "event_end_date")
    op.drop_column("gbp_posts", "event_start_date")
    op.drop_column("gbp_posts", "event_title")
