"""Test CAS (Compare-And-Swap) pattern prevents double-processing of tasks."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.gbp_post import GbpPost
from app.models.gbp_media_upload import GbpMediaUpload

from conftest import register_sqlite_functions, setup_sqlite_compat


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing CAS logic."""
    setup_sqlite_compat()
    engine = create_engine("sqlite:///:memory:")
    register_sqlite_functions(engine)
    Base.metadata.create_all(engine)
    Session_ = sessionmaker(bind=engine)
    session = Session_()
    yield session
    session.close()


def test_cas_post_only_one_wins(db_session):
    """Two CAS attempts on the same post: only one should succeed."""
    post_id = uuid.uuid4()
    salon_id = uuid.uuid4()
    sc_id = uuid.uuid4()
    loc_id = uuid.uuid4()

    post = GbpPost(
        id=post_id,
        salon_id=salon_id,
        source_content_id=sc_id,
        gbp_location_id=loc_id,
        post_type="STANDARD",
        summary_generated="test",
        summary_final="test",
        status="queued",
    )
    db_session.add(post)
    db_session.commit()

    # First CAS: should succeed
    result1 = db_session.execute(
        update(GbpPost)
        .where(GbpPost.id == post_id)
        .where(GbpPost.status.in_(["queued", "pending"]))
        .values(status="posting")
    )
    db_session.commit()
    claimed1 = result1.rowcount > 0

    # Second CAS: should fail (status is now "posting")
    result2 = db_session.execute(
        update(GbpPost)
        .where(GbpPost.id == post_id)
        .where(GbpPost.status.in_(["queued", "pending"]))
        .values(status="posting")
    )
    db_session.commit()
    claimed2 = result2.rowcount > 0

    assert claimed1 is True
    assert claimed2 is False


def test_cas_upload_only_one_wins(db_session):
    """Two CAS attempts on the same upload: only one should succeed."""
    upload_id = uuid.uuid4()
    salon_id = uuid.uuid4()
    sc_id = uuid.uuid4()
    loc_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    up = GbpMediaUpload(
        id=upload_id,
        salon_id=salon_id,
        source_content_id=sc_id,
        gbp_location_id=loc_id,
        media_asset_id=asset_id,
        media_format="PHOTO",
        category="ADDITIONAL",
        source_image_url="https://example.com/img.jpg",
        status="queued",
    )
    db_session.add(up)
    db_session.commit()

    # First CAS
    result1 = db_session.execute(
        update(GbpMediaUpload)
        .where(GbpMediaUpload.id == upload_id)
        .where(GbpMediaUpload.status.in_(["queued", "pending"]))
        .values(status="uploading")
    )
    db_session.commit()
    claimed1 = result1.rowcount > 0

    # Second CAS
    result2 = db_session.execute(
        update(GbpMediaUpload)
        .where(GbpMediaUpload.id == upload_id)
        .where(GbpMediaUpload.status.in_(["queued", "pending"]))
        .values(status="uploading")
    )
    db_session.commit()
    claimed2 = result2.rowcount > 0

    assert claimed1 is True
    assert claimed2 is False
