from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, require_roles, require_salon
from app.models.salon import Salon
from app.schemas.salon import SalonResponse


router = APIRouter()


@router.get("/settings", response_model=SalonResponse)
def get_settings(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_roles("salon_admin")),
    x_salon_id: str | None = Header(default=None, alias="X-Salon-Id"),
) -> SalonResponse:
    salon_id = require_salon(user, x_salon_id)
    salon = db.query(Salon).filter(Salon.id == salon_id).one_or_none()
    if salon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return SalonResponse.model_validate(salon)
