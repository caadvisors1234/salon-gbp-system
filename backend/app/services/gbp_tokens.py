from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.crypto import decrypt_str, encrypt_str
from app.models.gbp_connection import GbpConnection
from app.services.google_oauth import refresh_access_token

logger = logging.getLogger(__name__)


def get_access_token(db: Session, conn: GbpConnection) -> str:
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    if conn.token_expires_at <= (now + timedelta(minutes=5)):
        logger.info("Refreshing GBP token for connection_id=%s", conn.id)
        refresh_token = decrypt_str(conn.refresh_token_enc, settings.token_enc_key_b64)
        refreshed = refresh_access_token(settings, refresh_token=refresh_token)
        conn.access_token_enc = encrypt_str(refreshed.access_token, settings.token_enc_key_b64)
        conn.token_expires_at = refreshed.expires_at
        db.add(conn)
        db.commit()
        db.refresh(conn)
        logger.info("GBP token refreshed, new expiry=%s", conn.token_expires_at)

    return decrypt_str(conn.access_token_enc, settings.token_enc_key_b64)

