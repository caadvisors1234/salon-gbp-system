from __future__ import annotations

import respx
from httpx import Response

from app.core.config import Settings
from app.services.meta_oauth import META_TOKEN_URL, refresh_long_lived_token


@respx.mock
def test_refresh_long_lived_token_success():
    respx.get(META_TOKEN_URL).mock(
        return_value=Response(200, json={
            "access_token": "new-long-lived-token",
            "token_type": "bearer",
            "expires_in": 5184000,
        })
    )
    settings = Settings(
        database_url="postgresql+psycopg://test:test@localhost:5432/test",
        meta_app_id="app123",
        meta_app_secret="secret",
    )
    result = refresh_long_lived_token(settings, current_token="old-token")
    assert result.access_token == "new-long-lived-token"
    assert result.expires_at is not None


@respx.mock
def test_refresh_long_lived_token_failure():
    respx.get(META_TOKEN_URL).mock(
        return_value=Response(400, json={"error": {"message": "Token expired"}})
    )
    settings = Settings(
        database_url="postgresql+psycopg://test:test@localhost:5432/test",
        meta_app_id="app123",
        meta_app_secret="secret",
    )
    import pytest
    from httpx import HTTPStatusError
    with pytest.raises(HTTPStatusError):
        refresh_long_lived_token(settings, current_token="expired-token")


@respx.mock
def test_refresh_long_lived_token_no_token_in_response():
    respx.get(META_TOKEN_URL).mock(
        return_value=Response(200, json={"token_type": "bearer"})
    )
    settings = Settings(
        database_url="postgresql+psycopg://test:test@localhost:5432/test",
        meta_app_id="app123",
        meta_app_secret="secret",
    )
    import pytest
    with pytest.raises(RuntimeError, match="did not return access_token"):
        refresh_long_lived_token(settings, current_token="old-token")
