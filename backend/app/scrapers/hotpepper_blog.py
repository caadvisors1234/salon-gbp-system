from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup

from app.scrapers.http_client import get
from app.scrapers.selector_loader import load_selectors


@dataclass(frozen=True)
class BlogArticle:
    url: str
    title: str
    body_html: str
    image_urls: list[str]
    published_at: datetime | None


def _strip_query(url: str) -> str:
    """Remove query string and fragment from a URL to get the full-resolution image."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


_DATE_RE = re.compile(r"(\d{4})/(\d{1,2})/(\d{1,2})")


def _parse_blog_date(text: str) -> datetime | None:
    """Extract a datetime from HotPepper date text like '投稿日：2026/2/3'."""
    m = _DATE_RE.search(text)
    if not m:
        return None
    try:
        # Treat date-only values as UTC to avoid ambiguous / naive datetimes being
        # inserted into timezone-aware DB columns.
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc)
    except ValueError:
        return None


def fetch_blog_links(*, blog_url: str, max_pages: int = 2) -> list[str]:
    selectors = load_selectors("hotpepper_blog")
    link_sel = selectors.get("list", {}).get("article_link") or "a[href]"

    urls: list[str] = []
    seen: set[str] = set()

    for page_num in range(1, max_pages + 1):
        if page_num == 1:
            page_url = blog_url
        else:
            page_url = blog_url.rstrip("/") + f"/PN{page_num}.html"
            time.sleep(2)

        try:
            html = get(page_url, timeout=20).text
        except httpx.HTTPError:
            # HotPepper may return 4xx (e.g. 404) for non-existent PN pages.
            # Don't fail the whole scrape; stop paginating and keep what we got.
            if page_num > 1:
                break
            raise
        soup = _soup(html)
        page_links = 0
        for a in soup.select(link_sel):
            href = a.get("href")
            if not href:
                continue
            u = urljoin(page_url, href)
            if u not in seen:
                seen.add(u)
                urls.append(u)
                page_links += 1

        if page_links == 0:
            break

    return urls


def fetch_blog_article(*, url: str) -> BlogArticle:
    selectors = load_selectors("hotpepper_blog")
    title_sel = selectors.get("article", {}).get("title") or "h1, h2"
    body_sel = selectors.get("article", {}).get("body") or "article, body"
    images_sel = selectors.get("article", {}).get("images") or "img"
    published_sel = selectors.get("article", {}).get("published_at") or "time"

    html = get(url, timeout=20).text

    soup = _soup(html)
    title_el = soup.select_one(title_sel)
    title = title_el.get_text(strip=True) if title_el else ""

    body_el = soup.select_one(body_sel)
    body_html = str(body_el) if body_el else html

    image_urls: list[str] = []
    for img in soup.select(images_sel):
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src:
            continue
        image_urls.append(_strip_query(urljoin(url, src)))
    # de-dupe, keep order
    seen: set[str] = set()
    image_urls = [x for x in image_urls if not (x in seen or seen.add(x))]

    published_at = None
    pub_el = soup.select_one(published_sel)
    if pub_el:
        published_at = _parse_blog_date(pub_el.get_text(strip=True))

    return BlogArticle(url=url, title=title, body_html=body_html, image_urls=image_urls, published_at=published_at)
