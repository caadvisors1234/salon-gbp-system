from __future__ import annotations

import sys
import types
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

tasks_stub = types.ModuleType("app.worker.tasks")
tasks_stub.post_gbp_post = types.SimpleNamespace(delay=lambda *_args, **_kwargs: None)
tasks_stub.upload_gbp_media = types.SimpleNamespace(delay=lambda *_args, **_kwargs: None)
sys.modules.setdefault("app.worker.tasks", tasks_stub)

from app.api.deps import CurrentUser  # noqa: E402
from app.api.routes.alerts import ack, list_alerts  # noqa: E402
from app.api.routes.media_uploads import get_upload, list_uploads  # noqa: E402
from app.api.routes.posts import get_post, list_posts  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models.alert import Alert  # noqa: E402
from app.models.gbp_media_upload import GbpMediaUpload  # noqa: E402
from app.models.gbp_post import GbpPost  # noqa: E402

from conftest import register_sqlite_functions, setup_sqlite_compat  # noqa: E402


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


def _super_admin_user() -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        supabase_user_id=uuid.uuid4(),
        email="admin@example.com",
        role="super_admin",
        salon_ids=(),
    )


def _create_post(db: Session, salon_id: uuid.UUID) -> GbpPost:
    post = GbpPost(
        id=uuid.uuid4(),
        salon_id=salon_id,
        source_content_id=uuid.uuid4(),
        gbp_location_id=uuid.uuid4(),
        post_type="STANDARD",
        summary_generated="generated summary",
        summary_final="final summary",
        status="pending",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def _create_upload(db: Session, salon_id: uuid.UUID) -> GbpMediaUpload:
    upload = GbpMediaUpload(
        id=uuid.uuid4(),
        salon_id=salon_id,
        source_content_id=uuid.uuid4(),
        gbp_location_id=uuid.uuid4(),
        media_asset_id=uuid.uuid4(),
        media_format="PHOTO",
        category="ADDITIONAL",
        source_image_url="https://example.com/image.jpg",
        status="pending",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


def _create_alert(
    db: Session,
    *,
    salon_id: uuid.UUID | None,
    status: str = "open",
) -> Alert:
    alert = Alert(
        id=uuid.uuid4(),
        salon_id=salon_id,
        severity="warning",
        alert_type="scope_test",
        message="scope test alert",
        status=status,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_list_posts_scopes_super_admin_by_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()
    _create_post(db_session, selected_salon_id)
    _create_post(db_session, other_salon_id)

    posts = list_posts(
        status_filter=None,
        exclude_status=None,
        offset=0,
        limit=50,
        db=db_session,
        user=user,
        x_salon_id=str(selected_salon_id),
    )

    assert len(posts) == 1
    assert posts[0].salon_id == selected_salon_id


def test_get_post_returns_404_for_super_admin_when_outside_selected_salon(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()
    post = _create_post(db_session, other_salon_id)

    with pytest.raises(HTTPException) as exc:
        get_post(
            post_id=post.id,
            db=db_session,
            user=user,
            x_salon_id=str(selected_salon_id),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Post not found"


def test_list_uploads_scopes_super_admin_by_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()
    _create_upload(db_session, selected_salon_id)
    _create_upload(db_session, other_salon_id)

    uploads = list_uploads(
        status_filter=None,
        exclude_status=None,
        offset=0,
        limit=50,
        db=db_session,
        user=user,
        x_salon_id=str(selected_salon_id),
    )

    assert len(uploads) == 1
    assert uploads[0].salon_id == selected_salon_id


def test_get_upload_returns_404_for_super_admin_when_outside_selected_salon(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()
    upload = _create_upload(db_session, other_salon_id)

    with pytest.raises(HTTPException) as exc:
        get_upload(
            upload_id=upload.id,
            db=db_session,
            user=user,
            x_salon_id=str(selected_salon_id),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Upload not found"


def test_list_alerts_scopes_super_admin_by_selected_salon_and_keeps_global(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()

    selected_alert = _create_alert(db_session, salon_id=selected_salon_id, status="open")
    _create_alert(db_session, salon_id=other_salon_id, status="open")
    global_alert = _create_alert(db_session, salon_id=None, status="open")
    _create_alert(db_session, salon_id=selected_salon_id, status="acked")

    alerts = list_alerts(
        db=db_session,
        user=user,
        x_salon_id=str(selected_salon_id),
        status_filter="open",
        offset=0,
        limit=50,
    )

    returned_ids = {a.id for a in alerts}
    assert selected_alert.id in returned_ids
    assert global_alert.id in returned_ids
    assert len(returned_ids) == 2


def test_ack_rejects_super_admin_alert_outside_selected_salon(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    other_salon_id = uuid.uuid4()
    alert = _create_alert(db_session, salon_id=other_salon_id, status="open")

    with pytest.raises(HTTPException) as exc:
        ack(
            alert_id=alert.id,
            db=db_session,
            user=user,
            x_salon_id=str(selected_salon_id),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Alert not found"


def test_ack_allows_global_alert_for_super_admin(db_session: Session) -> None:
    user = _super_admin_user()
    selected_salon_id = uuid.uuid4()
    alert = _create_alert(db_session, salon_id=None, status="open")

    updated = ack(
        alert_id=alert.id,
        db=db_session,
        user=user,
        x_salon_id=str(selected_salon_id),
    )

    assert updated.status == "acked"
    assert updated.acked_by == user.id


# -- X-Salon-Id header missing → 400 --


def test_list_posts_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()

    with pytest.raises(HTTPException) as exc:
        list_posts(
            status_filter=None,
            exclude_status=None,
            offset=0,
            limit=50,
            db=db_session,
            user=user,
            x_salon_id=None,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"


def test_get_post_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()
    post = _create_post(db_session, uuid.uuid4())

    with pytest.raises(HTTPException) as exc:
        get_post(
            post_id=post.id,
            db=db_session,
            user=user,
            x_salon_id=None,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"


def test_list_uploads_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()

    with pytest.raises(HTTPException) as exc:
        list_uploads(
            status_filter=None,
            exclude_status=None,
            offset=0,
            limit=50,
            db=db_session,
            user=user,
            x_salon_id=None,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"


def test_get_upload_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()
    upload = _create_upload(db_session, uuid.uuid4())

    with pytest.raises(HTTPException) as exc:
        get_upload(
            upload_id=upload.id,
            db=db_session,
            user=user,
            x_salon_id=None,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"


def test_list_alerts_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()

    with pytest.raises(HTTPException) as exc:
        list_alerts(
            db=db_session,
            user=user,
            x_salon_id=None,
            status_filter=None,
            offset=0,
            limit=50,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"


def test_ack_returns_400_without_x_salon_id(db_session: Session) -> None:
    user = _super_admin_user()
    alert = _create_alert(db_session, salon_id=None, status="open")

    with pytest.raises(HTTPException) as exc:
        ack(
            alert_id=alert.id,
            db=db_session,
            user=user,
            x_salon_id=None,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "X-Salon-Id header is required"
