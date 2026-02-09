from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import httpx

from app.core.config import get_settings


@dataclass
class _RobotsCacheEntry:
    rp: RobotFileParser
    fetched_at: float


_robots_cache: dict[str, _RobotsCacheEntry] = {}
_ROBOTS_TTL_SEC = 24 * 60 * 60


def _origin(url: str) -> str:
    p = urlsplit(url)
    return f"{p.scheme}://{p.netloc}"


def _get_user_agent() -> str:
    return get_settings().scraper_user_agent


def _load_robots(origin: str) -> RobotFileParser:
    robots_url = origin.rstrip("/") + "/robots.txt"
    headers = {"User-Agent": _get_user_agent()}
    with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
        r = client.get(robots_url)
        # robots.txt may 404; treat as allow-all.
        if r.status_code >= 400:
            rp = RobotFileParser()
            rp.parse([])
            return rp
        text = r.text
    rp = RobotFileParser()
    rp.set_url(robots_url)
    rp.parse(text.splitlines())
    return rp


def can_fetch(url: str) -> bool:
    origin = _origin(url)
    entry = _robots_cache.get(origin)
    now = time.time()
    if entry is None or (now - entry.fetched_at) > _ROBOTS_TTL_SEC:
        rp = _load_robots(origin)
        entry = _RobotsCacheEntry(rp=rp, fetched_at=now)
        _robots_cache[origin] = entry
    return entry.rp.can_fetch(_get_user_agent(), url)


def get(url: str, *, timeout: float = 20.0) -> httpx.Response:
    if not can_fetch(url):
        raise RuntimeError(f"Blocked by robots.txt: {url}")
    headers = {"User-Agent": _get_user_agent()}
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        r = client.get(url)
        r.raise_for_status()
        return r

