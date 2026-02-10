"""Test is_seeded / mark_seeded helper functions."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.worker.scraper_helpers import is_seeded, mark_seeded

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


def test_is_seeded_returns_false_when_no_record(db_session):
    salon_id = uuid.uuid4()
    assert is_seeded(db_session, salon_id=salon_id, source_type="hotpepper_blog") is False


def test_mark_seeded_then_is_seeded_returns_true(db_session):
    salon_id = uuid.uuid4()
    mark_seeded(db_session, salon_id=salon_id, source_type="hotpepper_blog")
    assert is_seeded(db_session, salon_id=salon_id, source_type="hotpepper_blog") is True


def test_mark_seeded_is_idempotent(db_session):
    salon_id = uuid.uuid4()
    mark_seeded(db_session, salon_id=salon_id, source_type="hotpepper_style")
    mark_seeded(db_session, salon_id=salon_id, source_type="hotpepper_style")
    assert is_seeded(db_session, salon_id=salon_id, source_type="hotpepper_style") is True


def test_different_source_types_are_independent(db_session):
    salon_id = uuid.uuid4()
    mark_seeded(db_session, salon_id=salon_id, source_type="hotpepper_blog")
    assert is_seeded(db_session, salon_id=salon_id, source_type="hotpepper_blog") is True
    assert is_seeded(db_session, salon_id=salon_id, source_type="hotpepper_style") is False


def test_different_salons_are_independent(db_session):
    salon_a = uuid.uuid4()
    salon_b = uuid.uuid4()
    mark_seeded(db_session, salon_id=salon_a, source_type="instagram")
    assert is_seeded(db_session, salon_id=salon_a, source_type="instagram") is True
    assert is_seeded(db_session, salon_id=salon_b, source_type="instagram") is False
