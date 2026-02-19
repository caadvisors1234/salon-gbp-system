from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles, require_salon
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


def _list_locations(db: Session, salon_id: uuid.UUID) -> list[GbpLocation]:
    return (
        db.query(GbpLocation)
        .filter(GbpLocation.salon_id == salon_id)
        .order_by(GbpLocation.created_at.desc())
        .all()
    )


# NOTE: Read-only endpoints remain salon_admin because useSetupStatus on the
# dashboard needs connection/location info for all admin roles.  The response
# schema (GbpConnectionResponse) exposes only email, status, and expiry — no
# tokens or secrets.
@router.get("/connection", response_model=GbpConnectionResponse)
def get_connection(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> GbpConnectionResponse:
    salon_id = require_salon(user, x_salon_id)
    conn = _get_connection(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GBP connection not found")
    return GbpConnectionResponse.model_validate(conn)


@router.get("/locations", response_model=list[GbpLocationResponse])
def list_locations(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[GbpLocationResponse]:
    salon_id = require_salon(user, x_salon_id)
    locs = _list_locations(db, salon_id)
    return [GbpLocationResponse.model_validate(l) for l in locs]


@router.get("/locations/available", response_model=list[GbpAvailableLocation])
def list_available_locations(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("super_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[GbpAvailableLocation]:
    salon_id = require_salon(user, x_salon_id)
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
    user: CurrentUser = Depends(require_roles("super_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[GbpLocationResponse]:
    salon_id = require_salon(user, x_salon_id)
    conn = _get_connection(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GBP is not connected")

    # Keep the endpoint idempotent while enforcing one active location per salon.
    db.query(GbpLocation).filter(GbpLocation.salon_id == salon_id).update({"is_active": False})

    item = payload.location
    if item is None:
        db.commit()
        return []

    try:
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
                is_active=True,
            )
        else:
            loc.location_name = item.location_name
            loc.is_active = True
            loc.gbp_connection_id = conn.id
        db.add(loc)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not set location. Please retry.",
        ) from e

    db.refresh(loc)
    return [GbpLocationResponse.model_validate(loc)]


@router.patch("/locations/{location_db_id}", response_model=list[GbpLocationResponse])
def patch_location(
    location_db_id: uuid.UUID,
    payload: GbpLocationPatchRequest,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("super_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[GbpLocationResponse]:
    salon_id = require_salon(user, x_salon_id)
    loc = (
        db.query(GbpLocation)
        .filter(GbpLocation.id == location_db_id)
        .filter(GbpLocation.salon_id == salon_id)
        .one_or_none()
    )
    if loc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_active") is True:
        db.query(GbpLocation).filter(GbpLocation.salon_id == salon_id).filter(GbpLocation.id != loc.id).update(
            {"is_active": False}
        )
    for k, v in data.items():
        setattr(loc, k, v)
    db.add(loc)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not update location. Please retry.",
        ) from e
    locs = _list_locations(db, salon_id)
    return [GbpLocationResponse.model_validate(x) for x in locs]
