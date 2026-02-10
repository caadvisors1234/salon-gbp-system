"""Test that pagination parameters work with offset/limit."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.gbp_post import GbpPost
from app.models.alert import Alert

from conftest import register_sqlite_functions, setup_sqlite_compat


@pytest.fixture
def db_session():
    setup_sqlite_compat()
    engine = create_engine("sqlite:///:memory:")
    register_sqlite_functions(engine)
    Base.metadata.create_all(engine)
    Session_ = sessionmaker(bind=engine)
    session = Session_()
    yield session
    session.close()


def test_posts_offset_limit(db_session):
    salon_id = uuid.uuid4()
    sc_id = uuid.uuid4()
    loc_id = uuid.uuid4()
    for _ in range(10):
        db_session.add(GbpPost(
            id=uuid.uuid4(),
            salon_id=salon_id,
            source_content_id=sc_id,
            gbp_location_id=loc_id,
            post_type="STANDARD",
            summary_generated="test",
            summary_final="test",
            status="pending",
        ))
    db_session.commit()

    all_posts = (
        db_session.query(GbpPost)
        .filter(GbpPost.salon_id == salon_id)
        .order_by(GbpPost.created_at.desc())
        .all()
    )
    assert len(all_posts) == 10

    page1 = (
        db_session.query(GbpPost)
        .filter(GbpPost.salon_id == salon_id)
        .order_by(GbpPost.created_at.desc())
        .offset(0).limit(3)
        .all()
    )
    assert len(page1) == 3

    page2 = (
        db_session.query(GbpPost)
        .filter(GbpPost.salon_id == salon_id)
        .order_by(GbpPost.created_at.desc())
        .offset(3).limit(3)
        .all()
    )
    assert len(page2) == 3

    page1_ids = {p.id for p in page1}
    page2_ids = {p.id for p in page2}
    assert page1_ids.isdisjoint(page2_ids)

    beyond = (
        db_session.query(GbpPost)
        .filter(GbpPost.salon_id == salon_id)
        .order_by(GbpPost.created_at.desc())
        .offset(100).limit(10)
        .all()
    )
    assert len(beyond) == 0


def test_alerts_offset_limit(db_session):
    salon_id = uuid.uuid4()
    for _ in range(5):
        db_session.add(Alert(
            id=uuid.uuid4(),
            salon_id=salon_id,
            severity="info",
            alert_type="test",
            message="test message",
            status="open",
        ))
    db_session.commit()

    page = (
        db_session.query(Alert)
        .filter(Alert.salon_id == salon_id)
        .order_by(Alert.created_at.desc())
        .offset(2).limit(2)
        .all()
    )
    assert len(page) == 2
