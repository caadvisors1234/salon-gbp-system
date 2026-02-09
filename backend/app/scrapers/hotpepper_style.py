from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.scrapers.http_client import get
from app.scrapers.selector_loader import load_selectors


@dataclass(frozen=True)
class StyleImage:
    page_url: str
    image_url: str
    title: str | None


def fetch_style_images(*, style_url: str) -> list[StyleImage]:
    selectors = load_selectors("hotpepper_style")
    img_sel = selectors.get("list", {}).get("image") or "img"

    html = get(style_url, timeout=20).text

    soup = BeautifulSoup(html, "lxml")
    out: list[StyleImage] = []
    for img in soup.select(img_sel):
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src:
            continue
        out.append(
            StyleImage(
                page_url=style_url,
                image_url=urljoin(style_url, src),
                title=img.get("alt"),
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
