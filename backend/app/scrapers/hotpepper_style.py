from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from app.scrapers.http_client import get
from app.scrapers.selector_loader import load_selectors

_BRACKET_RE = re.compile(r"^.*?(?=【)")


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


def fetch_style_images(*, style_url: str) -> list[StyleImage]:
    selectors = load_selectors("hotpepper_style")
    img_sel = selectors.get("list", {}).get("image") or "img.bdImgGray"
    title_sel = selectors.get("list", {}).get("title") or "p.mT10.lh18 a"

    html = get(style_url, timeout=20).text

    soup = BeautifulSoup(html, "lxml")
    out: list[StyleImage] = []
    for img in soup.select(img_sel):
        if not isinstance(img, Tag):
            continue
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src:
            continue

        image_url = urljoin(style_url, src)

        # Find the detail page URL from the parent <a> tag
        page_url = style_url
        parent_a = img.find_parent("a")
        if parent_a and parent_a.get("href"):
            href = parent_a["href"]
            if "/style/" in href:
                page_url = urljoin(style_url, href)

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

    # de-dupe by image_url
    seen: set[str] = set()
    uniq: list[StyleImage] = []
    for x in out:
        if x.image_url in seen:
            continue
        seen.add(x.image_url)
        uniq.append(x)
    return uniq
