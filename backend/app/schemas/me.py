from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class MeSalonMembership(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    is_active: bool


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    supabase_user_id: uuid.UUID
    email: str
    role: str
    salon_ids: list[uuid.UUID] = Field(default_factory=list)
    salons: list[MeSalonMembership] = Field(default_factory=list)
