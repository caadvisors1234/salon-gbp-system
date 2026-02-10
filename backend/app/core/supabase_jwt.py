from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import InvalidTokenError

logger = logging.getLogger(__name__)


class SupabaseAuthError(RuntimeError):
    pass


@dataclass
class _JWKSCache:
    jwks: dict[str, Any] | None = None
    fetched_at: float = 0.0
    ttl_sec: int = 600

    def is_valid(self) -> bool:
        return self.jwks is not None and (time.time() - self.fetched_at) < self.ttl_sec


_cache = _JWKSCache()


def _fetch_jwks(jwks_url: str) -> dict[str, Any]:
    if not jwks_url:
        return {"keys": []}
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(jwks_url)
            r.raise_for_status()
            data = r.json()
            logger.info("JWKS fetched successfully from %s, keys=%d", jwks_url, len(data.get("keys", [])))
            return data
    except httpx.HTTPError:
        logger.warning("JWKS fetch failed from %s", jwks_url)
        return {"keys": []}


def get_jwks(jwks_url: str) -> dict[str, Any]:
    if _cache.is_valid():
        return _cache.jwks or {}
    jwks = _fetch_jwks(jwks_url)
    keys = jwks.get("keys", [])
    if not keys and _cache.jwks and _cache.jwks.get("keys"):
        # Fetch returned empty keys but we have a valid previous cache.
        # Keep old keys and retry sooner (60s) instead of caching empty for 600s.
        logger.warning("JWKS fetch returned empty keys, keeping previous cache")
        _cache.fetched_at = time.time() - _cache.ttl_sec + 60
        return _cache.jwks
    _cache.jwks = jwks
    _cache.fetched_at = time.time()
    return jwks


def _find_jwk(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
    keys = jwks.get("keys", [])
    for k in keys:
        if k.get("kid") == kid:
            return k
    return None


def verify_jwt(
    token: str,
    *,
    jwks_url: str,
    jwt_secret: str = "",
    audience: str | None = None,
    issuer: str | None = None,
) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:  # noqa: BLE001
        raise SupabaseAuthError("Invalid JWT header") from e

    alg = header.get("alg", "")
    kid = header.get("kid")

    # HS256: verify with symmetric secret
    if alg == "HS256":
        if not jwt_secret:
            raise SupabaseAuthError("JWT uses HS256 but SUPABASE_JWT_SECRET is not configured")
        options = {
            "verify_aud": bool(audience),
            "verify_iss": bool(issuer),
        }
        try:
            return jwt.decode(
                token,
                key=jwt_secret,
                algorithms=["HS256"],
                audience=audience,
                issuer=issuer,
                options=options,
            )
        except InvalidTokenError as e:
            raise SupabaseAuthError("JWT verification failed") from e

    # RS256: verify with public key from JWKS
    if not kid:
        raise SupabaseAuthError("JWT header missing kid")

    jwks = get_jwks(jwks_url)
    jwk = _find_jwk(jwks, kid)
    if jwk is None:
        # Refresh cache once in case keys rotated.
        _cache.jwks = None
        jwks = get_jwks(jwks_url)
        jwk = _find_jwk(jwks, kid)
    if jwk is None:
        raise SupabaseAuthError("Public key not found for token kid")

    key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))

    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
    }
    try:
        return jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
            options=options,
        )
    except InvalidTokenError as e:
        raise SupabaseAuthError("JWT verification failed") from e
