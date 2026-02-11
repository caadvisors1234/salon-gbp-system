from __future__ import annotations

import json
from datetime import date

import httpx
import respx
from httpx import Response

import pytest

from app.services.gbp_client import (
    GBP_ACCOUNT_MGMT,
    GBP_BASE_V4,
    GBP_BUSINESS_INFO,
    GbpLocationInfo,
    list_accounts,
    list_locations,
    create_local_post,
    upload_media,
)


@respx.mock
def test_list_accounts_uses_account_mgmt_api():
    route = respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        return_value=Response(200, json={
            "accounts": [
                {"name": "accounts/123"},
                {"name": "accounts/456"},
            ]
        })
    )
    result = list_accounts(access_token="test-token")
    assert route.called
    assert result == ["123", "456"]
    assert "Bearer test-token" in route.calls[0].request.headers["authorization"]


@respx.mock
def test_list_accounts_empty():
    respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        return_value=Response(200, json={})
    )
    result = list_accounts(access_token="test-token")
    assert result == []


@respx.mock
def test_list_locations_uses_business_info_api():
    route = respx.get(f"{GBP_BUSINESS_INFO}/accounts/123/locations").mock(
        return_value=Response(200, json={
            "locations": [
                {"name": "accounts/123/locations/loc1", "title": "My Salon"},
                {"name": "accounts/123/locations/loc2", "storeCode": "SC001"},
            ]
        })
    )
    result = list_locations(access_token="test-token", account_id="123")
    assert route.called
    assert "readMask" in str(route.calls[0].request.url)
    assert len(result) == 2
    assert result[0] == GbpLocationInfo(account_id="123", location_id="loc1", location_name="My Salon")
    assert result[1] == GbpLocationInfo(account_id="123", location_id="loc2", location_name="SC001")


@respx.mock
def test_list_locations_empty():
    respx.get(f"{GBP_BUSINESS_INFO}/accounts/123/locations").mock(
        return_value=Response(200, json={})
    )
    result = list_locations(access_token="test-token", account_id="123")
    assert result == []


@respx.mock
def test_create_local_post_uses_v4():
    route = respx.post(f"{GBP_BASE_V4}/accounts/a1/locations/l1/localPosts").mock(
        return_value=Response(200, json={"name": "post/1"})
    )
    result = create_local_post(
        access_token="tok",
        account_id="a1",
        location_id="l1",
        summary="Hello",
        image_url=None,
        cta_type=None,
        cta_url=None,
        topic_type="STANDARD",
    )
    assert route.called
    assert result == {"name": "post/1"}


@respx.mock
def test_upload_media_uses_v4():
    route = respx.post(f"{GBP_BASE_V4}/accounts/a1/locations/l1/media").mock(
        return_value=Response(200, json={"name": "media/1"})
    )
    result = upload_media(
        access_token="tok",
        account_id="a1",
        location_id="l1",
        source_url="https://example.com/img.jpg",
        category="ADDITIONAL",
    )
    assert route.called
    assert result == {"name": "media/1"}


# --- Pagination tests ---


@respx.mock
def test_list_accounts_paginates():
    respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        side_effect=[
            Response(200, json={
                "accounts": [{"name": "accounts/1"}],
                "nextPageToken": "tok2",
            }),
            Response(200, json={
                "accounts": [{"name": "accounts/2"}, {"name": "accounts/3"}],
            }),
        ]
    )
    result = list_accounts(access_token="t")
    assert result == ["1", "2", "3"]


@respx.mock
def test_list_locations_paginates():
    respx.get(f"{GBP_BUSINESS_INFO}/accounts/a1/locations").mock(
        side_effect=[
            Response(200, json={
                "locations": [{"name": "accounts/a1/locations/L1", "title": "S1"}],
                "nextPageToken": "page2",
            }),
            Response(200, json={
                "locations": [{"name": "accounts/a1/locations/L2", "title": "S2"}],
            }),
        ]
    )
    result = list_locations(access_token="t", account_id="a1")
    assert len(result) == 2
    assert result[0] == GbpLocationInfo(account_id="a1", location_id="L1", location_name="S1")
    assert result[1] == GbpLocationInfo(account_id="a1", location_id="L2", location_name="S2")


@respx.mock
def test_list_accounts_respects_max_pages(monkeypatch):
    import app.services.gbp_client as mod
    monkeypatch.setattr(mod, "_MAX_PAGES", 3)

    respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        side_effect=[
            Response(200, json={"accounts": [{"name": "accounts/1"}], "nextPageToken": "t2"}),
            Response(200, json={"accounts": [{"name": "accounts/2"}], "nextPageToken": "t3"}),
            Response(200, json={"accounts": [{"name": "accounts/3"}], "nextPageToken": "t4"}),
            Response(200, json={"accounts": [{"name": "accounts/4"}]}),
        ]
    )
    result = list_accounts(access_token="t")
    # Should stop after 3 pages (the _MAX_PAGES limit), not fetch page 4
    assert result == ["1", "2", "3"]


