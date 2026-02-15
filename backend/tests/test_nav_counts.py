from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import CurrentUser
from app.api.routes.nav_counts import get_nav_counts
from app.db.base import Base
from app.models.alert import Alert
from app.models.gbp_media_upload import GbpMediaUpload
from app.models.gbp_post import GbpPost

from conftest import register_sqlite_functions, setup_sqlite_compat


@pytest.fixture
def db_session() -> Session:
    setup_sqlite_compat()
    engine = create_engine("sqlite:///:memory:")
    register_sqlite_functions(engine)
    Base.metadata.create_all(engine)
    Session_ = sessionmaker(bind=engine)
    session = Session_()
    yield session
    session.close()


SALON_ID = uuid.uuid4()
OTHER_SALON_ID = uuid.uuid4()


def _user(role: str = "super_admin") -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        supabase_user_id=uuid.uuid4(),
        email="staff@example.com",
        role=role,
        salon_ids=(SALON_ID,),
    )


def _add_posts(db: Session, salon_id: uuid.UUID, status: str, count: int) -> None:
    for _ in range(count):
        db.add(GbpPost(
            id=uuid.uuid4(),
            salon_id=salon_id,
            source_content_id=uuid.uuid4(),
            gbp_location_id=uuid.uuid4(),
            post_type="STANDARD",
            summary_generated="g",
            summary_final="f",
            status=status,
        ))
    db.commit()


def _add_media(db: Session, salon_id: uuid.UUID, status: str, count: int) -> None:
    for _ in range(count):
        db.add(GbpMediaUpload(
            id=uuid.uuid4(),
            salon_id=salon_id,
            source_content_id=uuid.uuid4(),
            gbp_location_id=uuid.uuid4(),
            media_asset_id=uuid.uuid4(),
            media_format="PHOTO",
            category="ADDITIONAL",
            source_image_url="https://example.com/img.jpg",
            status=status,
        ))
    db.commit()


def _add_alerts(db: Session, salon_id: uuid.UUID | None, status: str, count: int) -> None:
    for _ in range(count):
        db.add(Alert(
            id=uuid.uuid4(),
            salon_id=salon_id,
            severity="warning",
            alert_type="test",
            message="test alert",
            status=status,
        ))
    db.commit()


def test_returns_correct_counts(db_session: Session) -> None:
    _add_posts(db_session, SALON_ID, "pending", 3)
    _add_posts(db_session, SALON_ID, "posted", 2)
    _add_media(db_session, SALON_ID, "pending", 5)
    _add_media(db_session, SALON_ID, "uploaded", 1)
    _add_alerts(db_session, SALON_ID, "open", 2)
    _add_alerts(db_session, SALON_ID, "acked", 4)

    result = get_nav_counts(
        db=db_session,
        user=_user(),
        x_salon_id=str(SALON_ID),
    )

    assert result.pending_posts == 3
    assert result.pending_media == 5
    assert result.open_alerts == 2


def test_returns_zeros_when_empty(db_session: Session) -> None:
    result = get_nav_counts(
        db=db_session,
        user=_user(),
        x_salon_id=str(SALON_ID),
    )

    assert result.pending_posts == 0
    assert result.pending_media == 0
    assert result.open_alerts == 0


def test_scoped_to_salon(db_session: Session) -> None:
    _add_posts(db_session, SALON_ID, "pending", 2)
    _add_posts(db_session, OTHER_SALON_ID, "pending", 10)
    _add_media(db_session, OTHER_SALON_ID, "pending", 7)

    result = get_nav_counts(
        db=db_session,
        user=_user(),
        x_salon_id=str(SALON_ID),
    )

    assert result.pending_posts == 2
    assert result.pending_media == 0
    assert result.open_alerts == 0


def test_includes_global_alerts_for_super_admin(db_session: Session) -> None:
    _add_alerts(db_session, SALON_ID, "open", 1)
    _add_alerts(db_session, None, "open", 2)
    _add_alerts(db_session, OTHER_SALON_ID, "open", 5)

    result = get_nav_counts(
        db=db_session,
        user=_user(role="super_admin"),
        x_salon_id=str(SALON_ID),
    )

    # super_admin: salon-scoped (1) + global (2), excludes other salon (5)
    assert result.open_alerts == 3


def test_excludes_global_alerts_for_non_super_admin(db_session: Session) -> None:
    _add_alerts(db_session, SALON_ID, "open", 1)
    _add_alerts(db_session, None, "open", 2)
    _add_alerts(db_session, OTHER_SALON_ID, "open", 5)

    result = get_nav_counts(
        db=db_session,
        user=_user(role="salon_admin"),
        x_salon_id=str(SALON_ID),
    )

    # non-super_admin: salon-scoped only (1), excludes global (2) and other salon (5)
    assert result.open_alerts == 1
