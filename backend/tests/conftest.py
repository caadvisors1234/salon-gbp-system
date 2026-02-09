from __future__ import annotations

from unittest.mock import patch

import pytest

from app.core.config import Settings, get_settings
from app.scrapers import http_client


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
