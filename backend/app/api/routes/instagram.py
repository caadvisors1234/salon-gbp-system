from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles, require_salon
from app.core.config import get_settings
from app.core.crypto import encrypt_str
from app.models.instagram_account import InstagramAccount
from app.schemas.instagram import (
    InstagramAccountCreateRequest,
    InstagramAccountPatchRequest,
    InstagramAccountResponse,
)


router = APIRouter()


@router.get("/accounts", response_model=list[InstagramAccountResponse])
def list_accounts(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> list[InstagramAccountResponse]:
    salon_id = require_salon(user)
    accounts = (
        db.query(InstagramAccount)
        .filter(InstagramAccount.salon_id == salon_id)
        .order_by(InstagramAccount.created_at.desc())
        .all()
    )
    return [InstagramAccountResponse.model_validate(a) for a in accounts]


@router.post("/accounts", response_model=InstagramAccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: InstagramAccountCreateRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> InstagramAccountResponse:
    settings = get_settings()
    salon_id = require_salon(user)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=payload.expires_in_days)
    acc = InstagramAccount(
        salon_id=salon_id,
        ig_user_id=payload.ig_user_id,
        ig_username=payload.ig_username,
        account_type=payload.account_type,
        staff_name=payload.staff_name,
        access_token_enc=encrypt_str(payload.access_token, settings.token_enc_key_b64),
        token_expires_at=expires_at,
        is_active=payload.is_active,
        sync_hashtags=payload.sync_hashtags,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return InstagramAccountResponse.model_validate(acc)


@router.patch("/accounts/{account_id}", response_model=InstagramAccountResponse)
def patch_account(
    account_id: uuid.UUID,
    payload: InstagramAccountPatchRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> InstagramAccountResponse:
    salon_id = require_salon(user)
    acc = (
        db.query(InstagramAccount)
        .filter(InstagramAccount.id == account_id)
        .filter(InstagramAccount.salon_id == salon_id)
        .one_or_none()
    )
    if acc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instagram account not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(acc, k, v)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return InstagramAccountResponse.model_validate(acc)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
):
    salon_id = require_salon(user)
    acc = (
        db.query(InstagramAccount)
        .filter(InstagramAccount.id == account_id)
        .filter(InstagramAccount.salon_id == salon_id)
        .one_or_none()
    )
    if acc is None:
        return
    db.delete(acc)
    db.commit()
    return None

