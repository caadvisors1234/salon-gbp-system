from __future__ import annotations

import pytest
import respx
from httpx import Response

from app.core.config import Settings
from app.services.supabase_admin import (
    SupabaseAdminError,
    SupabaseUserAlreadyExistsError,
    create_user,
    get_user_by_email,
)


def _settings(**overrides: str) -> Settings:
    defaults = {
        "supabase_url": "https://test.supabase.co",
        "supabase_service_role_key": "test-service-role-key",
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


# --- create_user ---


@respx.mock
def test_create_user_success():
    route = respx.post("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(200, json={"id": "uid-123", "email": "a@b.com"})
    )
    s = _settings()
    result = create_user(s, email="a@b.com", password="secret12")
    assert route.called
    assert result.id == "uid-123"
    assert result.email == "a@b.com"
    # Verify headers
    req = route.calls[0].request
    assert req.headers["apikey"] == "test-service-role-key"
    assert req.headers["authorization"] == "Bearer test-service-role-key"


@respx.mock
def test_create_user_without_password():
    route = respx.post("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(200, json={"id": "uid-456", "email": "x@y.com"})
    )
    s = _settings()
    result = create_user(s, email="x@y.com")
    assert result.id == "uid-456"
    import json
    body = json.loads(route.calls[0].request.content)
    assert "password" not in body
    assert body["email_confirm"] is True


@respx.mock
def test_create_user_already_exists():
    respx.post("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(422, json={"msg": "A user with this email address has already been registered"})
    )
    s = _settings()
    with pytest.raises(SupabaseUserAlreadyExistsError):
        create_user(s, email="dup@test.com")


@respx.mock
def test_create_user_generic_422():
    respx.post("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(422, json={"msg": "Invalid email format"})
    )
    s = _settings()
    with pytest.raises(SupabaseAdminError) as exc_info:
        create_user(s, email="bad")
    assert exc_info.value.status_code == 422
    assert not isinstance(exc_info.value, SupabaseUserAlreadyExistsError)


@respx.mock
def test_create_user_server_error():
    respx.post("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(500, json={"msg": "Internal server error"})
    )
    s = _settings()
    with pytest.raises(SupabaseAdminError) as exc_info:
        create_user(s, email="a@b.com")
    assert exc_info.value.status_code == 500


# --- get_user_by_email ---


@respx.mock
def test_get_user_by_email_found():
    respx.get("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(200, json={
            "users": [
                {"id": "u1", "email": "other@test.com"},
                {"id": "u2", "email": "target@test.com"},
            ]
        })
    )
    s = _settings()
    result = get_user_by_email(s, email="target@test.com")
    assert result is not None
    assert result.id == "u2"
    assert result.email == "target@test.com"


@respx.mock
def test_get_user_by_email_paginated_found():
    url = "https://test.supabase.co/auth/v1/admin/users"
    respx.get(url, params={"page": 1, "per_page": 1000}).mock(
        return_value=Response(
            200,
            json={
                "users": [{"id": "u1", "email": "other@test.com"}],
                "next_page": 2,
            },
        )
    )
    respx.get(url, params={"page": 2, "per_page": 1000}).mock(
        return_value=Response(
            200,
            json={
                "users": [{"id": "u2", "email": "target@test.com"}],
            },
        )
    )
    s = _settings()
    result = get_user_by_email(s, email="target@test.com")
    assert result is not None
    assert result.id == "u2"


@respx.mock
def test_get_user_by_email_not_found():
    respx.get("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(200, json={"users": []})
    )
    s = _settings()
    result = get_user_by_email(s, email="missing@test.com")
    assert result is None


@respx.mock
def test_get_user_by_email_case_insensitive():
    respx.get("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(200, json={
            "users": [{"id": "u1", "email": "User@Test.COM"}]
        })
    )
    s = _settings()
    result = get_user_by_email(s, email="user@test.com")
    assert result is not None
    assert result.id == "u1"


@respx.mock
def test_get_user_by_email_error():
    respx.get("https://test.supabase.co/auth/v1/admin/users").mock(
        return_value=Response(401, json={"msg": "Unauthorized"})
    )
    s = _settings()
    with pytest.raises(SupabaseAdminError) as exc_info:
        get_user_by_email(s, email="a@b.com")
    assert exc_info.value.status_code == 401
