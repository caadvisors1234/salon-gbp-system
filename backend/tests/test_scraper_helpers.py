"""Test scraper helper functions for creating posts and media uploads."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.gbp_location import GbpLocation
from app.models.gbp_media_upload import GbpMediaUpload
from app.models.gbp_post import GbpPost
from app.models.source_content import SourceContent
from app.worker.scraper_helpers import create_gbp_posts_for_source, create_media_uploads_for_source

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


def _ids():
    return uuid.uuid4(), uuid.uuid4(), uuid.uuid4()


def test_create_gbp_posts_for_source(db_session):
    salon_id, conn_id, sc_id = _ids()
    loc1_id, loc2_id = uuid.uuid4(), uuid.uuid4()

    # Create two active locations
    for loc_id in (loc1_id, loc2_id):
        db_session.add(GbpLocation(
            id=loc_id, salon_id=salon_id, gbp_connection_id=conn_id,
            account_id="acc1", location_id=f"loc-{loc_id}", is_active=True,
        ))

    sc = SourceContent(
        id=sc_id, salon_id=salon_id, source_type="hotpepper_blog",
        source_id="test-url", image_urls=[],
    )
    db_session.add(sc)
    db_session.commit()

    posts = create_gbp_posts_for_source(
        db_session, salon_id=salon_id, sc=sc, summary="Test",
        image_asset_id=None, post_type="STANDARD",
        cta_type="LEARN_MORE", cta_url="https://example.com",
        offer_redeem_online_url=None,
    )
    db_session.commit()

    assert len(posts) == 2
    assert all(p.status == "pending" for p in posts)
    assert all(p.post_type == "STANDARD" for p in posts)


def test_create_gbp_posts_skips_duplicates(db_session):
    salon_id, conn_id, sc_id = _ids()
    loc_id = uuid.uuid4()

    db_session.add(GbpLocation(
        id=loc_id, salon_id=salon_id, gbp_connection_id=conn_id,
        account_id="acc1", location_id="loc1", is_active=True,
    ))
    sc = SourceContent(
        id=sc_id, salon_id=salon_id, source_type="hotpepper_blog",
        source_id="test-url", image_urls=[],
    )
    db_session.add(sc)
    db_session.commit()

    # First call creates
    posts1 = create_gbp_posts_for_source(
        db_session, salon_id=salon_id, sc=sc, summary="Test",
        image_asset_id=None, post_type="STANDARD",
        cta_type=None, cta_url=None, offer_redeem_online_url=None,
    )
    db_session.commit()
    assert len(posts1) == 1

    # Second call skips duplicate
    posts2 = create_gbp_posts_for_source(
        db_session, salon_id=salon_id, sc=sc, summary="Test",
        image_asset_id=None, post_type="STANDARD",
        cta_type=None, cta_url=None, offer_redeem_online_url=None,
    )
    db_session.commit()
    assert len(posts2) == 0


def test_create_media_uploads_for_source(db_session):
    salon_id, conn_id, sc_id = _ids()
    loc_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    db_session.add(GbpLocation(
        id=loc_id, salon_id=salon_id, gbp_connection_id=conn_id,
        account_id="acc1", location_id="loc1", is_active=True,
    ))
    sc = SourceContent(
        id=sc_id, salon_id=salon_id, source_type="hotpepper_style",
        source_id="img-url", image_urls=[],
    )
    db_session.add(sc)
    db_session.commit()

    uploads = create_media_uploads_for_source(
        db_session, salon_id=salon_id, sc=sc, media_asset_id=asset_id,
        source_image_url="https://example.com/img.jpg",
        category="ADDITIONAL", media_format="PHOTO",
    )
    db_session.commit()

    assert len(uploads) == 1
    assert uploads[0].status == "pending"
    assert uploads[0].media_format == "PHOTO"


def test_create_media_uploads_skips_duplicates(db_session):
    salon_id, conn_id, sc_id = _ids()
    loc_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    db_session.add(GbpLocation(
        id=loc_id, salon_id=salon_id, gbp_connection_id=conn_id,
        account_id="acc1", location_id="loc1", is_active=True,
    ))
    sc = SourceContent(
        id=sc_id, salon_id=salon_id, source_type="hotpepper_style",
        source_id="img-url", image_urls=[],
    )
    db_session.add(sc)
    db_session.commit()

    uploads1 = create_media_uploads_for_source(
        db_session, salon_id=salon_id, sc=sc, media_asset_id=asset_id,
        source_image_url="https://example.com/img.jpg",
        category="ADDITIONAL", media_format="PHOTO",
    )
    db_session.commit()
    assert len(uploads1) == 1

    uploads2 = create_media_uploads_for_source(
        db_session, salon_id=salon_id, sc=sc, media_asset_id=asset_id,
        source_image_url="https://example.com/img.jpg",
        category="ADDITIONAL", media_format="PHOTO",
    )
    db_session.commit()
    assert len(uploads2) == 0


def test_no_active_locations_returns_empty(db_session):
    salon_id = uuid.uuid4()
    sc_id = uuid.uuid4()

    sc = SourceContent(
        id=sc_id, salon_id=salon_id, source_type="hotpepper_blog",
        source_id="test-url", image_urls=[],
    )
    db_session.add(sc)
    db_session.commit()

    posts = create_gbp_posts_for_source(
        db_session, salon_id=salon_id, sc=sc, summary="Test",
        image_asset_id=None, post_type="STANDARD",
        cta_type=None, cta_url=None, offer_redeem_online_url=None,
    )
    assert len(posts) == 0
