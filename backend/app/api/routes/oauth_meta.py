from __future__ import annotations

import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles, require_salon
from app.core.config import get_settings
from app.core.crypto import encrypt_str
from app.core.oauth_state import OAuthStateError, create_state, load_state
from app.models.instagram_account import InstagramAccount
from app.services.meta_oauth import (
    build_authorize_url,
    discover_instagram_accounts,
    exchange_code_for_token,
    exchange_for_long_lived_token,
)


router = APIRouter()


@router.get("/oauth/meta/start")
def meta_oauth_start(
    request: Request,
    account_type: str = Query(default="official"),
    staff_name: str | None = Query(default=None),
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
):
    _ = db
    settings = get_settings()
    salon_id = require_salon(user)
    if account_type not in ("official", "staff"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid account_type")
    state = create_state(
        {
            "salon_id": str(salon_id),
            "user_id": str(user.id),
            "account_type": account_type,
            "staff_name": staff_name or "",
            "nonce": uuid.uuid4().hex,
        },
        settings.oauth_state_secret,
    )
    url = build_authorize_url(settings, state=state)
    # Return JSON when called via fetch (XHR), redirect otherwise
    if request.headers.get("x-requested-with") == "fetch":
        return {"redirect_url": url}
    return RedirectResponse(url=url)


@router.get("/oauth/meta/callback")
def meta_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(db_session),
):
    settings = get_settings()
    redirect_base = settings.app_public_base_url.rstrip("/")
    if error:
        return RedirectResponse(url=f"{redirect_base}/settings/instagram?oauth=error&reason={quote(error, safe='')}")
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code/state")

    try:
        data = load_state(state, settings.oauth_state_secret)
    except OAuthStateError:
        return RedirectResponse(url=f"{redirect_base}/settings/instagram?oauth=error&reason=state")
    salon_id = uuid.UUID(str(data["salon_id"]))
    account_type = str(data.get("account_type") or "official")
    staff_name = str(data.get("staff_name") or "") or None

    short = exchange_code_for_token(settings, code=code)
    long = exchange_for_long_lived_token(settings, short_lived_token=short.access_token)
    ig_accounts = discover_instagram_accounts(access_token=long.access_token)

    added = 0
    for ig in ig_accounts:
        ig_user_id = ig["ig_user_id"]
        ig_username = ig.get("ig_username") or ig_user_id
        existing = (
            db.query(InstagramAccount)
            .filter(InstagramAccount.salon_id == salon_id)
            .filter(InstagramAccount.ig_user_id == ig_user_id)
            .one_or_none()
        )
        if existing is None:
            acc = InstagramAccount(
                salon_id=salon_id,
                ig_user_id=ig_user_id,
                ig_username=ig_username,
                account_type=account_type,
                staff_name=staff_name if account_type == "staff" else None,
                access_token_enc=encrypt_str(long.access_token, settings.token_enc_key_b64),
                token_expires_at=long.expires_at,
                is_active=True,
                sync_hashtags=False,
            )
            db.add(acc)
            added += 1
        else:
            existing.ig_username = ig_username
            existing.account_type = account_type
            existing.staff_name = staff_name if account_type == "staff" else existing.staff_name
            existing.access_token_enc = encrypt_str(long.access_token, settings.token_enc_key_b64)
            existing.token_expires_at = long.expires_at
            existing.is_active = True
            db.add(existing)

    db.commit()
    return RedirectResponse(url=f"{redirect_base}/settings/instagram?oauth=success&added={added}")
