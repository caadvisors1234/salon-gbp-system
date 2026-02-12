from __future__ import annotations

from unittest.mock import patch

import httpx
import pytest
import respx

from app.scrapers.http_client import get

ROBOTS_URL = "https://beauty.hotpepper.jp/robots.txt"
ROBOTS_BODY = "User-agent: *\nAllow: /\n"
TEST_URL = "https://beauty.hotpepper.jp/slnH000000001/blog/"


class TestGetRetry:
    @respx.mock
    def test_success_on_first_try(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        respx.get(TEST_URL).mock(return_value=httpx.Response(200, text="OK"))
        r = get(TEST_URL)
        assert r.status_code == 200

    @respx.mock
    def test_retries_on_timeout_then_succeeds(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.ReadTimeout("The read operation timed out"),
            httpx.Response(200, text="OK"),
        ]
        with patch("app.scrapers.http_client.time.sleep"):
            r = get(TEST_URL, max_retries=3)
        assert r.status_code == 200
        assert route.call_count == 2

    @respx.mock
    def test_retries_on_connect_error_then_succeeds(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.ConnectError("Connection refused"),
            httpx.Response(200, text="OK"),
        ]
        with patch("app.scrapers.http_client.time.sleep"):
            r = get(TEST_URL, max_retries=3)
        assert r.status_code == 200

    @respx.mock
    def test_retries_on_500_then_succeeds(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.Response(500, text="Internal Server Error", request=httpx.Request("GET", TEST_URL)),
            httpx.Response(200, text="OK"),
        ]
        with patch("app.scrapers.http_client.time.sleep"):
            r = get(TEST_URL, max_retries=3)
        assert r.status_code == 200

    @respx.mock
    def test_raises_after_max_retries_exhausted(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.ReadTimeout("timeout 1"),
            httpx.ReadTimeout("timeout 2"),
            httpx.ReadTimeout("timeout 3"),
        ]
        with patch("app.scrapers.http_client.time.sleep"):
            with pytest.raises(httpx.ReadTimeout):
                get(TEST_URL, max_retries=3)
        assert route.call_count == 3

    @respx.mock
    def test_no_retry_on_404(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.mock(
            return_value=httpx.Response(404, text="Not Found", request=httpx.Request("GET", TEST_URL))
        )
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            get(TEST_URL, max_retries=3)
        assert exc_info.value.response.status_code == 404
        assert route.call_count == 1

    @respx.mock
    def test_backoff_sleep_durations(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.ReadTimeout("timeout 1"),
            httpx.ReadTimeout("timeout 2"),
            httpx.Response(200, text="OK"),
        ]
        with patch("app.scrapers.http_client.random.uniform", return_value=0), \
             patch("app.scrapers.http_client.time.sleep") as mock_sleep:
            get(TEST_URL, max_retries=3)
        # Backoff base: 5 * 2^0 = 5, 5 * 2^1 = 10 (jitter pinned to 0)
        assert mock_sleep.call_count == 2
        assert mock_sleep.call_args_list[0][0][0] == 5
        assert mock_sleep.call_args_list[1][0][0] == 10

    @respx.mock
    def test_retries_on_429_then_succeeds(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        route = respx.get(TEST_URL)
        route.side_effect = [
            httpx.Response(429, text="Too Many Requests", request=httpx.Request("GET", TEST_URL)),
            httpx.Response(200, text="OK"),
        ]
        with patch("app.scrapers.http_client.time.sleep"):
            r = get(TEST_URL, max_retries=3)
        assert r.status_code == 200
        assert route.call_count == 2
