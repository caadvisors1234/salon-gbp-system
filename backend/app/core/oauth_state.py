from __future__ import annotations

from typing import Any

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


class OAuthStateError(RuntimeError):
    pass


def _serializer(secret: str) -> URLSafeTimedSerializer:
    if not secret:
        raise OAuthStateError("OAUTH_STATE_SECRET is not configured")
    return URLSafeTimedSerializer(secret_key=secret, salt="oauth-state")


def create_state(data: dict[str, Any], secret: str) -> str:
    return _serializer(secret).dumps(data)


def load_state(state: str, secret: str, max_age_sec: int = 600) -> dict[str, Any]:
    try:
        return _serializer(secret).loads(state, max_age=max_age_sec)
    except SignatureExpired as e:
        raise OAuthStateError("OAuth state expired") from e
    except BadSignature as e:
        raise OAuthStateError("Invalid OAuth state") from e

