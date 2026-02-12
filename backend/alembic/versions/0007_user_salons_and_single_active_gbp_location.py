"""add user salons and single active GBP location constraint

Revision ID: 0007_user_salons_single_gbp_loc
Revises: 0006_sanitize_event_titles
Create Date: 2026-02-12
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0007_user_salons_single_gbp_loc"
down_revision = "0006_sanitize_event_titles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_salons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "salon_id", name="uq_user_salons_user_id_salon_id"),
    )
    op.create_index("ix_user_salons_user_id", "user_salons", ["user_id"])
    op.create_index("ix_user_salons_salon_id", "user_salons", ["salon_id"])

    # Backfill legacy single-salon assignments.
    op.execute(
        """
        INSERT INTO user_salons (id, user_id, salon_id, created_at)
        SELECT gen_random_uuid(), id, salon_id, now()
          FROM app_users
         WHERE salon_id IS NOT NULL
        ON CONFLICT (user_id, salon_id) DO NOTHING
        """
    )

    # Keep only the latest active location per salon before adding unique index.
    op.execute(
        """
        WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY salon_id
                       ORDER BY created_at DESC, id DESC
                   ) AS rn
              FROM gbp_locations
             WHERE is_active = TRUE
        )
        UPDATE gbp_locations g
           SET is_active = FALSE
          FROM ranked r
         WHERE g.id = r.id
           AND r.rn > 1
        """
    )

    op.create_index(
        "uq_gbp_locations_active_per_salon",
        "gbp_locations",
        ["salon_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_gbp_locations_active_per_salon", table_name="gbp_locations")
    op.drop_index("ix_user_salons_salon_id", table_name="user_salons")
    op.drop_index("ix_user_salons_user_id", table_name="user_salons")
    op.drop_table("user_salons")
