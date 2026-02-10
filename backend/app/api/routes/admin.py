from __future__ import annotations

import uuid

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles
from app.models.alert import Alert
from app.models.gbp_connection import GbpConnection
from app.models.gbp_location import GbpLocation
from app.models.job_log import JobLog
from app.models.salon import Salon
from app.models.user import AppUser
from app.core.config import get_settings
from app.schemas.admin import AdminSalonCreate, AdminUserInviteRequest, AppUserResponse
from app.services import supabase_admin
from app.schemas.job_logs import JobLogResponse
from app.schemas.monitor import SalonMonitorItem
from app.schemas.salon import SalonResponse


router = APIRouter()


@router.get("/salons", response_model=list[SalonResponse])
def list_salons(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[SalonResponse]:
    salons = db.query(Salon).order_by(Salon.created_at.desc()).all()
    return [SalonResponse.model_validate(s) for s in salons]


@router.post("/salons", response_model=SalonResponse, status_code=status.HTTP_201_CREATED)
def create_salon(
    payload: AdminSalonCreate,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> SalonResponse:
    salon = Salon(name=payload.name, slug=payload.slug)
    db.add(salon)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Salon slug already exists") from e
    db.refresh(salon)
    return SalonResponse.model_validate(salon)


@router.get("/users", response_model=list[AppUserResponse])
def list_users(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[AppUserResponse]:
    users = db.query(AppUser).order_by(AppUser.created_at.desc()).all()
    return [AppUserResponse.model_validate(u) for u in users]


@router.post("/users/invite", response_model=AppUserResponse, status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: AdminUserInviteRequest,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> AppUserResponse:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_SERVICE_ROLE_KEY is not configured",
        )

    existing = db.query(AppUser).filter(AppUser.email == str(payload.email)).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists in app_users")

    # Create user in Supabase (or get existing)
    try:
        sb_user = supabase_admin.create_user(
            settings,
            email=str(payload.email),
            password=payload.password,
        )
    except supabase_admin.SupabaseUserAlreadyExistsError:
        try:
            sb_user = supabase_admin.get_user_by_email(settings, email=str(payload.email))
        except supabase_admin.SupabaseAdminError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase Admin API error: {exc.message}",
            ) from exc
        if sb_user is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="User exists in Supabase but could not be retrieved",
            )
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase Admin API error: {exc.message}",
        ) from exc

    user = AppUser(
        supabase_user_id=sb_user.id,
        email=sb_user.email,
        salon_id=payload.salon_id,
        role=payload.role,
        display_name=payload.display_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists (duplicate supabase_user_id or email)",
        ) from e
    db.refresh(user)
    return AppUserResponse.model_validate(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_roles("super_admin")),
) -> dict[str, str]:
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")

    if current_user.supabase_user_id == uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete yourself",
        )

    user = db.query(AppUser).filter(AppUser.supabase_user_id == uid).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete from Supabase first to avoid orphaned auth users
    settings = get_settings()
    if settings.supabase_service_role_key:
        try:
            supabase_admin.delete_user(settings, user_id=user_id)
        except supabase_admin.SupabaseAdminError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase user deletion failed: {exc.message}",
            ) from exc

    db.delete(user)
    db.commit()

    return {"status": "ok"}


@router.get("/job_logs", response_model=list[JobLogResponse])
def list_job_logs(
    limit: int = 200,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[JobLogResponse]:
    logs = db.query(JobLog).order_by(JobLog.started_at.desc()).limit(min(max(limit, 1), 500)).all()
    return [JobLogResponse.model_validate(x) for x in logs]


@router.get("/monitor", response_model=list[SalonMonitorItem])
def monitor(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[SalonMonitorItem]:
    salons = db.query(Salon).order_by(Salon.created_at.desc()).all()

    open_alerts_map: dict[uuid.UUID, int] = {}
    for salon_id, cnt in (
        db.query(Alert.salon_id, sa.func.count(Alert.id))
        .filter(Alert.salon_id.isnot(None))
        .filter(Alert.status == "open")
        .group_by(Alert.salon_id)
        .all()
    ):
        open_alerts_map[salon_id] = int(cnt)

    active_locations_map: dict[uuid.UUID, int] = {}
    for salon_id, cnt in (
        db.query(GbpLocation.salon_id, sa.func.count(GbpLocation.id))
        .filter(GbpLocation.is_active.is_(True))
        .group_by(GbpLocation.salon_id)
        .all()
    ):
        active_locations_map[salon_id] = int(cnt)

    conn_status_map: dict[uuid.UUID, str] = {}
    for salon_id, status_ in db.query(GbpConnection.salon_id, GbpConnection.status).all():
        conn_status_map[salon_id] = status_

    out: list[SalonMonitorItem] = []
    for s in salons:
        out.append(
            SalonMonitorItem(
                salon_id=s.id,
                slug=s.slug,
                name=s.name,
                is_active=s.is_active,
                open_alerts=open_alerts_map.get(s.id, 0),
                gbp_connection_status=conn_status_map.get(s.id, "none"),
                active_locations=active_locations_map.get(s.id, 0),
            )
        )
    return out
