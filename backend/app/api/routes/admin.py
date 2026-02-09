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
from app.schemas.admin import AdminSalonCreate, AdminUserAssignRequest, AppUserResponse
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


@router.post("/users/assign", response_model=AppUserResponse)
def assign_user(
    payload: AdminUserAssignRequest,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> AppUserResponse:
    user = db.query(AppUser).filter(AppUser.supabase_user_id == payload.supabase_user_id).one_or_none()
    if user is None:
        user = AppUser(
            supabase_user_id=payload.supabase_user_id,
            email=str(payload.email),
            salon_id=payload.salon_id,
            role=payload.role,
            display_name=payload.display_name,
            is_active=payload.is_active,
        )
    else:
        user.email = str(payload.email)
        user.salon_id = payload.salon_id
        user.role = payload.role
        user.display_name = payload.display_name
        user.is_active = payload.is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return AppUserResponse.model_validate(user)


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
