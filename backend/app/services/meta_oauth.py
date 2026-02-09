from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import Settings


META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"


@dataclass(frozen=True)
class MetaTokenResponse:
    access_token: str
    expires_at: datetime


def build_authorize_url(settings: Settings, *, state: str) -> str:
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_redirect_uri,
        "response_type": "code",
        "scope": settings.meta_oauth_scopes,
        "state": state,
    }
    return f"{META_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_token(settings: Settings, *, code: str) -> MetaTokenResponse:
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_redirect_uri,
        "client_secret": settings.meta_app_secret,
        "code": code,
    }
    with httpx.Client(timeout=15) as client:
        r = client.get(META_TOKEN_URL, params=params)
        r.raise_for_status()
        data: dict[str, Any] = r.json()
    access_token = str(data.get("access_token") or "")
    expires_in = int(data.get("expires_in") or 3600)
    if not access_token:
        raise RuntimeError("Meta token exchange did not return access_token")
    return MetaTokenResponse(
        access_token=access_token,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in),
    )


def exchange_for_long_lived_token(settings: Settings, *, short_lived_token: str) -> MetaTokenResponse:
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.meta_app_id,
        "client_secret": settings.meta_app_secret,
        "fb_exchange_token": short_lived_token,
    }
    with httpx.Client(timeout=15) as client:
        r = client.get(META_TOKEN_URL, params=params)
        r.raise_for_status()
        data: dict[str, Any] = r.json()
    access_token = str(data.get("access_token") or "")
    expires_in = int(data.get("expires_in") or 60 * 24 * 60 * 60)
    if not access_token:
        raise RuntimeError("Meta long-lived token exchange did not return access_token")
    return MetaTokenResponse(
        access_token=access_token,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in),
    )


def discover_instagram_accounts(*, access_token: str) -> list[dict[str, str]]:
    """
    Best-effort discovery:
    1) /me/accounts -> page access tokens
    2) /{page_id}?fields=instagram_business_account -> ig user id
    3) /{ig_user_id}?fields=username -> username
    """
    out: list[dict[str, str]] = []

    with httpx.Client(timeout=20) as client:
        pages = client.get(
            "https://graph.facebook.com/v19.0/me/accounts",
            params={"fields": "id,name,access_token", "access_token": access_token},
        )
        pages.raise_for_status()
        pages_data = pages.json().get("data") or []

        for p in pages_data:
            page_id = str(p.get("id") or "")
            page_token = str(p.get("access_token") or "")
            if not page_id or not page_token:
                continue
            r = client.get(
                f"https://graph.facebook.com/v19.0/{page_id}",
                params={"fields": "instagram_business_account", "access_token": page_token},
            )
            if r.status_code >= 400:
                continue
            ig = r.json().get("instagram_business_account") or {}
            ig_user_id = str(ig.get("id") or "")
            if not ig_user_id:
                continue

            u = client.get(
                f"https://graph.facebook.com/v19.0/{ig_user_id}",
                params={"fields": "username", "access_token": access_token},
            )
            username = ""
            if u.status_code < 400:
                username = str(u.json().get("username") or "")
            out.append({"ig_user_id": ig_user_id, "ig_username": username})

    # de-dupe by ig_user_id
    seen: set[str] = set()
    uniq: list[dict[str, str]] = []
    for x in out:
        if x["ig_user_id"] in seen:
            continue
        seen.add(x["ig_user_id"])
        uniq.append(x)
    return uniq
