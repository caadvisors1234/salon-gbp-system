from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

from app.scrapers.http_client import get
from app.scrapers.pagination import parse_total_pages
from app.scrapers.selector_loader import load_selectors

logger = logging.getLogger(__name__)

_COUPON_ID_RE = re.compile(r"couponId=(CP\d+)")


@dataclass(frozen=True)
class CouponItem:
    source_id: str
    title: str
    body_text: str
    url: str


def _fallback_source_id(*, title: str, label: str, price: str, desc: str, cond: str) -> str:
    # NOTE: Don't use Python's built-in hash(); it's randomized per process unless
    # PYTHONHASHSEED is fixed, which breaks stable identifiers / de-duplication.
    def _norm(s: str) -> str:
        return re.sub(r"\s+", " ", s).strip()

    payload = {
        "cond": _norm(cond),
        "desc": _norm(desc),
        "label": _norm(label),
        "price": _norm(price),
        "title": _norm(title),
    }
    digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    # 64-bit prefix is plenty for our scale and keeps the ID compact.
    return f"hp_coupon_{digest[:16]}"


def fetch_coupons(*, coupon_url: str, max_pages: int = 20) -> list[CouponItem]:
    selectors = load_selectors("hotpepper_coupon")
    item_sel = selectors.get("list", {}).get("coupon_item") or "table.couponTable"
    title_sel = selectors.get("list", {}).get("title") or "p.couponMenuName"
    price_sel = selectors.get("list", {}).get("price") or "p.couponMenuPrice"
    desc_sel = selectors.get("list", {}).get("description") or "p.couponDescription"
    cond_sel = selectors.get("list", {}).get("conditions") or "dl.couponConditionsList"
    label_sel = selectors.get("list", {}).get("label") or "td[class^='couponLabel']"

    out: list[CouponItem] = []
    seen: set[str] = set()

    # Fetch page 1 to determine total pages dynamically
    html = get(coupon_url, timeout=20).text
    first_soup = BeautifulSoup(html, "lxml")
    total_pages = parse_total_pages(first_soup) or 1
    pages_to_fetch = min(total_pages, max_pages)
    logger.info("Coupon pages_to_fetch=%d (detected=%s, max=%d)", pages_to_fetch, total_pages, max_pages)

    for page_num in range(1, pages_to_fetch + 1):
        if page_num == 1:
            page_url = coupon_url
            soup = first_soup
        else:
            page_url = coupon_url.rstrip("/") + f"/PN{page_num}.html"
            time.sleep(2)
            try:
                html = get(page_url, timeout=20).text
            except httpx.HTTPError:
                logger.info("Coupon pagination stopped at page %d (HTTP error)", page_num)
                break
            soup = BeautifulSoup(html, "lxml")
        page_items = 0

        for table in soup.select(item_sel):
            if not isinstance(table, Tag):
                continue

            title_el = table.select_one(title_sel)
            title = title_el.get_text(strip=True) if title_el else ""

            price_el = table.select_one(price_sel)
            price = price_el.get_text(strip=True) if price_el else ""

            desc_el = table.select_one(desc_sel)
            desc = desc_el.get_text(strip=True) if desc_el else ""

            cond_el = table.select_one(cond_sel)
            cond = cond_el.get_text("\n", strip=True) if cond_el else ""

            label_el = table.select_one(label_sel)
            label = label_el.get_text(strip=True) if label_el else ""

            # Extract couponId from reservation link
            source_id = ""
            for a in table.find_all("a", href=True):
                m = _COUPON_ID_RE.search(a["href"])
                if m:
                    source_id = m.group(1)
                    break

            coupon_link = coupon_url
            if source_id:
                for a in table.find_all("a", href=True):
                    if "couponId" in a["href"]:
                        coupon_link = urljoin(page_url, a["href"])
                        break

            if not source_id:
                # Fallback: deterministic key based on extracted fields.
                if not title:
                    continue
                source_id = _fallback_source_id(title=title, label=label, price=price, desc=desc, cond=cond)

            # Build structured body text
            parts: list[str] = []
            if label:
                parts.append(f"[{label}]")
            if price:
                parts.append(price)
            if desc:
                parts.append(desc)
            if cond:
                parts.append(cond)
            body_text = "\n".join(parts)

            if not title and not body_text:
                continue

            if source_id in seen:
                continue
            seen.add(source_id)
            out.append(CouponItem(source_id=source_id, title=title, body_text=body_text, url=coupon_link))
            page_items += 1

        if page_items == 0:
            break

    return out
