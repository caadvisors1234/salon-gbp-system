from __future__ import annotations

import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles
from app.core.config import get_settings
from app.core.crypto import encrypt_str
from app.core.oauth_state import OAuthStateError, create_state, load_state
from app.models.gbp_connection import GbpConnection
from app.services.google_oauth import build_authorize_url, exchange_code_for_token, fetch_user_email


router = APIRouter()


@router.get("/oauth/google/start")
def google_oauth_start(
    request: Request,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("super_admin")),
):
    _ = db  # reserved for future one-time-state storage
    settings = get_settings()
    state = create_state(
        {"user_id": str(user.id), "nonce": uuid.uuid4().hex},
        settings.oauth_state_secret,
    )
    url = build_authorize_url(settings, state=state)
    # Return JSON when called via fetch (XHR), redirect otherwise
    if request.headers.get("x-requested-with") == "fetch":
        return {"redirect_url": url}
    return RedirectResponse(url=url)


@router.get("/oauth/google/callback")
def google_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(db_session),
):
    settings = get_settings()
    redirect_base = settings.app_public_base_url.rstrip("/")
    if error:
        return RedirectResponse(url=f"{redirect_base}/admin/gbp-mapping?oauth=error&reason={quote(error, safe='')}")
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code/state")

    try:
        data = load_state(state, settings.oauth_state_secret)
    except OAuthStateError:
        return RedirectResponse(url=f"{redirect_base}/admin/gbp-mapping?oauth=error&reason=state")

    _ = data  # user_id and nonce validated by load_state

    token = exchange_code_for_token(settings, code=code)
    email = ""
    try:
        email = fetch_user_email(access_token=token.access_token)
    except Exception:
        email = ""

    if not email:
        return RedirectResponse(
            url=f"{redirect_base}/admin/gbp-mapping?oauth=error&reason=email_unavailable"
        )

    access_enc = encrypt_str(token.access_token, settings.token_enc_key_b64)
    refresh_enc = None
    if token.refresh_token:
        refresh_enc = encrypt_str(token.refresh_token, settings.token_enc_key_b64)

    # Upsert by google_account_email
    conn = (
        db.query(GbpConnection)
        .filter(GbpConnection.google_account_email == email)
        .one_or_none()
    )
    if conn is None:
        if refresh_enc is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh_token")
        conn = GbpConnection(
            google_account_email=email,
            access_token_enc=access_enc,
            refresh_token_enc=refresh_enc,
            token_expires_at=token.expires_at,
            status="active",
        )
    else:
        conn.google_account_email = email or conn.google_account_email
        conn.access_token_enc = access_enc
        if refresh_enc is not None:
            conn.refresh_token_enc = refresh_enc
        conn.token_expires_at = token.expires_at
        conn.status = "active"

    db.add(conn)
    db.commit()
    db.refresh(conn)

    return RedirectResponse(url=f"{redirect_base}/admin/gbp-mapping?oauth=success")
