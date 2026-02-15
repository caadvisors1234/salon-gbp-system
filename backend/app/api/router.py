from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import admin, alerts, gbp, health, instagram, me, media_uploads, nav_counts, oauth_google, oauth_meta, posts, salon


api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(oauth_google.router, tags=["oauth"])
api_router.include_router(oauth_meta.router, tags=["oauth"])
api_router.include_router(salon.router, prefix="/salon", tags=["salon"])
api_router.include_router(gbp.router, prefix="/gbp", tags=["gbp"])
api_router.include_router(instagram.router, prefix="/instagram", tags=["instagram"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(media_uploads.router, prefix="/media_uploads", tags=["media_uploads"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(nav_counts.router, prefix="/nav/counts", tags=["nav"])

api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
