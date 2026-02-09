from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

import httpx
import pytest
import respx

from app.scrapers.hotpepper_blog import _parse_blog_date, fetch_blog_article, fetch_blog_links
from app.scrapers.hotpepper_coupon import fetch_coupons
from app.scrapers.hotpepper_style import _strip_salon_prefix, fetch_style_images

FIXTURES = Path(__file__).parent / "fixtures"

BASE = "https://beauty.hotpepper.jp/slnH000000001"
ROBOTS_URL = "https://beauty.hotpepper.jp/robots.txt"
ROBOTS_BODY = "User-agent: *\nAllow: /\n"


def _read_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


# ──────────────────────────────────────────────
# Blog date parser
# ──────────────────────────────────────────────


class TestParseBlogDate:
    def test_standard_format(self):
        assert _parse_blog_date("投稿日：2026/2/3") == datetime(2026, 2, 3, tzinfo=timezone.utc)

    def test_zero_padded(self):
        assert _parse_blog_date("投稿日：2026/02/03") == datetime(2026, 2, 3, tzinfo=timezone.utc)

    def test_no_match(self):
        assert _parse_blog_date("日付なし") is None

    def test_empty_string(self):
        assert _parse_blog_date("") is None

    def test_date_only(self):
        assert _parse_blog_date("2025/12/31") == datetime(2025, 12, 31, tzinfo=timezone.utc)

    def test_invalid_date(self):
        assert _parse_blog_date("2026/13/45") is None


# ──────────────────────────────────────────────
# Blog link fetching
# ──────────────────────────────────────────────


