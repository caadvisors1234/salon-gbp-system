from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class _RobotsCacheEntry:
    rp: RobotFileParser
    fetched_at: float


_robots_cache: dict[str, _RobotsCacheEntry] = {}
_ROBOTS_TTL_SEC = 24 * 60 * 60

_DEFAULT_MAX_RETRIES = 3
_DEFAULT_BACKOFF_BASE = 5  # seconds


def _origin(url: str) -> str:
    p = urlsplit(url)
    return f"{p.scheme}://{p.netloc}"


def _get_user_agent() -> str:
    return get_settings().scraper_user_agent


def _load_robots(origin: str) -> RobotFileParser:
    robots_url = origin.rstrip("/") + "/robots.txt"
    headers = {"User-Agent": _get_user_agent()}
    try:
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            r = client.get(robots_url)
            # robots.txt may 404; treat as allow-all.
            if r.status_code >= 400:
                rp = RobotFileParser()
                rp.parse([])
                return rp
            text = r.text
    except httpx.HTTPError:
        logger.warning("Failed to fetch robots.txt from %s — assuming allow-all", origin)
        rp = RobotFileParser()
        rp.parse([])
        return rp
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


def _is_retryable(exc: Exception) -> bool:
    """Determine if an exception is worth retrying."""
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and (exc.response.status_code == 429 or exc.response.status_code >= 500):
        return True
    return False


def get(
    url: str,
    *,
    timeout: float = 20.0,
    max_retries: int = _DEFAULT_MAX_RETRIES,
) -> httpx.Response:
    if max_retries < 1:
        raise ValueError(f"max_retries must be >= 1, got {max_retries}")
    if not can_fetch(url):
        raise RuntimeError(f"Blocked by robots.txt: {url}")
    headers = {"User-Agent": _get_user_agent()}
    last_exc: httpx.HTTPError | None = None
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        for attempt in range(1, max_retries + 1):
            try:
                r = client.get(url)
                r.raise_for_status()
                return r
            except httpx.HTTPError as exc:
                last_exc = exc
                if attempt < max_retries and _is_retryable(exc):
                    base_wait = _DEFAULT_BACKOFF_BASE * (2 ** (attempt - 1))
                    wait = base_wait + random.uniform(0, base_wait * 0.5)
                    logger.warning(
                        "HTTP GET %s failed (attempt %d/%d): %s — retrying in %.1fs",
                        url, attempt, max_retries, exc, wait,
                    )
                    time.sleep(wait)
                else:
                    raise
    # Should not be reached, but satisfy the type checker
    raise last_exc  # type: ignore[misc]

