from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_env: str = "dev"
    app_public_base_url: str = "http://localhost:8080"

    api_cors_origins: list[str] = []

    database_url: str = "postgresql+psycopg://salon_gbp:salon_gbp@db:5432/salon_gbp"
    redis_url: str = "redis://redis:6379/0"

    # Supabase Auth (Auth only)
    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_jwt_audience: str = "authenticated"

    # AES-256-GCM key, URL-safe base64 encoded 32 bytes.
    token_enc_key_b64: str = ""

    # Used to sign OAuth `state` (CSRF protection).
    oauth_state_secret: str = ""

    # Google OAuth / GBP
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    google_oauth_scopes: str = "https://www.googleapis.com/auth/business.manage openid email"

    # Meta / Instagram (Phase 2)
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = ""
    meta_oauth_scopes: str = "instagram_basic,pages_show_list"

    # Media storage
    media_root: str = "/data/media"
    media_public_path: str = "/media"
    media_retention_days: int = 30

    # Scraping
    scraper_user_agent: str = "SalonGBPSystem/0.1"

    # Database connection pool
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 1800

    log_level: str = "INFO"

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        s = str(v).strip()
        if not s:
            return []
        return [part.strip() for part in s.split(",") if part.strip()]

    def resolved_supabase_jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if not self.supabase_url:
            return ""
        return self.supabase_url.rstrip("/") + "/auth/v1/keys"

    def resolved_supabase_issuer(self) -> str:
        if not self.supabase_url:
            return ""
        return self.supabase_url.rstrip("/") + "/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
