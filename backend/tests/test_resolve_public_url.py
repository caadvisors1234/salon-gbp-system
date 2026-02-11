"""Tests for _resolve_public_url helper in worker tasks."""

from __future__ import annotations

import importlib
import sys
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock


def _import_resolve_public_url():
    """Import _resolve_public_url while stubbing heavy dependencies."""
    _stubs = [
        "celery",
        "celery.exceptions",
        "app.worker.celery_app",
        "app.db.session",
        "app.services.gbp_client",
        "app.services.alerts",
        "app.services.gbp_tokens",
        "app.services.meta_oauth",
        "app.services.media_storage",
        "app.worker.scraper_helpers",
        "app.scrapers.hotpepper_blog",
        "app.scrapers.hotpepper_coupon",
        "app.scrapers.hotpepper_style",
        "app.scrapers.text_transform",
    ]
    saved = {name: sys.modules.pop(name, None) for name in _stubs}
    # Also remove tasks itself so it re-imports cleanly
    saved["app.worker.tasks"] = sys.modules.pop("app.worker.tasks", None)

    mock_celery_app = MagicMock()
    mock_celery_app.task = lambda *a, **kw: (lambda fn: fn)

    for name in _stubs:
        if name == "app.worker.celery_app":
            sys.modules[name] = MagicMock(celery_app=mock_celery_app)
        else:
            sys.modules[name] = MagicMock()

    try:
        mod = importlib.import_module("app.worker.tasks")
        return mod._resolve_public_url
    finally:
        # Restore original sys.modules state
        for name in _stubs + ["app.worker.tasks"]:
            sys.modules.pop(name, None)
            if saved.get(name) is not None:
                sys.modules[name] = saved[name]


_resolve_public_url = _import_resolve_public_url()


def _make_asset(public_url: str, source_url: str | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        public_url=public_url,
        source_url=source_url,
    )


def test_production_url_returned_as_is():
    asset = _make_asset("https://app.example.com/media/abc.jpg")
    assert _resolve_public_url(asset) == "https://app.example.com/media/abc.jpg"


def test_localhost_falls_back_to_source_url():
    asset = _make_asset(
        "http://localhost:8080/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_127_0_0_1_falls_back_to_source_url():
    asset = _make_asset(
        "http://127.0.0.1:8080/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_ipv6_loopback_falls_back_to_source_url():
    asset = _make_asset(
        "http://[::1]:8080/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_private_ip_192_168_falls_back():
    asset = _make_asset(
        "http://192.168.1.100:8080/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_private_ip_10_falls_back():
    asset = _make_asset(
        "http://10.0.0.5/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_private_ip_172_falls_back():
    asset = _make_asset(
        "http://172.17.0.2/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_public_ip_172_1_not_treated_as_private():
    asset = _make_asset(
        "http://172.1.2.3/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "http://172.1.2.3/media/abc.jpg"


def test_public_ip_172_32_not_treated_as_private():
    asset = _make_asset(
        "http://172.32.0.1/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg",
    )
    assert _resolve_public_url(asset) == "http://172.32.0.1/media/abc.jpg"


def test_source_url_query_params_stripped():
    asset = _make_asset(
        "http://localhost:8080/media/abc.jpg",
        "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg?impolicy=HPB_policy_default&w=154&h=205",
    )
    assert _resolve_public_url(asset) == "https://imgbp.hotp.jp/CSP/IMG_SRC/salon/abc.jpg"


def test_localhost_without_source_url_returns_none():
    asset = _make_asset("http://localhost:8080/media/abc.jpg", source_url=None)
    assert _resolve_public_url(asset) is None


def test_private_ip_without_source_url_returns_none():
    asset = _make_asset("http://192.168.1.100/media/abc.jpg", source_url=None)
    assert _resolve_public_url(asset) is None
