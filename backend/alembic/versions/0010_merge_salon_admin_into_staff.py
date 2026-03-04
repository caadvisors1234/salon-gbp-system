"""merge salon_admin role into staff

Revision ID: 0010_merge_roles
Revises: 0009_decouple_gbp_conn
Create Date: 2026-03-04
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0010_merge_roles"
down_revision = "0009_decouple_gbp_conn"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Convert all salon_admin users to staff
    op.execute("UPDATE app_users SET role = 'staff' WHERE role = 'salon_admin'")

    # 2. Replace the check constraint to only allow staff/super_admin
    op.drop_constraint("ck_app_users_role", "app_users", type_="check")
    op.create_check_constraint(
        "ck_app_users_role",
        "app_users",
        sa.column("role").in_(["staff", "super_admin"]),
    )


def downgrade() -> None:
    # Widen the constraint back to allow salon_admin
    op.drop_constraint("ck_app_users_role", "app_users", type_="check")
    op.create_check_constraint(
        "ck_app_users_role",
        "app_users",
        sa.column("role").in_(["staff", "salon_admin", "super_admin"]),
    )
    # Note: cannot restore which users were salon_admin
