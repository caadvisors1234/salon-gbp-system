"""add scrape_seeded table

Revision ID: 0003_add_scrape_seeded
Revises: 0002_add_check_constraints
Create Date: 2026-02-10
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0003_add_scrape_seeded"
down_revision = "0002_add_check_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scrape_seeded",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("seeded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scrape_seeded_salon_id", "scrape_seeded", ["salon_id"])
    op.create_unique_constraint("uq_scrape_seeded_salon_source", "scrape_seeded", ["salon_id", "source_type"])
    op.create_check_constraint(
        "ck_scrape_seeded_source_type",
        "scrape_seeded",
        "source_type IN ('hotpepper_blog', 'hotpepper_style', 'hotpepper_coupon', 'instagram')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_scrape_seeded_source_type", "scrape_seeded", type_="check")
    op.drop_constraint("uq_scrape_seeded_salon_source", "scrape_seeded", type_="unique")
    op.drop_index("ix_scrape_seeded_salon_id", table_name="scrape_seeded")
    op.drop_table("scrape_seeded")
