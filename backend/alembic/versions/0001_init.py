"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-02-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "salons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("hotpepper_salon_id", sa.String(length=100), nullable=True),
        sa.Column("hotpepper_blog_url", sa.Text(), nullable=True),
        sa.Column("hotpepper_style_url", sa.Text(), nullable=True),
        sa.Column("hotpepper_coupon_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("slug", name="uq_salons_slug"),
    )
    op.create_index("ix_salons_slug", "salons", ["slug"])

    op.create_table(
        "app_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("supabase_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default=sa.text("'staff'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("supabase_user_id", name="uq_app_users_supabase_user_id"),
    )
    op.create_index("ix_app_users_salon_id", "app_users", ["salon_id"])
    op.create_index("ix_app_users_email", "app_users", ["email"])
    op.create_index("ix_app_users_supabase_user_id", "app_users", ["supabase_user_id"])

    op.create_table(
        "gbp_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("google_account_email", sa.String(length=255), nullable=False, server_default=sa.text("''")),
        sa.Column("access_token_enc", sa.Text(), nullable=False),
        sa.Column("refresh_token_enc", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("salon_id", name="uq_gbp_connections_salon_id"),
    )
    op.create_index("ix_gbp_connections_salon_id", "gbp_connections", ["salon_id"])

    op.create_table(
        "gbp_locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gbp_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gbp_connections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("salon_id", "account_id", "location_id", name="uq_gbp_locations_salon_account_location"),
    )
    op.create_index("ix_gbp_locations_salon_id", "gbp_locations", ["salon_id"])
    op.create_index("ix_gbp_locations_gbp_connection_id", "gbp_locations", ["gbp_connection_id"])

    op.create_table(
        "instagram_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ig_user_id", sa.String(length=100), nullable=False),
        sa.Column("ig_username", sa.String(length=100), nullable=False),
        sa.Column("account_type", sa.String(length=20), nullable=False),
        sa.Column("staff_name", sa.String(length=100), nullable=True),
        sa.Column("access_token_enc", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sync_hashtags", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_instagram_accounts_salon_id", "instagram_accounts", ["salon_id"])

    op.create_table(
        "source_contents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", sa.String(length=500), nullable=False),
        sa.Column("instagram_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instagram_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("image_urls", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("salon_id", "source_type", "source_id", name="uq_source_contents_salon_type_id"),
    )
    op.create_index("ix_source_contents_salon_id", "source_contents", ["salon_id"])
    op.create_index("ix_source_contents_source_type", "source_contents", ["source_type"])
    op.create_index("ix_source_contents_instagram_account_id", "source_contents", ["instagram_account_id"])

    op.create_table(
        "media_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=True),
        sa.Column("local_path", sa.Text(), nullable=False),
        sa.Column("public_url", sa.Text(), nullable=False),
        sa.Column("bytes", sa.BigInteger(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_media_assets_salon_id", "media_assets", ["salon_id"])

    op.create_table(
        "gbp_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("source_contents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gbp_location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gbp_locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("post_type", sa.String(length=20), nullable=False),
        sa.Column("summary_generated", sa.Text(), nullable=False),
        sa.Column("summary_final", sa.Text(), nullable=False),
        sa.Column("image_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cta_type", sa.String(length=50), nullable=True),
        sa.Column("cta_url", sa.Text(), nullable=True),
        sa.Column("offer_redeem_online_url", sa.Text(), nullable=True),
        sa.Column("gbp_post_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("edited_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_gbp_posts_salon_id", "gbp_posts", ["salon_id"])
    op.create_index("ix_gbp_posts_status", "gbp_posts", ["status"])
    op.create_index("ix_gbp_posts_source_content_id", "gbp_posts", ["source_content_id"])
    op.create_index("ix_gbp_posts_gbp_location_id", "gbp_posts", ["gbp_location_id"])
    op.create_index("ix_gbp_posts_image_asset_id", "gbp_posts", ["image_asset_id"])

    op.create_table(
        "gbp_media_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("source_contents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gbp_location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("gbp_locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_format", sa.String(length=10), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False, server_default=sa.text("'ADDITIONAL'")),
        sa.Column("source_image_url", sa.Text(), nullable=False),
        sa.Column("gbp_media_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_gbp_media_uploads_salon_id", "gbp_media_uploads", ["salon_id"])
    op.create_index("ix_gbp_media_uploads_status", "gbp_media_uploads", ["status"])
    op.create_index("ix_gbp_media_uploads_source_content_id", "gbp_media_uploads", ["source_content_id"])
    op.create_index("ix_gbp_media_uploads_gbp_location_id", "gbp_media_uploads", ["gbp_location_id"])
    op.create_index("ix_gbp_media_uploads_media_asset_id", "gbp_media_uploads", ["media_asset_id"])

    op.create_table(
        "job_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=True),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("items_found", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_processed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_job_logs_salon_id", "job_logs", ["salon_id"])
    op.create_index("ix_job_logs_job_type", "job_logs", ["job_type"])
    op.create_index("ix_job_logs_status", "job_logs", ["status"])

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("salon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=True),
        sa.Column("severity", sa.String(length=10), nullable=False),
        sa.Column("alert_type", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'open'")),
        sa.Column("acked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("acked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_salon_id", "alerts", ["salon_id"])
    op.create_index("ix_alerts_alert_type", "alerts", ["alert_type"])
    op.create_index("ix_alerts_status", "alerts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_index("ix_alerts_alert_type", table_name="alerts")
    op.drop_index("ix_alerts_salon_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("ix_job_logs_status", table_name="job_logs")
    op.drop_index("ix_job_logs_job_type", table_name="job_logs")
    op.drop_index("ix_job_logs_salon_id", table_name="job_logs")
    op.drop_table("job_logs")

    op.drop_index("ix_gbp_media_uploads_media_asset_id", table_name="gbp_media_uploads")
    op.drop_index("ix_gbp_media_uploads_gbp_location_id", table_name="gbp_media_uploads")
    op.drop_index("ix_gbp_media_uploads_source_content_id", table_name="gbp_media_uploads")
    op.drop_index("ix_gbp_media_uploads_status", table_name="gbp_media_uploads")
    op.drop_index("ix_gbp_media_uploads_salon_id", table_name="gbp_media_uploads")
    op.drop_table("gbp_media_uploads")

    op.drop_index("ix_gbp_posts_image_asset_id", table_name="gbp_posts")
    op.drop_index("ix_gbp_posts_gbp_location_id", table_name="gbp_posts")
    op.drop_index("ix_gbp_posts_source_content_id", table_name="gbp_posts")
    op.drop_index("ix_gbp_posts_status", table_name="gbp_posts")
    op.drop_index("ix_gbp_posts_salon_id", table_name="gbp_posts")
    op.drop_table("gbp_posts")

    op.drop_index("ix_media_assets_salon_id", table_name="media_assets")
    op.drop_table("media_assets")

    op.drop_index("ix_source_contents_instagram_account_id", table_name="source_contents")
    op.drop_index("ix_source_contents_source_type", table_name="source_contents")
    op.drop_index("ix_source_contents_salon_id", table_name="source_contents")
    op.drop_table("source_contents")

    op.drop_index("ix_instagram_accounts_salon_id", table_name="instagram_accounts")
    op.drop_table("instagram_accounts")

    op.drop_index("ix_gbp_locations_gbp_connection_id", table_name="gbp_locations")
    op.drop_index("ix_gbp_locations_salon_id", table_name="gbp_locations")
    op.drop_table("gbp_locations")

    op.drop_index("ix_gbp_connections_salon_id", table_name="gbp_connections")
    op.drop_table("gbp_connections")

    op.drop_index("ix_app_users_supabase_user_id", table_name="app_users")
    op.drop_index("ix_app_users_email", table_name="app_users")
    op.drop_index("ix_app_users_salon_id", table_name="app_users")
    op.drop_table("app_users")

    op.drop_index("ix_salons_slug", table_name="salons")
    op.drop_table("salons")

    op.execute("DROP EXTENSION IF EXISTS pgcrypto")

