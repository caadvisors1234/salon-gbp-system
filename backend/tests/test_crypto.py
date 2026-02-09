import base64
import os

from app.core.crypto import decrypt_str, encrypt_str


def test_encrypt_decrypt_roundtrip():
    key_b64 = base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")
    pt = "hello world"
    ct = encrypt_str(pt, key_b64)
    assert ct.startswith("v1:")
    out = decrypt_str(ct, key_b64)
    assert out == pt

