from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user, require_roles, require_salon
from app.models.salon import Salon
from app.schemas.salon import SalonResponse, SalonSettingsUpdate


router = APIRouter()


@router.get("/settings", response_model=SalonResponse)
def get_settings(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> SalonResponse:
    salon_id = require_salon(user)
    salon = db.query(Salon).filter(Salon.id == salon_id).one_or_none()
    if salon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return SalonResponse.model_validate(salon)


@router.put("/settings", response_model=SalonResponse)
def update_settings(
    payload: SalonSettingsUpdate,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
) -> SalonResponse:
    salon_id = require_salon(user)
    salon = db.query(Salon).filter(Salon.id == salon_id).one_or_none()
    if salon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")

    # model_validator が hotpepper_top_url から salon_id / blog / style / coupon
    # の各フィールドを導出済み。これらは exclude_unset=True でも set 扱いになる。
    data = payload.model_dump(exclude_unset=True)
    data.pop("hotpepper_top_url", None)  # computed; not a DB column
    data.pop("name", None)               # super_adminのみ設定可能
    data.pop("slug", None)               # super_adminのみ設定可能
    for k, v in data.items():
        setattr(salon, k, v)
    db.add(salon)
    db.commit()
    db.refresh(salon)
    return SalonResponse.model_validate(salon)

