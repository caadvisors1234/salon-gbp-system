"""sanitize event titles

Revision ID: 0006_sanitize_event_titles
Revises: 0005_add_offer_event_fields
Create Date: 2026-02-11
"""
from __future__ import annotations

from alembic import op


revision = "0006_sanitize_event_titles"
down_revision = "0005_add_offer_event_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safety net for environments where 0005 was applied before sanitize logic was added.
    # On fresh deploys (0005+0006 together), this is a no-op since 0005 already backfills cleanly.
    op.execute(
        """
        UPDATE gbp_posts
        SET event_title = LEFT(
                TRIM(regexp_replace(
                    regexp_replace(event_title, E'[\\n\\r\\t]+', ' ', 'g'),
                    ' {2,}', ' ', 'g'
                )),
                58
            )
        WHERE event_title IS NOT NULL
          AND (event_title ~ E'[\\n\\r\\t]' OR length(event_title) > 58)
        """
    )


def downgrade() -> None:
    pass
