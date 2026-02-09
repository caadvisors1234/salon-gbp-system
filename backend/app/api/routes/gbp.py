from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_roles, require_salon
from app.models.gbp_connection import GbpConnection
from app.models.gbp_location import GbpLocation
from app.schemas.gbp import (
    GbpAvailableLocation,
    GbpConnectionResponse,
    GbpLocationPatchRequest,
    GbpLocationResponse,
    GbpLocationSelectRequest,
)
from app.services import gbp_client
from app.services.gbp_tokens import get_access_token


router = APIRouter()


def _get_connection(db: Session, salon_id: uuid.UUID) -> GbpConnection | None:
    return db.query(GbpConnection).filter(GbpConnection.salon_id == salon_id).one_or_none()


@router.get("/connection", response_model=GbpConnectionResponse)
def get_connection(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> GbpConnectionResponse:
    salon_id = require_salon(user)
    conn = _get_connection(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GBP connection not found")
    return GbpConnectionResponse.model_validate(conn)


@router.get("/locations", response_model=list[GbpLocationResponse])
def list_locations(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[GbpLocationResponse]:
    salon_id = require_salon(user)
    locs = (
        db.query(GbpLocation)
        .filter(GbpLocation.salon_id == salon_id)
        .order_by(GbpLocation.created_at.desc())
        .all()
    )
    return [GbpLocationResponse.model_validate(l) for l in locs]


@router.get("/locations/available", response_model=list[GbpAvailableLocation])
def list_available_locations(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin", "staff")),
) -> list[GbpAvailableLocation]:
    salon_id = require_salon(user)
    conn = _get_connection(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GBP is not connected")
    access_token = get_access_token(db, conn)
    try:
        accounts = gbp_client.list_accounts(access_token=access_token)
    except Exception:
        accounts = []

    out: list[GbpAvailableLocation] = []
    for account_id in accounts:
        try:
            locs = gbp_client.list_locations(access_token=access_token, account_id=account_id)
        except Exception:
            continue
        for loc in locs:
            out.append(
                GbpAvailableLocation(
                    account_id=loc.account_id,
                    location_id=loc.location_id,
                    location_name=loc.location_name,
                )
            )
    return out


@router.post("/locations/select", response_model=list[GbpLocationResponse])
def select_locations(
    payload: GbpLocationSelectRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> list[GbpLocationResponse]:
    salon_id = require_salon(user)
    conn = _get_connection(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GBP is not connected")

    # Deactivate all first; then upsert selections.
    db.query(GbpLocation).filter(GbpLocation.salon_id == salon_id).update({"is_active": False})
    db.commit()

    results: list[GbpLocation] = []
    for item in payload.locations:
        loc = (
            db.query(GbpLocation)
            .filter(GbpLocation.salon_id == salon_id)
            .filter(GbpLocation.account_id == item.account_id)
            .filter(GbpLocation.location_id == item.location_id)
            .one_or_none()
        )
        if loc is None:
            loc = GbpLocation(
                salon_id=salon_id,
                gbp_connection_id=conn.id,
                account_id=item.account_id,
                location_id=item.location_id,
                location_name=item.location_name,
                is_active=item.is_active,
            )
        else:
            loc.location_name = item.location_name
            loc.is_active = item.is_active
            loc.gbp_connection_id = conn.id

        db.add(loc)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(loc)
        results.append(loc)

    return [GbpLocationResponse.model_validate(l) for l in results]


@router.patch("/locations/{location_db_id}", response_model=GbpLocationResponse)
def patch_location(
    location_db_id: uuid.UUID,
    payload: GbpLocationPatchRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> GbpLocationResponse:
    salon_id = require_salon(user)
    loc = (
        db.query(GbpLocation)
        .filter(GbpLocation.id == location_db_id)
        .filter(GbpLocation.salon_id == salon_id)
        .one_or_none()
    )
    if loc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(loc, k, v)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return GbpLocationResponse.model_validate(loc)

