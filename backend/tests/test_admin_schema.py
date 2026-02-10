from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.schemas.admin import AdminUserAssignRequest


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
