from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


GBP_BASE_V4 = "https://mybusiness.googleapis.com/v4"
GBP_ACCOUNT_MGMT = "https://mybusinessaccountmanagement.googleapis.com/v1"
GBP_BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1"


@dataclass(frozen=True)
class GbpLocationInfo:
    account_id: str
    location_id: str
    location_name: str | None


def _auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def list_accounts(*, access_token: str) -> list[str]:
    """List GBP accounts using the Account Management API v1."""
    url = f"{GBP_ACCOUNT_MGMT}/accounts"
    with httpx.Client(timeout=20) as client:
        r = client.get(url, headers=_auth_headers(access_token))
        r.raise_for_status()
        data: dict[str, Any] = r.json()
    accounts = data.get("accounts") or []
    out: list[str] = []
    for a in accounts:
        name = str(a.get("name") or "")
        if name.startswith("accounts/"):
            out.append(name.split("/", 1)[1])
        elif name:
            out.append(name)
    return out


def list_locations(*, access_token: str, account_id: str) -> list[GbpLocationInfo]:
    """List locations using the Business Information API v1."""
    url = f"{GBP_BUSINESS_INFO}/accounts/{account_id}/locations"
    params = {"readMask": "name,title,storeCode"}
    with httpx.Client(timeout=30) as client:
        r = client.get(url, headers=_auth_headers(access_token), params=params)
        r.raise_for_status()
        data: dict[str, Any] = r.json()

    locations = data.get("locations") or []
    out: list[GbpLocationInfo] = []
    for loc in locations:
        name = str(loc.get("name") or "")
        location_id = ""
        if "locations/" in name:
            location_id = name.rsplit("locations/", 1)[1].lstrip("/")
        if not location_id:
            location_id = str(loc.get("locationId") or name)
        location_name = loc.get("title") or loc.get("storeCode")
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
