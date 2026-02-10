from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from sqlalchemy import event, text

from app.core.config import Settings, get_settings
from app.db.base import Base
from app.scrapers import http_client


def setup_sqlite_compat():
    """Patch SQLAlchemy metadata so PostgreSQL-specific DDL works with SQLite.

    1. Compile postgresql.UUID as VARCHAR(36).
    2. Compile postgresql.JSONB as TEXT.
    3. Remove server_default=text("gen_random_uuid()") (tests provide id explicitly).
    """
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

    if not hasattr(SQLiteTypeCompiler, "_patched_for_pg"):
        SQLiteTypeCompiler._patched_for_pg = True
        SQLiteTypeCompiler.visit_UUID = lambda self, type_, **kw: "VARCHAR(36)"
        SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "TEXT"

    # Remove PostgreSQL-specific server_defaults that SQLite can't handle.
    for table in Base.metadata.tables.values():
        for col in table.columns:
            sd = col.server_default
            if sd is not None and hasattr(sd, "arg"):
                arg_text = str(getattr(sd.arg, "text", ""))
                if "gen_random_uuid()" in arg_text:
                    col.server_default = None
                elif "::jsonb" in arg_text:
                    # Replace '[]'::jsonb with a plain '[]' default
                    from sqlalchemy import schema
                    col.server_default = schema.FetchedValue()
                    col.server_default = None


def register_sqlite_functions(engine):
    """Register PostgreSQL-compatible functions for SQLite."""
    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_conn, connection_record):
        dbapi_conn.create_function("gen_random_uuid", 0, lambda: str(uuid.uuid4()))


@pytest.fixture(autouse=True)
def clear_robots_cache():
    """Clear the robots.txt cache before and after each test."""
    http_client._robots_cache.clear()
    yield
    http_client._robots_cache.clear()


@pytest.fixture(autouse=True)
def mock_settings():
    """Provide a test Settings instance and clear lru_cache."""
    get_settings.cache_clear()
    test_settings = Settings(
        database_url="postgresql+psycopg://test:test@localhost:5432/test",
        scraper_user_agent="TestBot/1.0",
    )
    with patch("app.scrapers.http_client.get_settings", return_value=test_settings):
        yield test_settings
    get_settings.cache_clear()
