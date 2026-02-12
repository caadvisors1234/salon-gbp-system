"""drop app_users.salon_id compatibility column

Revision ID: 0008_drop_app_users_salon_id
Revises: 0007_user_salons_single_gbp_loc
Create Date: 2026-02-12
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0008_drop_app_users_salon_id"
down_revision = "0007_user_salons_single_gbp_loc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("app_users_salon_id_fkey", "app_users", type_="foreignkey")
    op.drop_index("ix_app_users_salon_id", table_name="app_users")
    op.drop_column("app_users", "salon_id")


def downgrade() -> None:
    op.add_column("app_users", sa.Column("salon_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "app_users_salon_id_fkey",
        "app_users",
        "salons",
        ["salon_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_app_users_salon_id", "app_users", ["salon_id"])

    # Best-effort backfill from memberships.
    op.execute(
        """
        UPDATE app_users u
           SET salon_id = m.salon_id
          FROM (
            SELECT user_id, min(salon_id) AS salon_id
              FROM user_salons
             GROUP BY user_id
          ) m
         WHERE u.id = m.user_id
        """
    )
