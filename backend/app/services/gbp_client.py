from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


GBP_BASE_V4 = "https://mybusiness.googleapis.com/v4"


@dataclass(frozen=True)
class GbpLocationInfo:
    account_id: str
    location_id: str
    location_name: str | None


def _auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def list_accounts(*, access_token: str) -> list[str]:
    """
    Best-effort account listing. The actual endpoint may vary by GBP API family.
    This implements the v4-style endpoint referenced in requirements.
    """
    url = f"{GBP_BASE_V4}/accounts"
    with httpx.Client(timeout=20) as client:
        r = client.get(url, headers=_auth_headers(access_token))
        r.raise_for_status()
        data: dict[str, Any] = r.json()
    accounts = data.get("accounts") or []
    out: list[str] = []
    for a in accounts:
        # v4 sometimes uses "name": "accounts/123"
        name = str(a.get("name") or a.get("accountName") or "")
        if name.startswith("accounts/"):
            out.append(name.split("/", 1)[1])
        elif name:
            out.append(name)
    return out


def list_locations(*, access_token: str, account_id: str) -> list[GbpLocationInfo]:
    url = f"{GBP_BASE_V4}/accounts/{account_id}/locations"
    with httpx.Client(timeout=30) as client:
        r = client.get(url, headers=_auth_headers(access_token))
        r.raise_for_status()
        data: dict[str, Any] = r.json()

    locations = data.get("locations") or []
    out: list[GbpLocationInfo] = []
    for loc in locations:
        name = str(loc.get("name") or "")
        location_id = ""
        if "/locations/" in name:
            location_id = name.split("/locations/", 1)[1]
        else:
            location_id = str(loc.get("locationId") or name)
        location_name = loc.get("locationName") or loc.get("title") or loc.get("storeCode")
        out.append(GbpLocationInfo(account_id=account_id, location_id=location_id, location_name=location_name))
    return out


def create_local_post(
    *,
    access_token: str,
    account_id: str,
    location_id: str,
    summary: str,
    image_url: str | None,
    cta_type: str | None,
    cta_url: str | None,
    topic_type: str,
    offer_redeem_online_url: str | None = None,
) -> dict[str, Any]:
    url = f"{GBP_BASE_V4}/accounts/{account_id}/locations/{location_id}/localPosts"
    body: dict[str, Any] = {
        "languageCode": "ja",
        "summary": summary,
        "topicType": topic_type,
    }
    if image_url:
        body["media"] = [{"mediaFormat": "PHOTO", "sourceUrl": image_url}]
    if cta_type and cta_url:
        body["callToAction"] = {"actionType": cta_type, "url": cta_url}
    if topic_type == "OFFER" and offer_redeem_online_url:
        body["offer"] = {"redeemOnlineUrl": offer_redeem_online_url}

    with httpx.Client(timeout=30) as client:
        r = client.post(url, headers=_auth_headers(access_token), json=body)
        r.raise_for_status()
        return r.json()


def upload_media(
    *,
    access_token: str,
    account_id: str,
    location_id: str,
    source_url: str,
    category: str,
    media_format: str = "PHOTO",
) -> dict[str, Any]:
    url = f"{GBP_BASE_V4}/accounts/{account_id}/locations/{location_id}/media"
    body = {
        "mediaFormat": media_format,
        "sourceUrl": source_url,
        "locationAssociation": {"category": category},
    }
    with httpx.Client(timeout=30) as client:
        r = client.post(url, headers=_auth_headers(access_token), json=body)
        r.raise_for_status()
        return r.json()

