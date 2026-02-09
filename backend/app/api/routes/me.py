from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, get_current_user
from app.schemas.me import MeResponse


router = APIRouter()


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=user.id,
        supabase_user_id=user.supabase_user_id,
        email=user.email,
        role=user.role,
        salon_id=user.salon_id,
    )