class TestFetchBlogLinks:
    @respx.mock
    def test_single_page(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        blog_url = f"{BASE}/blog/"
        respx.get(blog_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list.html"))
        )
        links = fetch_blog_links(blog_url=blog_url, max_pages=1)
        assert len(links) == 3
        assert all("/blog/bid" in link for link in links)

    @respx.mock
    def test_pagination(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        blog_url = f"{BASE}/blog/"
        respx.get(blog_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list.html"))
        )
        respx.get(f"{blog_url}PN2.html").mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list_page2.html"))
        )
        with patch("app.scrapers.hotpepper_blog.time.sleep"):
            links = fetch_blog_links(blog_url=blog_url, max_pages=2)
        assert len(links) == 5

    @respx.mock
    def test_pn_404_stops_pagination_without_failing(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        blog_url = f"{BASE}/blog/"
        respx.get(blog_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list.html"))
        )
        pn2 = f"{blog_url}PN2.html"
        respx.get(pn2).mock(
            return_value=httpx.Response(404, text="Not Found", request=httpx.Request("GET", pn2))
        )
        with patch("app.scrapers.hotpepper_blog.time.sleep"):
            links = fetch_blog_links(blog_url=blog_url, max_pages=2)
        assert len(links) == 3

    @respx.mock
    def test_dedup_across_pages(self):
        """Links appearing on both pages should not be duplicated."""
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        blog_url = f"{BASE}/blog/"
        # Page 2 has the same links as page 1
        respx.get(blog_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list.html"))
        )
        respx.get(f"{blog_url}PN2.html").mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_list.html"))
        )
        with patch("app.scrapers.hotpepper_blog.time.sleep"):
            links = fetch_blog_links(blog_url=blog_url, max_pages=2)
        assert len(links) == 3

    @respx.mock
    def test_empty_page_stops_pagination(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        blog_url = f"{BASE}/blog/"
        empty_html = "<html><body></body></html>"
        respx.get(blog_url).mock(return_value=httpx.Response(200, text=empty_html))
        links = fetch_blog_links(blog_url=blog_url, max_pages=3)
        assert len(links) == 0


# ──────────────────────────────────────────────
# Blog article fetching
# ──────────────────────────────────────────────


class TestFetchBlogArticle:
    @respx.mock
    def test_extracts_title_body_images_date(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        article_url = f"{BASE}/blog/bid001.html"
        respx.get(article_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("blog_article.html"))
        )
        article = fetch_blog_article(url=article_url)

        assert article.title == "春のヘアカラー特集"
        assert "ピンクベージュ" in article.body_html
        assert article.published_at == datetime(2026, 2, 3, tzinfo=timezone.utc)

        # Only images inside dl.blogDtlInner should be captured
        assert len(article.image_urls) == 2
        assert all("/images/blog/" in u for u in article.image_urls)
        # Logo and tracking pixel should NOT be included
        assert not any("/images/logo" in u for u in article.image_urls)
        assert not any("/images/tracking" in u for u in article.image_urls)


# ──────────────────────────────────────────────
# Salon name stripping
# ──────────────────────────────────────────────


class TestStripSalonPrefix:
    def test_strips_prefix(self):
        assert _strip_salon_prefix("Salon ABC 【ナチュラルボブ】") == "【ナチュラルボブ】"

    def test_no_brackets(self):
        assert _strip_salon_prefix("Plain title no brackets") == "Plain title no brackets"

    def test_empty_string(self):
        assert _strip_salon_prefix("") == ""

    def test_brackets_only(self):
        assert _strip_salon_prefix("【タイトル】") == "【タイトル】"

    def test_romanized_salon_name(self):
        assert _strip_salon_prefix("Hair Make EARTH 【ショートボブ】") == "【ショートボブ】"


# ──────────────────────────────────────────────
# Style image fetching
# ──────────────────────────────────────────────


class TestFetchStyleImages:
    @respx.mock
    def test_fetches_only_style_images(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        style_url = f"{BASE}/style/"
        respx.get(style_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("style_list.html"))
        )
        images = fetch_style_images(style_url=style_url)

        # Should only get 3 bdImgGray images, not logo/banner
        assert len(images) == 3

    @respx.mock
    def test_clean_titles(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        style_url = f"{BASE}/style/"
        respx.get(style_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("style_list.html"))
        )
        images = fetch_style_images(style_url=style_url)

        titles = [img.title for img in images]
        assert "ナチュラルボブ" in titles
        assert "レイヤーカット" in titles
        assert "ハイライトカラー" in titles
        # Salon name should NOT appear in any title
        for t in titles:
            assert "Salon ABC" not in (t or "")

    @respx.mock
    def test_detail_urls(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        style_url = f"{BASE}/style/"
        respx.get(style_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("style_list.html"))
        )
        images = fetch_style_images(style_url=style_url)

        # Each image should have a detail page URL
        for img in images:
            assert "/style/L" in img.page_url


# ──────────────────────────────────────────────
# Coupon fetching
# ──────────────────────────────────────────────


class TestFetchCoupons:
    @respx.mock
    def test_extracts_coupons_from_tables(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        # Only 1 page to avoid page2 request
        coupons = fetch_coupons(coupon_url=coupon_url, max_pages=1)

        assert len(coupons) == 3

    @respx.mock
    def test_coupon_id_extraction(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        coupons = fetch_coupons(coupon_url=coupon_url, max_pages=1)

        source_ids = [c.source_id for c in coupons]
        assert "CP00000006033834" in source_ids
        assert "CP00000006033835" in source_ids
        assert "CP00000006033836" in source_ids

    @respx.mock
    def test_coupon_title_and_price(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        coupons = fetch_coupons(coupon_url=coupon_url, max_pages=1)

        first = coupons[0]
        assert first.title == "カット＋カラー"
        assert "¥8,800→¥6,600" in first.body_text
        assert "[全員]" in first.body_text

    @respx.mock
    def test_coupon_body_includes_label(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        coupons = fetch_coupons(coupon_url=coupon_url, max_pages=1)

        labels_in_body = [c.body_text.split("\n")[0] for c in coupons]
        assert "[全員]" in labels_in_body
        assert "[新規]" in labels_in_body
        assert "[再来]" in labels_in_body

    @respx.mock
    def test_pagination(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        respx.get(f"{coupon_url}PN2.html").mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list_page2.html"))
        )
        with patch("app.scrapers.hotpepper_coupon.time.sleep"):
            coupons = fetch_coupons(coupon_url=coupon_url, max_pages=2)
        # Page 1 has 3, page 2 is empty → stops
        assert len(coupons) == 3

    @respx.mock
    def test_pn_404_stops_pagination_without_failing(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        respx.get(coupon_url).mock(
            return_value=httpx.Response(200, text=_read_fixture("coupon_list.html"))
        )
        pn2 = f"{coupon_url}PN2.html"
        respx.get(pn2).mock(
            return_value=httpx.Response(404, text="Not Found", request=httpx.Request("GET", pn2))
        )
        with patch("app.scrapers.hotpepper_coupon.time.sleep"):
            coupons = fetch_coupons(coupon_url=coupon_url, max_pages=2)
        assert len(coupons) == 3

    @respx.mock
    def test_empty_page_stops_early(self):
        respx.get(ROBOTS_URL).mock(return_value=httpx.Response(200, text=ROBOTS_BODY))
        coupon_url = f"{BASE}/coupon/"
        empty_html = "<html><body></body></html>"
        respx.get(coupon_url).mock(return_value=httpx.Response(200, text=empty_html))
        coupons = fetch_coupons(coupon_url=coupon_url, max_pages=3)
        assert len(coupons) == 0

    def test_fallback_source_id_is_deterministic_across_processes(self):
        backend_dir = Path(__file__).resolve().parents[1]

        def _run(seed: str) -> str:
            env = os.environ.copy()
            env["PYTHONHASHSEED"] = seed
            env["PYTHONPATH"] = str(backend_dir)
            code = (
                "from app.scrapers.hotpepper_coupon import _fallback_source_id\n"
                "print(_fallback_source_id(title='T', label='L', price='P', desc='D', cond='C'))\n"
            )
            r = subprocess.run(
                [sys.executable, "-c", code],
                cwd=str(backend_dir),
                env=env,
                capture_output=True,
                text=True,
                check=True,
            )
            return r.stdout.strip()

        a = _run("1")
        b = _run("2")
        assert a == b
        assert a.startswith("hp_coupon_")
