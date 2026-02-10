from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import Settings


class SupabaseAdminError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message
        super().__init__(message)


class SupabaseUserAlreadyExistsError(SupabaseAdminError):
    def __init__(self) -> None:
        super().__init__(422, "User already registered")


@dataclass(frozen=True)
class SupabaseUser:
    id: str
    email: str


def _headers(settings: Settings) -> dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


def _base_url(settings: Settings) -> str:
    return settings.supabase_url.rstrip("/")


def create_user(
    settings: Settings,
    *,
    email: str,
    password: str | None = None,
    user_metadata: dict[str, str] | None = None,
) -> SupabaseUser:
    body: dict[str, object] = {
        "email": email,
        "email_confirm": True,
    }
    if password:
        body["password"] = password
    if user_metadata:
        body["user_metadata"] = user_metadata

    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(
                f"{_base_url(settings)}/auth/v1/admin/users",
                headers=_headers(settings),
                json=body,
            )
    except httpx.HTTPError as exc:
        raise SupabaseAdminError(0, f"Supabase Admin API request failed: {exc}") from exc

    if r.status_code == 422:
        data = r.json()
        msg = data.get("msg", "") or data.get("message", "")
        if "already" in msg.lower():
            raise SupabaseUserAlreadyExistsError()
        raise SupabaseAdminError(422, msg or "Unprocessable entity")

    if r.status_code >= 400:
        detail = ""
        try:
            data = r.json()
            detail = data.get("msg", "") or data.get("message", "") or str(data)
        except Exception:
            detail = r.text
        raise SupabaseAdminError(r.status_code, detail)

    payload = r.json()
    return SupabaseUser(id=payload["id"], email=payload.get("email", email))


def delete_user(settings: Settings, *, user_id: str) -> None:
    try:
        with httpx.Client(timeout=15) as client:
            r = client.delete(
                f"{_base_url(settings)}/auth/v1/admin/users/{user_id}",
                headers=_headers(settings),
            )
    except httpx.HTTPError as exc:
        raise SupabaseAdminError(0, f"Supabase Admin API request failed: {exc}") from exc

    # 404 means user was already deleted — treat as success for idempotency
    if r.status_code == 404:
        return

    if r.status_code >= 400:
        detail = ""
        try:
            data = r.json()
            detail = data.get("msg", "") or data.get("message", "") or str(data)
        except Exception:
            detail = r.text
        raise SupabaseAdminError(r.status_code, detail)


def get_user_by_email(settings: Settings, *, email: str) -> SupabaseUser | None:
    # WARNING: Supabase GoTrue Admin API does not support server-side email filtering.
    # This function scans all users page-by-page (up to 50k users). For large user bases
    # this will be slow. Consider caching or using a direct DB query if performance is critical.
    url = f"{_base_url(settings)}/auth/v1/admin/users"
    email_lc = email.lower()
    per_page = 1000
    page = 1
    max_pages = 50

    with httpx.Client(timeout=15) as client:
        for _ in range(max_pages):
            try:
                r = client.get(
                    url,
                    headers=_headers(settings),
                    params={"page": page, "per_page": per_page},
                )
            except httpx.HTTPError as exc:
                raise SupabaseAdminError(0, f"Supabase Admin API request failed: {exc}") from exc

            if r.status_code >= 400:
                detail = ""
                try:
                    data = r.json()
                    detail = data.get("msg", "") or data.get("message", "") or str(data)
                except Exception:
                    detail = r.text
                raise SupabaseAdminError(r.status_code, detail)

            payload = r.json()
            users = payload.get("users", [])
            for u in users:
                if u.get("email", "").lower() == email_lc:
                    return SupabaseUser(id=u["id"], email=u["email"])

            next_page = payload.get("next_page") or payload.get("nextPage")
            if next_page is not None:
                try:
                    next_page_i = int(next_page)
                except Exception:
                    next_page_i = None
                if next_page_i is not None and next_page_i > page:
                    page = next_page_i
                    continue

            if not users or len(users) < per_page:
                break
            page += 1
    return None
