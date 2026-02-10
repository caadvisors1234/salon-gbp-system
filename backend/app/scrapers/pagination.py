from __future__ import annotations

import re

from bs4 import BeautifulSoup

_PAGE_INDICATOR_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s*ページ")


def parse_total_pages(soup: BeautifulSoup) -> int | None:
    """Extract total page count Y from "X/Y ページ" text found in the HTML."""
    # Look in the paging container first to avoid false matches in body text
    paging = soup.select_one("div.paging")
    if paging:
        m = _PAGE_INDICATOR_RE.search(paging.get_text(" "))
        if m:
            return int(m.group(2))
    # Fallback: scan full page text
    m = _PAGE_INDICATOR_RE.search(soup.get_text(" "))
    if m:
        return int(m.group(2))
    return None