@respx.mock
def test_list_accounts_sends_page_size():
    route = respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        return_value=Response(200, json={"accounts": []})
    )
    list_accounts(access_token="t")
    assert "pageSize=20" in str(route.calls[0].request.url)


@respx.mock
def test_list_locations_sends_page_size():
    route = respx.get(f"{GBP_BUSINESS_INFO}/accounts/a1/locations").mock(
        return_value=Response(200, json={"locations": []})
    )
    list_locations(access_token="t", account_id="a1")
    assert "pageSize=100" in str(route.calls[0].request.url)


@respx.mock
def test_list_accounts_error_on_second_page_raises():
    respx.get(f"{GBP_ACCOUNT_MGMT}/accounts").mock(
        side_effect=[
            Response(200, json={
                "accounts": [{"name": "accounts/1"}],
                "nextPageToken": "tok2",
            }),
            Response(500),
        ]
    )
    with pytest.raises(httpx.HTTPStatusError):
        list_accounts(access_token="t")


# --- OFFER event object tests ---


@respx.mock
def test_create_local_post_offer_includes_event():
    """OFFER投稿のリクエストボディにeventオブジェクトが含まれることを検証する。"""
    route = respx.post(f"{GBP_BASE_V4}/accounts/a1/locations/l1/localPosts").mock(
        return_value=Response(200, json={"name": "post/offer1"})
    )
    result = create_local_post(
        access_token="tok",
        account_id="a1",
        location_id="l1",
        summary="クーポン内容",
        image_url=None,
        cta_type=None,
        cta_url=None,
        topic_type="OFFER",
        offer_redeem_online_url="https://example.com/coupon",
        event_title="特典タイトル",
        event_start_date=date(2026, 2, 11),
        event_end_date=date(2026, 3, 11),
    )
    assert route.called
    assert result == {"name": "post/offer1"}

    body = json.loads(route.calls[0].request.content)
    assert body["topicType"] == "OFFER"
    assert "event" in body
    assert body["event"]["title"] == "特典タイトル"
    assert body["event"]["schedule"]["startDate"] == {"year": 2026, "month": 2, "day": 11}
    assert body["event"]["schedule"]["endDate"] == {"year": 2026, "month": 3, "day": 11}
    assert body["offer"] == {"redeemOnlineUrl": "https://example.com/coupon"}


@respx.mock
def test_create_local_post_standard_no_event():
    """STANDARD投稿のリクエストボディにeventオブジェクトが含まれないことを確認する。"""
    route = respx.post(f"{GBP_BASE_V4}/accounts/a1/locations/l1/localPosts").mock(
        return_value=Response(200, json={"name": "post/std1"})
    )
    create_local_post(
        access_token="tok",
        account_id="a1",
        location_id="l1",
        summary="通常投稿",
        image_url=None,
        cta_type=None,
        cta_url=None,
        topic_type="STANDARD",
    )
    assert route.called
    body = json.loads(route.calls[0].request.content)
    assert body["topicType"] == "STANDARD"
    assert "event" not in body
    assert "offer" not in body


def test_create_local_post_offer_without_event_fields_raises():
    """OFFER投稿でeventフィールドがすべて未設定の場合、ValueErrorが発生することを確認する。"""
    with pytest.raises(ValueError, match="OFFER post requires"):
        create_local_post(
            access_token="tok",
            account_id="a1",
            location_id="l1",
            summary="クーポン",
            image_url=None,
            cta_type=None,
            cta_url=None,
            topic_type="OFFER",
            offer_redeem_online_url="https://example.com/coupon",
        )


def test_create_local_post_offer_partial_event_fields_raises():
    """OFFER投稿でeventフィールドが一部のみ設定されている場合、ValueErrorが発生することを確認する。"""
    with pytest.raises(ValueError, match="incomplete event fields"):
        create_local_post(
            access_token="tok",
            account_id="a1",
            location_id="l1",
            summary="クーポン",
            image_url=None,
            cta_type=None,
            cta_url=None,
            topic_type="OFFER",
            event_title="タイトルのみ",
        )


@respx.mock
def test_create_local_post_offer_sanitizes_event_title():
    """OFFER投稿でevent_titleが改行を含む場合、サニタイズされることを検証する。"""
    route = respx.post(f"{GBP_BASE_V4}/accounts/a1/locations/l1/localPosts").mock(
        return_value=Response(200, json={"name": "post/offer3"})
    )
    long_title_with_newlines = "学割U24\n[全員]\n¥12,990\n" + "あ" * 100
    create_local_post(
        access_token="tok",
        account_id="a1",
        location_id="l1",
        summary="クーポン内容",
        image_url=None,
        cta_type=None,
        cta_url=None,
        topic_type="OFFER",
        offer_redeem_online_url="https://example.com/coupon",
        event_title=long_title_with_newlines,
        event_start_date=date(2026, 2, 11),
        event_end_date=date(2026, 3, 11),
    )
    assert route.called
    body = json.loads(route.calls[0].request.content)
    title = body["event"]["title"]
    assert "\n" not in title
    assert len(title) <= 58
