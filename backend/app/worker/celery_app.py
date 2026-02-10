from __future__ import annotations

from celery import Celery

from app.core.config import get_settings
from app.core.logging import setup_logging


settings = get_settings()
setup_logging(settings.log_level, app_env=settings.app_env)

celery_app = Celery(
    "salon_gbp_system",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.timezone = "UTC"

# Periodic tasks (best-effort; adjust in production).
celery_app.conf.beat_schedule = {
    "scrape-hotpepper-blog-4h": {
        "task": "app.worker.tasks.scrape_hotpepper_blog",
        "schedule": 4 * 60 * 60,
    },
    "scrape-hotpepper-style-6h": {
        "task": "app.worker.tasks.scrape_hotpepper_style",
        "schedule": 6 * 60 * 60,
    },
    "scrape-hotpepper-coupon-6h": {
        "task": "app.worker.tasks.scrape_hotpepper_coupon",
        "schedule": 6 * 60 * 60,
    },
    "fetch-instagram-4h": {
        "task": "app.worker.tasks.fetch_instagram_media",
        "schedule": 4 * 60 * 60,
    },
    "cleanup-media-assets-daily": {
        "task": "app.worker.tasks.cleanup_media_assets",
        "schedule": 24 * 60 * 60,
    },
    "refresh-instagram-tokens-daily": {
        "task": "app.worker.tasks.refresh_instagram_tokens",
        "schedule": 24 * 60 * 60,
    },
}

