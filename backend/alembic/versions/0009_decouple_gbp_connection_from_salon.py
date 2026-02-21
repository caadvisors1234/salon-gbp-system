"""decouple gbp_connections from salon_id, key on google_account_email

Revision ID: 0009_decouple_gbp_conn
Revises: 0008_drop_app_users_salon_id
Create Date: 2026-02-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0009_decouple_gbp_conn"
down_revision = "0008_drop_app_users_salon_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Fill empty google_account_email with placeholder
    op.execute(
        sa.text(
            "UPDATE gbp_connections "
            "SET google_account_email = 'unknown-' || id::text "
            "WHERE google_account_email = '' OR google_account_email IS NULL"
        )
    )

    # 2. Merge duplicate google_account_email rows (keep the latest updated_at).
    #    Re-point GbpLocations from duplicate connections to the keeper.
    #    Safe no-op when no duplicates exist.
    op.execute(
        sa.text("""
            WITH ranked AS (
                SELECT id, google_account_email,
                       ROW_NUMBER() OVER (
                           PARTITION BY google_account_email
                           ORDER BY updated_at DESC
                       ) AS rn
                FROM gbp_connections
            ),
            keeper AS (
                SELECT id AS keeper_id, google_account_email
                FROM ranked WHERE rn = 1
            )
            UPDATE gbp_locations
            SET gbp_connection_id = keeper.keeper_id
            FROM ranked
            JOIN keeper USING (google_account_email)
            WHERE gbp_locations.gbp_connection_id = ranked.id
              AND ranked.rn > 1
        """)
    )

    # Delete the duplicate (non-keeper) connections.
    # Safe no-op when no duplicates exist.
    op.execute(
        sa.text("""
            WITH ranked AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY google_account_email
                           ORDER BY updated_at DESC
                       ) AS rn
                FROM gbp_connections
            )
            DELETE FROM gbp_connections
            WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
        """)
    )

    # 3. Drop the old UNIQUE(salon_id) constraint
    op.drop_constraint("uq_gbp_connections_salon_id", "gbp_connections", type_="unique")

    # 4. Drop the salon_id index
    op.drop_index("ix_gbp_connections_salon_id", table_name="gbp_connections")

    # 5. Drop the salon_id column
    op.drop_column("gbp_connections", "salon_id")

    # 6. Add UNIQUE on google_account_email
    op.create_unique_constraint(
        "uq_gbp_connections_google_email",
        "gbp_connections",
        ["google_account_email"],
    )


def downgrade() -> None:
    # Remove email unique constraint
    op.drop_constraint("uq_gbp_connections_google_email", "gbp_connections", type_="unique")

    # Re-add salon_id column as nullable (without inline FK to avoid Alembic compat issues)
    op.add_column(
        "gbp_connections",
        sa.Column(
            "salon_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_gbp_connections_salon_id",
        "gbp_connections",
        "salons",
        ["salon_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Backfill salon_id from the first active GbpLocation per connection
    op.execute(
        sa.text("""
            UPDATE gbp_connections c
            SET salon_id = sub.salon_id
            FROM (
                SELECT DISTINCT ON (gbp_connection_id) gbp_connection_id, salon_id
                FROM gbp_locations
                ORDER BY gbp_connection_id, is_active DESC, created_at ASC
            ) sub
            WHERE c.id = sub.gbp_connection_id
        """)
    )

    op.create_index("ix_gbp_connections_salon_id", "gbp_connections", ["salon_id"])
    op.create_unique_constraint("uq_gbp_connections_salon_id", "gbp_connections", ["salon_id"])
