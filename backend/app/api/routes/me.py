from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, db_session, get_current_user
from app.models.salon import Salon
from app.schemas.me import MeResponse, MeSalonMembership


router = APIRouter()


@router.get("/me", response_model=MeResponse)
def me(
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(get_current_user),
) -> MeResponse:
    if user.is_super_admin():
        # super_admin は全サロンにアクセス可能
        salons = db.query(Salon).order_by(Salon.name).all()
        salon_memberships = [
            MeSalonMembership(id=s.id, slug=s.slug, name=s.name, is_active=s.is_active)
            for s in salons
        ]
        salon_ids = [s.id for s in salons]
    else:
        salons_by_id: dict[str, MeSalonMembership] = {}
        if user.salon_ids:
            salons = db.query(Salon).filter(Salon.id.in_(user.salon_ids)).all()
            salons_by_id = {
                str(s.id): MeSalonMembership(
                    id=s.id,
                    slug=s.slug,
                    name=s.name,
                    is_active=s.is_active,
                )
                for s in salons
            }
        salon_memberships = [salons_by_id[str(sid)] for sid in user.salon_ids if str(sid) in salons_by_id]
        salon_ids = list(user.salon_ids)

    return MeResponse(
        id=user.id,
        supabase_user_id=user.supabase_user_id,
        email=user.email,
        role=user.role,
        salon_ids=salon_ids,
        salons=salon_memberships,
    )
