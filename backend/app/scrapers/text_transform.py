from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup


MAX_GBP_SUMMARY_LEN = 1500
MAX_GBP_EVENT_TITLE_LEN = 58


_re_ws = re.compile(r"[ \t]+")
_re_nl = re.compile(r"\n{3,}")
_re_all_ws = re.compile(r"\s+")
_re_hashtag = re.compile(r"(?<!\w)#[^\s#]+")


def _normalize_text(s: str) -> str:
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = _re_ws.sub(" ", s)
    s = _re_nl.sub("\n\n", s)
    return s.strip()


def sanitize_event_title(title: str, *, max_length: int = MAX_GBP_EVENT_TITLE_LEN) -> str:
    """Sanitize event title for GBP API: collapse whitespace, strip, truncate to max_length."""
    s = _re_all_ws.sub(" ", title).strip()
    return s[:max_length]


def _truncate_with_footer(*, header: str, body: str, footer: str, limit: int = MAX_GBP_SUMMARY_LEN) -> str:
    header = header or ""
    footer = footer or ""
    body = body or ""
    # Ensure footer always included.
    available = limit - len(header) - len(footer)
    if available <= 0:
        # Degenerate case: header/footer too long. Keep footer and cut from start.
        base = (header + footer)[:limit]
        return base
    if len(body) <= available:
        return header + body + footer
    ellipsis = "..."
    if available <= len(ellipsis):
        return header + body[:available] + footer
    return header + body[: available - len(ellipsis)] + ellipsis + footer


def hotpepper_blog_to_gbp(*, title: str, body_html: str, article_url: str) -> tuple[str, str | None]:
    soup = BeautifulSoup(body_html or "", "lxml")
    for tag in soup.find_all(["script", "style", "nav", "footer", "aside"]):
        tag.decompose()
    for br in soup.find_all("br"):
        br.replace_with("\n")
    for tag in soup.find_all(["p", "div"]):
        # Preserve paragraph boundaries without over-newlining.
        tag.append("\n")

    first_img = None
    img = soup.find("img")
    if img:
        src = (img.get("src") or img.get("data-src") or img.get("data-original") or "").strip()
        if src:
            first_img = urljoin(article_url, src)

    text = soup.get_text("\n")
    text = _normalize_text(text)

    header = f"【ブログ更新】{title}\n\n"
    footer = f"\n\n▼ 詳しくはこちら\n{article_url}"
    summary = _truncate_with_footer(header=header, body=text, footer=footer, limit=MAX_GBP_SUMMARY_LEN)
    return summary, first_img


def instagram_caption_to_gbp(
    *,
    caption: str,
    permalink: str,
    sync_hashtags: bool,
) -> str:
    text = caption or ""
    if not sync_hashtags:
        text = _re_hashtag.sub("", text)
    text = _normalize_text(text)

    footer = f"\n\nInstagram でもっと見る\n{permalink}"
    return _truncate_with_footer(header="", body=text, footer=footer, limit=MAX_GBP_SUMMARY_LEN)
