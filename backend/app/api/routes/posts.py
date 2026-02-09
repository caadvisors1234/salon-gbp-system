from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_salon
from app.models.gbp_post import GbpPost
from app.schemas.posts import PostDetail, PostListItem, PostUpdateRequest
from app.worker.tasks import post_gbp_post


router = APIRouter()


@router.get("", response_model=list[PostListItem])
def list_posts(
    status_filter: str | None = Query(default=None, alias="status"),
    salon_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[PostListItem]:
    q = db.query(GbpPost)
    if user.is_super_admin():
        if salon_id:
            q = q.filter(GbpPost.salon_id == salon_id)
    else:
        q = q.filter(GbpPost.salon_id == require_salon(user))

    if status_filter:
        q = q.filter(GbpPost.status == status_filter)

    posts = q.order_by(GbpPost.created_at.desc()).limit(limit).all()
    return [PostListItem.model_validate(p) for p in posts]


@router.get("/{post_id}", response_model=PostDetail)
def get_post(
    post_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> PostDetail:
    post = db.query(GbpPost).filter(GbpPost.id == post_id).one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not user.is_super_admin() and post.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return PostDetail.model_validate(post)


@router.patch("/{post_id}", response_model=PostDetail)
def update_post(
    post_id: uuid.UUID,
    payload: PostUpdateRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> PostDetail:
    post = db.query(GbpPost).filter(GbpPost.id == post_id).one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not user.is_super_admin() and post.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(post, k, v)
    post.edited_by = user.id
    post.edited_at = datetime.now(tz=timezone.utc)
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostDetail.model_validate(post)


@router.post("/{post_id}/approve", response_model=PostDetail)
def approve_post(
    post_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> PostDetail:
    post = db.query(GbpPost).filter(GbpPost.id == post_id).one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not user.is_super_admin() and post.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post is not pending")
    post.status = "queued"
    post.error_message = None
    db.add(post)
    db.commit()
    db.refresh(post)

    post_gbp_post.delay(str(post.id))
    return PostDetail.model_validate(post)


@router.post("/{post_id}/retry", response_model=PostDetail)
def retry_post(
    post_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> PostDetail:
    post = db.query(GbpPost).filter(GbpPost.id == post_id).one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not user.is_super_admin() and post.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status != "failed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post is not failed")
    post.status = "queued"
    post.error_message = None
    db.add(post)
    db.commit()
    db.refresh(post)

    post_gbp_post.delay(str(post.id))
    return PostDetail.model_validate(post)


@router.post("/{post_id}/skip", response_model=PostDetail)
def skip_post(
    post_id: uuid.UUID,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> PostDetail:
    post = db.query(GbpPost).filter(GbpPost.id == post_id).one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not user.is_super_admin() and post.salon_id != require_salon(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status in ("posted",):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post already posted")
    post.status = "skipped"
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostDetail.model_validate(post)

