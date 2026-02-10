"""add check constraints

Revision ID: 0002_add_check_constraints
Revises: 0001_init
Create Date: 2026-02-10
"""
from __future__ import annotations

from alembic import op


revision = "0002_add_check_constraints"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_gbp_posts_status",
        "gbp_posts",
        "status IN ('pending', 'queued', 'posting', 'posted', 'failed', 'skipped')",
    )
    op.create_check_constraint(
        "ck_gbp_media_uploads_status",
        "gbp_media_uploads",
        "status IN ('pending', 'queued', 'uploading', 'uploaded', 'failed', 'skipped')",
    )
    op.create_check_constraint(
        "ck_alerts_severity",
        "alerts",
        "severity IN ('info', 'warning', 'critical')",
    )
    op.create_check_constraint(
        "ck_alerts_status",
        "alerts",
        "status IN ('open', 'acked', 'resolved')",
    )
    op.create_check_constraint(
        "ck_gbp_connections_status",
        "gbp_connections",
        "status IN ('active', 'expired', 'revoked')",
    )
    op.create_check_constraint(
        "ck_app_users_role",
        "app_users",
        "role IN ('staff', 'salon_admin', 'super_admin')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_app_users_role", "app_users", type_="check")
    op.drop_constraint("ck_gbp_connections_status", "gbp_connections", type_="check")
    op.drop_constraint("ck_alerts_status", "alerts", type_="check")
    op.drop_constraint("ck_alerts_severity", "alerts", type_="check")
    op.drop_constraint("ck_gbp_media_uploads_status", "gbp_media_uploads", type_="check")
    op.drop_constraint("ck_gbp_posts_status", "gbp_posts", type_="check")
