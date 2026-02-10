from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt.exceptions import PyJWKError, PyJWTError

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

_SYMMETRIC_ALGS: frozenset[str] = frozenset({"HS256"})
_ASYMMETRIC_ALGS: frozenset[str] = frozenset({"RS256", "ES256"})
_ALLOWED_ALGS: frozenset[str] = _SYMMETRIC_ALGS | _ASYMMETRIC_ALGS

# NOTE: When calling jwt.decode(), we pass algorithms=[alg] (i.e. only the
# algorithm declared in the token header) instead of the full allowed set.
# The header alg has already been validated against _ALLOWED_ALGS above, and
# restricting to the single declared algorithm prevents algorithm-confusion
# attacks when the JWK omits its optional "alg" field (RFC 7517 §4.4).


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
    except (PyJWTError, ValueError, TypeError) as e:
        raise SupabaseAuthError("Invalid JWT header") from e

    alg = header.get("alg", "")
    kid = header.get("kid")

    if alg not in _ALLOWED_ALGS:
        # Reject unexpected algorithms (including "none") before calling jwt.decode().
        raise SupabaseAuthError("Unsupported JWT algorithm")

    # HS256: verify with symmetric secret
    if alg in _SYMMETRIC_ALGS:
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
                algorithms=[alg],
                audience=audience,
                issuer=issuer,
                options=options,
            )
        except (PyJWTError, ValueError, TypeError, KeyError) as e:
            raise SupabaseAuthError("JWT verification failed") from e

    # RS256 / ES256: verify with public key from JWKS
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

    if jwk.get("alg") and jwk["alg"] != alg:
        raise SupabaseAuthError("JWK algorithm mismatch")

    try:
        jwk_obj = jwt.PyJWK(jwk)
    except (PyJWKError, ValueError, TypeError, KeyError) as e:
        raise SupabaseAuthError("Failed to load public key from JWK") from e

    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
    }
    try:
        return jwt.decode(
            token,
            key=jwk_obj.key,
            algorithms=[alg],
            audience=audience,
            issuer=issuer,
            options=options,
        )
    except (PyJWTError, ValueError, TypeError, KeyError) as e:
        raise SupabaseAuthError("JWT verification failed") from e
