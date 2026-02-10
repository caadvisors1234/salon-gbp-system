from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.schemas.admin import AdminUserAssignRequest, AdminUserInviteRequest


def test_valid_roles():
    for role in ("staff", "salon_admin", "super_admin"):
        req = AdminUserAssignRequest(
            supabase_user_id=uuid.uuid4(),
            email="test@example.com",
            role=role,
        )
        assert req.role == role


def test_default_role_is_staff():
    req = AdminUserAssignRequest(
        supabase_user_id=uuid.uuid4(),
        email="test@example.com",
    )
    assert req.role == "staff"


def test_invalid_role_rejected():
    with pytest.raises(ValidationError):
        AdminUserAssignRequest(
            supabase_user_id=uuid.uuid4(),
            email="test@example.com",
            role="hacker",
        )


def test_empty_role_rejected():
    with pytest.raises(ValidationError):
        AdminUserAssignRequest(
            supabase_user_id=uuid.uuid4(),
            email="test@example.com",
            role="",
        )


# --- AdminUserInviteRequest ---


def test_invite_valid_minimal():
    req = AdminUserInviteRequest(email="user@example.com")
    assert req.email == "user@example.com"
    assert req.password is None
    assert req.role == "staff"
    assert req.salon_id is None
    assert req.display_name is None


def test_invite_valid_full():
    sid = uuid.uuid4()
    req = AdminUserInviteRequest(
        email="admin@salon.jp",
        password="securepass123",
        role="salon_admin",
        salon_id=sid,
        display_name="テスト太郎",
    )
    assert req.role == "salon_admin"
    assert req.salon_id == sid
    assert req.display_name == "テスト太郎"


def test_invite_invalid_email():
    with pytest.raises(ValidationError) as exc_info:
        AdminUserInviteRequest(email="not-an-email")
    assert "email" in str(exc_info.value).lower()


def test_invite_password_too_short():
    with pytest.raises(ValidationError) as exc_info:
        AdminUserInviteRequest(email="a@b.com", password="short")
    errors = exc_info.value.errors()
    assert any("password" in str(e.get("loc", "")) for e in errors)


def test_invite_password_too_long():
    with pytest.raises(ValidationError):
        AdminUserInviteRequest(email="a@b.com", password="x" * 129)


def test_invite_invalid_role():
    with pytest.raises(ValidationError):
        AdminUserInviteRequest(email="a@b.com", role="owner")  # type: ignore[arg-type]


def test_invite_display_name_too_long():
    with pytest.raises(ValidationError):
        AdminUserInviteRequest(email="a@b.com", display_name="x" * 101)


def test_invite_password_none_is_ok():
    req = AdminUserInviteRequest(email="a@b.com", password=None)
    assert req.password is None


def test_invite_password_exactly_8_chars():
    req = AdminUserInviteRequest(email="a@b.com", password="12345678")
    assert req.password == "12345678"
