from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import Settings


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@dataclass(frozen=True)
class GoogleTokenResponse:
    access_token: str
    refresh_token: str | None
    expires_at: datetime


def build_authorize_url(settings: Settings, *, state: str) -> str:
    scopes = settings.google_oauth_scopes.strip()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        # "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_token(settings: Settings, *, code: str) -> GoogleTokenResponse:
    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.google_redirect_uri,
    }
    with httpx.Client(timeout=15) as client:
        r = client.post(GOOGLE_TOKEN_URL, data=data)
        r.raise_for_status()
        payload: dict[str, Any] = r.json()

    access_token = str(payload.get("access_token") or "")
    refresh_token = payload.get("refresh_token")
    expires_in = int(payload.get("expires_in") or 3600)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in)
    if not access_token:
        raise RuntimeError("Google token exchange did not return access_token")
    return GoogleTokenResponse(access_token=access_token, refresh_token=refresh_token, expires_at=expires_at)


def refresh_access_token(settings: Settings, *, refresh_token: str) -> GoogleTokenResponse:
    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    with httpx.Client(timeout=15) as client:
        r = client.post(GOOGLE_TOKEN_URL, data=data)
        r.raise_for_status()
        payload: dict[str, Any] = r.json()

    access_token = str(payload.get("access_token") or "")
    expires_in = int(payload.get("expires_in") or 3600)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in)
    if not access_token:
        raise RuntimeError("Google token refresh did not return access_token")
    return GoogleTokenResponse(access_token=access_token, refresh_token=None, expires_at=expires_at)


def fetch_user_email(*, access_token: str) -> str:
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=10) as client:
        r = client.get(GOOGLE_USERINFO_URL, headers=headers)
        r.raise_for_status()
        data = r.json()
    return str(data.get("email") or "")

