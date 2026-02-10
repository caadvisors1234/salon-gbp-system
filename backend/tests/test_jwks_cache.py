from __future__ import annotations

import time
from unittest.mock import patch

from app.core.supabase_jwt import _cache, get_jwks


def _reset_cache():
    _cache.jwks = None
    _cache.fetched_at = 0.0


def test_get_jwks_normal_fetch():
    _reset_cache()
    fake_jwks = {"keys": [{"kid": "k1", "kty": "RSA"}]}
    with patch("app.core.supabase_jwt._fetch_jwks", return_value=fake_jwks):
        result = get_jwks("https://example.com/.well-known/jwks.json")
    assert result == fake_jwks
    assert _cache.jwks == fake_jwks


def test_get_jwks_fetch_empty_with_existing_cache_keeps_old():
    """When fetch returns empty keys but we have a cached version, keep the old one."""
    _reset_cache()
    old_jwks = {"keys": [{"kid": "k1", "kty": "RSA"}]}
    _cache.jwks = old_jwks
    _cache.fetched_at = time.time() - 700  # expired

    with patch("app.core.supabase_jwt._fetch_jwks", return_value={"keys": []}):
        result = get_jwks("https://example.com/.well-known/jwks.json")

    assert result == old_jwks
    assert _cache.jwks == old_jwks


def test_get_jwks_fetch_empty_without_existing_cache():
    """When fetch returns empty keys and no existing cache, accept empty."""
    _reset_cache()
    with patch("app.core.supabase_jwt._fetch_jwks", return_value={"keys": []}):
        result = get_jwks("https://example.com/.well-known/jwks.json")
    assert result == {"keys": []}


def test_get_jwks_cache_valid_returns_cached():
    _reset_cache()
    cached_jwks = {"keys": [{"kid": "k1", "kty": "RSA"}]}
    _cache.jwks = cached_jwks
    _cache.fetched_at = time.time()

    result = get_jwks("https://example.com/.well-known/jwks.json")
    assert result == cached_jwks
