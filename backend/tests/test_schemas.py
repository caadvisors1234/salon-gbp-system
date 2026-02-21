"""Test Literal type validation on schema status/severity fields."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.posts import PostListItem
from app.schemas.media_uploads import MediaUploadListItem
from app.schemas.alerts import AlertResponse
from app.schemas.gbp import GbpConnectionResponse
from app.schemas.instagram import InstagramAccountResponse, InstagramAccountCreateRequest, InstagramAccountPatchRequest


_NOW = datetime.now(tz=timezone.utc)
_UUID = uuid.uuid4()


class TestPostListItem:
    def _base(self, **overrides):
        defaults = dict(
            id=_UUID, salon_id=_UUID, gbp_location_id=_UUID, source_content_id=_UUID,
            post_type="STANDARD", status="pending", summary_final="test", created_at=_NOW,
        )
        defaults.update(overrides)
        return defaults

    def test_valid_status(self):
        for s in ("pending", "queued", "posting", "posted", "failed", "skipped"):
            PostListItem(**self._base(status=s))

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            PostListItem(**self._base(status="unknown"))

    def test_valid_post_type(self):
        for t in ("STANDARD", "OFFER", "EVENT"):
            PostListItem(**self._base(post_type=t))

    def test_invalid_post_type(self):
        with pytest.raises(ValidationError):
            PostListItem(**self._base(post_type="PROMO"))


class TestMediaUploadListItem:
    def _base(self, **overrides):
        defaults = dict(
            id=_UUID, salon_id=_UUID, gbp_location_id=_UUID, source_content_id=_UUID,
            media_asset_id=_UUID, media_format="PHOTO", category="ADDITIONAL",
            status="pending", source_image_url="https://example.com/img.jpg", created_at=_NOW,
        )
        defaults.update(overrides)
        return defaults

    def test_valid_status(self):
        for s in ("pending", "queued", "uploading", "uploaded", "failed", "skipped"):
            MediaUploadListItem(**self._base(status=s))

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            MediaUploadListItem(**self._base(status="done"))

    def test_valid_media_format(self):
        for f in ("PHOTO", "VIDEO"):
            MediaUploadListItem(**self._base(media_format=f))

    def test_invalid_media_format(self):
        with pytest.raises(ValidationError):
            MediaUploadListItem(**self._base(media_format="GIF"))


class TestAlertResponse:
    def _base(self, **overrides):
        defaults = dict(
            id=_UUID, severity="info", alert_type="test", message="test",
            status="open", created_at=_NOW,
        )
        defaults.update(overrides)
        return defaults

    def test_valid_severity(self):
        for s in ("info", "warning", "critical"):
            AlertResponse(**self._base(severity=s))

    def test_invalid_severity(self):
        with pytest.raises(ValidationError):
            AlertResponse(**self._base(severity="fatal"))

    def test_valid_alert_status(self):
        for s in ("open", "acked"):
            AlertResponse(**self._base(status=s))

    def test_invalid_alert_status(self):
        with pytest.raises(ValidationError):
            AlertResponse(**self._base(status="closed"))


class TestGbpConnectionResponse:
    def test_valid_status(self):
        for s in ("active", "expired", "revoked"):
            GbpConnectionResponse(
                id=_UUID, google_account_email="a@b.com",
                token_expires_at=_NOW, status=s,
            )

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            GbpConnectionResponse(
                id=_UUID, google_account_email="a@b.com",
                token_expires_at=_NOW, status="disabled",
            )


class TestInstagramSchemas:
    def test_valid_account_type_response(self):
        for t in ("official", "staff"):
            InstagramAccountResponse(
                id=_UUID, salon_id=_UUID, ig_user_id="123", ig_username="test",
                account_type=t, token_expires_at=_NOW, is_active=True, sync_hashtags=False,
            )

    def test_invalid_account_type_response(self):
        with pytest.raises(ValidationError):
            InstagramAccountResponse(
                id=_UUID, salon_id=_UUID, ig_user_id="123", ig_username="test",
                account_type="admin", token_expires_at=_NOW, is_active=True, sync_hashtags=False,
            )

    def test_valid_account_type_create(self):
        InstagramAccountCreateRequest(
            ig_user_id="123", ig_username="test", account_type="official",
            access_token="a" * 20,
        )

    def test_invalid_account_type_create(self):
        with pytest.raises(ValidationError):
            InstagramAccountCreateRequest(
                ig_user_id="123", ig_username="test", account_type="bot",
                access_token="a" * 20,
            )

    def test_valid_account_type_patch(self):
        InstagramAccountPatchRequest(account_type="staff")

    def test_invalid_account_type_patch(self):
        with pytest.raises(ValidationError):
            InstagramAccountPatchRequest(account_type="admin")
