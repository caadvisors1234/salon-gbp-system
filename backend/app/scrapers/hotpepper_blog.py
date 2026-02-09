from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

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


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def fetch_blog_links(*, blog_url: str) -> list[str]:
    selectors = load_selectors("hotpepper_blog")
    link_sel = selectors.get("list", {}).get("article_link") or "a[href]"
    html = get(blog_url, timeout=20).text
    soup = _soup(html)
    urls: list[str] = []
    for a in soup.select(link_sel):
        href = a.get("href")
        if not href:
            continue
        u = urljoin(blog_url, href)
        if u not in urls:
            urls.append(u)
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
        image_urls.append(urljoin(url, src))
    # de-dupe, keep order
    seen: set[str] = set()
    image_urls = [x for x in image_urls if not (x in seen or seen.add(x))]

    published_at = None
    pub_el = soup.select_one(published_sel)
    if pub_el:
        # HotPepper date formats vary; store raw text for now.
        _ = pub_el.get_text(strip=True)
        published_at = None

    return BlogArticle(url=url, title=title, body_html=body_html, image_urls=image_urls, published_at=published_at)
