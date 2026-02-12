from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException

from app.api.deps import CurrentUser, require_salon


def _user(*, role: str = "salon_admin", salon_ids: tuple[uuid.UUID, ...] = ()) -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        supabase_user_id=uuid.uuid4(),
        email="test@example.com",
        role=role,
        salon_ids=salon_ids,
    )


def test_require_salon_requires_header() -> None:
    user = _user(salon_ids=(uuid.uuid4(),))
    with pytest.raises(HTTPException) as exc:
        require_salon(user=user, x_salon_id=None)
    assert exc.value.status_code == 400


def test_require_salon_rejects_invalid_uuid() -> None:
    user = _user(salon_ids=(uuid.uuid4(),))
    with pytest.raises(HTTPException) as exc:
        require_salon(user=user, x_salon_id="not-uuid")
    assert exc.value.status_code == 400


def test_require_salon_rejects_unassigned_salon() -> None:
    sid = uuid.uuid4()
    user = _user(salon_ids=(uuid.uuid4(),))
    with pytest.raises(HTTPException) as exc:
        require_salon(user=user, x_salon_id=str(sid))
    assert exc.value.status_code == 403


def test_require_salon_accepts_assigned_salon() -> None:
    sid = uuid.uuid4()
    user = _user(salon_ids=(sid,))
    assert require_salon(user=user, x_salon_id=str(sid)) == sid


def test_require_salon_allows_super_admin_with_header() -> None:
    sid = uuid.uuid4()
    user = _user(role="super_admin")
    assert require_salon(user=user, x_salon_id=str(sid)) == sid
