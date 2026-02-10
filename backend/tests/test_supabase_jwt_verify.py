from __future__ import annotations

from unittest.mock import patch

import pytest

from app.core.supabase_jwt import SupabaseAuthError, verify_jwt


def test_verify_jwt_rejects_unknown_alg():
    with patch("app.core.supabase_jwt.jwt.get_unverified_header", return_value={"alg": "none", "kid": "k1"}):
        with pytest.raises(SupabaseAuthError, match="Unsupported JWT algorithm"):
            verify_jwt("token", jwks_url="https://example.com/.well-known/jwks.json")


def test_verify_jwt_rs256_decode_type_error_is_wrapped():
    with (
        patch("app.core.supabase_jwt.jwt.get_unverified_header", return_value={"alg": "RS256", "kid": "k1"}),
        patch("app.core.supabase_jwt.get_jwks", return_value={"keys": [{"kid": "k1"}]}),
        patch("app.core.supabase_jwt.jwt.PyJWK") as pyjwk,
        patch("app.core.supabase_jwt.jwt.decode", side_effect=TypeError("boom")),
    ):
        pyjwk.return_value.key = "dummy-public-key"
        with pytest.raises(SupabaseAuthError, match="JWT verification failed"):
            verify_jwt("token", jwks_url="https://example.com/.well-known/jwks.json")


def test_verify_jwt_es256_is_allowed():
    """ES256 tokens should be accepted when the JWK matches."""
    with (
        patch("app.core.supabase_jwt.jwt.get_unverified_header", return_value={"alg": "ES256", "kid": "k1"}),
        patch("app.core.supabase_jwt.get_jwks", return_value={"keys": [{"kid": "k1", "alg": "ES256"}]}),
        patch("app.core.supabase_jwt.jwt.PyJWK") as pyjwk,
        patch("app.core.supabase_jwt.jwt.decode", return_value={"sub": "user1"}),
    ):
        pyjwk.return_value.key = "dummy-ec-key"
        result = verify_jwt("token", jwks_url="https://example.com/.well-known/jwks.json")
        assert result == {"sub": "user1"}


def test_verify_jwt_rejects_jwk_alg_mismatch():
    """Reject tokens where the header alg does not match the JWK alg field."""
    with (
        patch("app.core.supabase_jwt.jwt.get_unverified_header", return_value={"alg": "RS256", "kid": "k1"}),
        patch("app.core.supabase_jwt.get_jwks", return_value={"keys": [{"kid": "k1", "alg": "ES256"}]}),
    ):
        with pytest.raises(SupabaseAuthError, match="JWK algorithm mismatch"):
            verify_jwt("token", jwks_url="https://example.com/.well-known/jwks.json")

