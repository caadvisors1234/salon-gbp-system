from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles, require_salon
from app.models.gbp_connection import GbpConnection
from app.models.gbp_location import GbpLocation
from app.models.salon import Salon
from app.schemas.gbp import (
    BulkMappingItem,
    BulkMappingLocationInfo,
    BulkMappingRequest,
    GbpAvailableLocation,
    GbpConnectionListItem,
    GbpConnectionResponse,
    GbpLocationPatchRequest,
    GbpLocationResponse,
    GbpLocationSelectRequest,
)
from app.services import gbp_client
from app.services.gbp_tokens import get_access_token


router = APIRouter()


def _get_connection_for_salon(db: Session, salon_id: uuid.UUID) -> GbpConnection | None:
    """Get GbpConnection via the salon's active location. No cross-tenant fallback."""
    loc = (
        db.query(GbpLocation)
        .filter(GbpLocation.salon_id == salon_id, GbpLocation.is_active.is_(True))
        .first()
    )
    if loc:
        return db.query(GbpConnection).filter(GbpConnection.id == loc.gbp_connection_id).one_or_none()
    return None


def _any_active_connection_exists(db: Session) -> bool:
    """Check if any active GbpConnection exists (for setup wizard detection)."""
    return db.query(GbpConnection.id).filter(GbpConnection.status == "active").first() is not None


def _list_locations(db: Session, salon_id: uuid.UUID) -> list[GbpLocation]:
    return (
        db.query(GbpLocation)
        .filter(GbpLocation.salon_id == salon_id)
        .order_by(GbpLocation.created_at.desc())
        .all()
    )


def _build_bulk_mapping(db: Session) -> list[BulkMappingItem]:
    """Build current salon-to-location mapping for all salons."""
    salons = db.query(Salon).order_by(Salon.name).all()

    # Active location per salon (at most one)
    active_locs: dict[uuid.UUID, GbpLocation] = {}
    for loc in (
        db.query(GbpLocation)
        .filter(GbpLocation.is_active.is_(True))
        .all()
    ):
        active_locs[loc.salon_id] = loc

    out: list[BulkMappingItem] = []
    for s in salons:
        loc = active_locs.get(s.id)
        out.append(
            BulkMappingItem(
                salon_id=s.id,
                salon_name=s.name,
                gbp_location=BulkMappingLocationInfo(
                    id=loc.id,
                    location_name=loc.location_name,
                    account_id=loc.account_id,
                    location_id=loc.location_id,
                    gbp_connection_id=loc.gbp_connection_id,
                ) if loc else None,
            )
        )
    return out


# NOTE: Read-only endpoints remain salon_admin because useSetupStatus on the
# dashboard needs connection/location info for all admin roles.  The response
# schema (GbpConnectionResponse) exposes only email, status, and expiry -- no
# tokens or secrets.
@router.get("/connection", response_model=GbpConnectionResponse)
def get_connection(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> GbpConnectionResponse:
    salon_id = require_salon(user, x_salon_id)
    conn = _get_connection_for_salon(db, salon_id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GBP connection not found")
    return GbpConnectionResponse.model_validate(conn)


@router.get("/connection/exists")
def connection_exists(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("salon_admin")),
) -> dict[str, bool]:
    """Check if any active GbpConnection exists (for setup wizard detection)."""
    return {"exists": _any_active_connection_exists(db)}


@router.get("/connections", response_model=list[GbpConnectionListItem])
def list_connections(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[GbpConnectionListItem]:
    """List all GBP connections with location counts (super_admin only)."""
    loc_counts = dict(
        db.query(GbpLocation.gbp_connection_id, func.count(GbpLocation.id))
        .filter(GbpLocation.is_active.is_(True))
        .group_by(GbpLocation.gbp_connection_id)
        .all()
    )
    conns = db.query(GbpConnection).order_by(GbpConnection.updated_at.desc()).all()
    return [
        GbpConnectionListItem(
            id=c.id,
            google_account_email=c.google_account_email,
            token_expires_at=c.token_expires_at,
            status=c.status,
            location_count=loc_counts.get(c.id, 0),
        )
        for c in conns
    ]


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
    connection_id: uuid.UUID | None = Query(default=None),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> list[GbpAvailableLocation]:
    """List available GBP locations.

    Lookup by ``connection_id`` (preferred) or fall back to the salon's
    active location via ``X-Salon-Id``.
    """
    conn: GbpConnection | None = None
    if connection_id:
        conn = db.query(GbpConnection).filter(GbpConnection.id == connection_id).one_or_none()
    else:
        salon_id = require_salon(user, x_salon_id)
        conn = _get_connection_for_salon(db, salon_id)
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
    conn = db.query(GbpConnection).filter(GbpConnection.id == payload.gbp_connection_id).one_or_none()
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


# --- Bulk mapping endpoints (super_admin) ---

@router.get("/bulk-mapping", response_model=list[BulkMappingItem])
def get_bulk_mapping(
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[BulkMappingItem]:
    """Return current salon-to-location mapping for all salons."""
    return _build_bulk_mapping(db)


@router.post("/bulk-mapping", response_model=list[BulkMappingItem])
def save_bulk_mapping(
    payload: BulkMappingRequest,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_roles("super_admin")),
) -> list[BulkMappingItem]:
    """Bulk-save salon-to-location mappings."""
    for entry in payload.mappings:
        # Deactivate existing active location for this salon
        db.query(GbpLocation).filter(
            GbpLocation.salon_id == entry.salon_id,
            GbpLocation.is_active.is_(True),
        ).update({"is_active": False})

        if entry.gbp_connection_id and entry.account_id and entry.location_id:
            # Upsert location
            loc = (
                db.query(GbpLocation)
                .filter(
                    GbpLocation.salon_id == entry.salon_id,
                    GbpLocation.account_id == entry.account_id,
                    GbpLocation.location_id == entry.location_id,
                )
                .one_or_none()
            )
            if loc is None:
                loc = GbpLocation(
                    salon_id=entry.salon_id,
                    gbp_connection_id=entry.gbp_connection_id,
                    account_id=entry.account_id,
                    location_id=entry.location_id,
                    location_name=entry.location_name,
                    is_active=True,
                )
            else:
                loc.gbp_connection_id = entry.gbp_connection_id
                loc.location_name = entry.location_name
                loc.is_active = True
            db.add(loc)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not save mappings. Please retry.",
        ) from e

    return _build_bulk_mapping(db)
