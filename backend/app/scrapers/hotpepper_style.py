from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup, Tag

from app.scrapers.http_client import get
from app.scrapers.pagination import parse_total_pages
from app.scrapers.selector_loader import load_selectors

logger = logging.getLogger(__name__)

_BRACKET_RE = re.compile(r"^.*?(?=【)")


def _strip_query(url: str) -> str:
    """Remove query string and fragment from a URL to get the full-resolution image."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


@dataclass(frozen=True)
class StyleImage:
    page_url: str
    image_url: str
    title: str | None


def _strip_salon_prefix(text: str) -> str:
    """Remove salon name prefix from alt text like 'SalonName 【actual title】'."""
    if not text:
        return text
    if "【" in text:
        return _BRACKET_RE.sub("", text).strip()
    return text


def _extract_styles_from_soup(
    soup: BeautifulSoup,
    base_url: str,
    img_sel: str,
    title_sel: str,
) -> list[StyleImage]:
    """Extract StyleImage items from a single page's BeautifulSoup."""
    out: list[StyleImage] = []
    for img in soup.select(img_sel):
        if not isinstance(img, Tag):
            continue
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src:
            continue

        image_url = _strip_query(urljoin(base_url, src))

        # Find the detail page URL from the parent <a> tag
        page_url = base_url
        parent_a = img.find_parent("a")
        if parent_a and parent_a.get("href"):
            href = parent_a["href"]
            if "/style/" in href:
                page_url = urljoin(base_url, href)

        # Try to get a clean title from the card's <p> tag
        title = None
        card = img.find_parent("div", class_="w156")
        if card:
            title_el = card.select_one(title_sel)
            if title_el:
                title = title_el.get_text(strip=True)

        # Fallback to alt attribute with salon prefix stripped
        if not title:
            alt = img.get("alt", "")
            if alt:
                title = _strip_salon_prefix(alt)

        out.append(
            StyleImage(
                page_url=page_url,
                image_url=image_url,
                title=title or None,
            )
        )
    return out


def fetch_style_images(*, style_url: str, max_pages: int = 160) -> list[StyleImage]:
    selectors = load_selectors("hotpepper_style")
    img_sel = selectors.get("list", {}).get("image") or "img.bdImgGray"
    title_sel = selectors.get("list", {}).get("title") or "p.mT10.lh18 a"

    html = get(style_url, timeout=20).text
    soup = BeautifulSoup(html, "lxml")

    total_pages = parse_total_pages(soup) or 1
    pages_to_fetch = min(total_pages, max_pages)

    out = _extract_styles_from_soup(soup, style_url, img_sel, title_sel)
    logger.info(
        "Style page 1/%d fetched (%d items) url=%s",
        pages_to_fetch, len(out), style_url,
    )

    for page_num in range(2, pages_to_fetch + 1):
        time.sleep(2)
        page_url = style_url.rstrip("/") + f"/PN{page_num}.html"
        try:
            html = get(page_url, timeout=20).text
        except httpx.HTTPError:
            logger.info("Style pagination stopped at page %d (HTTP error)", page_num)
            break
        soup = BeautifulSoup(html, "lxml")
        page_items = _extract_styles_from_soup(soup, page_url, img_sel, title_sel)
        if not page_items:
            break
        out.extend(page_items)
        logger.info("Style page %d/%d fetched (%d items)", page_num, pages_to_fetch, len(page_items))

    # de-dupe by image_url
    seen: set[str] = set()
    uniq: list[StyleImage] = []
    for x in out:
        if x.image_url in seen:
            continue
        seen.add(x.image_url)
        uniq.append(x)
    return uniq
