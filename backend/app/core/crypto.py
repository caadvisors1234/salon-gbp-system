from __future__ import annotations

import base64
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class CryptoError(RuntimeError):
    pass


def _b64url_decode(s: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(s.encode("utf-8"))
    except Exception as e:  # noqa: BLE001
        raise CryptoError("Invalid base64 value") from e


def _b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8")


@dataclass(frozen=True)
class EncPayload:
    version: str
    nonce: bytes
    ciphertext: bytes

    def to_compact(self) -> str:
        # v1:<b64(nonce|ciphertext)>
        raw = self.nonce + self.ciphertext
        return f"{self.version}:{_b64url_encode(raw)}"

    @classmethod
    def from_compact(cls, s: str) -> "EncPayload":
        try:
            version, b64 = s.split(":", 1)
        except ValueError as e:
            raise CryptoError("Invalid encrypted payload format") from e
        raw = _b64url_decode(b64)
        if len(raw) < 12:
            raise CryptoError("Invalid encrypted payload length")
        return cls(version=version, nonce=raw[:12], ciphertext=raw[12:])


def encrypt_str(plaintext: str, key_b64: str) -> str:
    if not key_b64:
        raise CryptoError("TOKEN_ENC_KEY_B64 is not configured")
    key = _b64url_decode(key_b64)
    if len(key) != 32:
        raise CryptoError("TOKEN_ENC_KEY_B64 must decode to 32 bytes")
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return EncPayload(version="v1", nonce=nonce, ciphertext=ct).to_compact()


def decrypt_str(payload: str, key_b64: str) -> str:
    if not key_b64:
        raise CryptoError("TOKEN_ENC_KEY_B64 is not configured")
    key = _b64url_decode(key_b64)
    if len(key) != 32:
        raise CryptoError("TOKEN_ENC_KEY_B64 must decode to 32 bytes")
    p = EncPayload.from_compact(payload)
    if p.version != "v1":
        raise CryptoError(f"Unsupported encrypted payload version: {p.version}")
    aesgcm = AESGCM(key)
    pt = aesgcm.decrypt(p.nonce, p.ciphertext, None)
    return pt.decode("utf-8")

