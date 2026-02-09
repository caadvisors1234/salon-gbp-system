from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.scrapers.http_client import get
from app.scrapers.selector_loader import load_selectors


@dataclass(frozen=True)
class CouponItem:
    source_id: str
    title: str
    body_text: str
    url: str


def fetch_coupons(*, coupon_url: str) -> list[CouponItem]:
    selectors = load_selectors("hotpepper_coupon")
    item_sel = selectors.get("list", {}).get("coupon_item") or "li"
    title_sel = selectors.get("list", {}).get("title") or "h3"
    body_sel = selectors.get("list", {}).get("body") or "p"

    html = get(coupon_url, timeout=20).text

    soup = BeautifulSoup(html, "lxml")
    out: list[CouponItem] = []
    for item in soup.select(item_sel):
        t = item.select_one(title_sel)
        b = item.select_one(body_sel)
        title = t.get_text(strip=True) if t else ""
        body = b.get_text("\n", strip=True) if b else ""
        # If this coupon has a link, use it; otherwise fall back to list URL.
        a = item.find("a")
        href = a.get("href") if a else None
        url = urljoin(coupon_url, href) if href else coupon_url
        source_id = url
        if not title and not body:
            continue
        out.append(CouponItem(source_id=source_id, title=title, body_text=body, url=url))
    # de-dupe by source_id
    seen: set[str] = set()
    uniq: list[CouponItem] = []
    for x in out:
        if x.source_id in seen:
            continue
        seen.add(x.source_id)
        uniq.append(x)
    return uniq
