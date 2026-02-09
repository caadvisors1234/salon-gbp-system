from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.supabase_jwt import SupabaseAuthError, verify_jwt
from app.db.session import SessionLocal
from app.models.user import AppUser


security = HTTPBearer(auto_error=False)


def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@dataclass(frozen=True)
class CurrentUser:
    id: uuid.UUID
    supabase_user_id: uuid.UUID
    email: str
    role: str
    salon_id: uuid.UUID | None

    def is_super_admin(self) -> bool:
        return self.role == "super_admin"


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT claim: {field}",
        ) from e


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(db_session),
) -> CurrentUser:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    settings = get_settings()
    try:
        claims = verify_jwt(
            creds.credentials,
            jwks_url=settings.resolved_supabase_jwks_url(),
            jwt_secret=settings.supabase_jwt_secret,
            audience=settings.supabase_jwt_audience or None,
            issuer=settings.resolved_supabase_issuer() or None,
        )
    except SupabaseAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e

    supabase_user_id = _parse_uuid(str(claims.get("sub", "")), field="sub")
    email = str(claims.get("email") or "")

    app_user: AppUser | None = (
        db.query(AppUser).filter(AppUser.supabase_user_id == supabase_user_id).one_or_none()
    )
    if app_user is None or not app_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned or inactive. Contact the operator.",
        )
    return CurrentUser(
        id=app_user.id,
        supabase_user_id=app_user.supabase_user_id,
        email=app_user.email or email,
        role=app_user.role,
        salon_id=app_user.salon_id,
    )


def require_roles(*roles: str):
    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.is_super_admin():
            return user
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return _dep


def require_salon(user: CurrentUser = Depends(get_current_user)) -> uuid.UUID:
    if user.is_super_admin():
        # super_admin may act without a salon context; endpoints that need salon must enforce it explicitly.
        if user.salon_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="salon_id is required for this user")
        return user.salon_id
    if user.salon_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not assigned to a salon")
    return user.salon_id
