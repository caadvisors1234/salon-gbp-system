from __future__ import annotations

from typing import Literal

PostStatus = Literal["pending", "queued", "posting", "posted", "failed", "skipped"]
UploadStatus = Literal["pending", "queued", "uploading", "uploaded", "failed", "skipped"]
AlertStatus = Literal["open", "acked", "resolved"]
AlertSeverity = Literal["info", "warning", "critical"]
ConnectionStatus = Literal["active", "expired", "revoked"]
PostType = Literal["STANDARD", "OFFER", "EVENT"]
MediaFormat = Literal["PHOTO", "VIDEO"]
AccountType = Literal["official", "staff"]
