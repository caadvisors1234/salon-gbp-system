# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Closed SaaS for Japanese salons: ingests content from HotPepper (beauty directory) and Instagram, then publishes (with approval workflow) to Google Business Profile (GBP). Multi-tenant architecture with salon-level isolation.

## Common Commands

### Development Environment
```bash
# Start all services (API, worker, beat, db, redis, nginx, frontend)
docker compose -f deploy/docker-compose.yml up --build

# Apply database migrations
docker compose -f deploy/docker-compose.yml exec api alembic upgrade head

# Create a new migration
docker compose -f deploy/docker-compose.yml exec api alembic revision --autogenerate -m "description"
```

### Backend Tests
```bash
# Run all tests (from backend/)
cd backend && python -m pytest

# Run a single test file
cd backend && python -m pytest tests/test_crypto.py

# Run a specific test
cd backend && python -m pytest tests/test_crypto.py::test_roundtrip
```

### Frontend
```bash
# Dev server (standalone, outside Docker)
cd frontend && npm run dev

# Type-check and build
cd frontend && npm run build

# Run all tests
cd frontend && npm run test

# Run a single test file
cd frontend && npx vitest run src/components/__tests__/Button.test.tsx
```

### Access Points (via Nginx on port 8080)
- API: `http://localhost:8080/api/health`
- UI: `http://localhost:8080/`
- Media: `http://localhost:8080/media/`

## Architecture

### Backend (`backend/`)
FastAPI + Celery + SQLAlchemy + Alembic on PostgreSQL.

**Layer structure:**
- `app/models/` — SQLAlchemy ORM models. Most inherit `UUIDPrimaryKeyMixin` + `TimestampMixin` from `models/mixins.py`. Salon-scoped models use `salon_id` FK for tenant isolation.
- `app/schemas/` — Pydantic v2 request/response schemas. Separate from models.
- `app/api/routes/` — Thin FastAPI route handlers. Auth via `app/api/deps.py` which verifies Supabase JWTs against JWKS and returns a `CurrentUser` dataclass.
- `app/services/` — Business logic: OAuth token exchange/refresh (`google_oauth.py`, `meta_oauth.py`), GBP API client (`gbp_client.py`), token management (`gbp_tokens.py`), media downloads (`media_storage.py`), alert lifecycle (`alerts.py`).
- `app/scrapers/` — HotPepper blog/style/coupon scrapers and Instagram fetcher. CSS selectors loaded from YAML files in `scrapers/selectors/`. Text transformation for GBP in `text_transform.py` (1500-char limit).
- `app/worker/` — Celery app config (`celery_app.py`) and all task definitions (`tasks.py`). Beat schedule runs scrapers every 4-6 hours and media cleanup daily.

**Key patterns:**
- All OAuth tokens (Google, Meta) are AES-256-GCM encrypted before storage (`app/core/crypto.py`). Format: `v1:<base64(nonce|ciphertext)>`.
- OAuth state parameters use HMAC signing via `itsdangerous` (`app/core/oauth_state.py`).
- Role-based access: `staff`, `salon_admin`, `super_admin`. Enforced via `require_roles()` and `require_salon()` dependencies in `app/api/deps.py`.
- GBP token auto-refresh: `gbp_tokens.get_access_token()` refreshes tokens expiring within 5 minutes.
- Celery tasks retry on HTTP 429 with exponential backoff (max 600s). HTTP 401 marks connections as expired and creates alerts.

### Frontend (`frontend/`)
React 18 + Vite + TypeScript (strict) + Tailwind CSS. Minimal dependencies (no state management library, no component library, no form library).

- `src/lib/auth.tsx` — React Context wrapping Supabase Auth. `useAuth()` hook provides `{ session, loading }`.
- `src/lib/api.ts` — `apiFetch<T>()` generic fetcher. Adds Bearer token, handles JSON, throws on non-OK responses.
- `src/lib/supabase.ts` — Supabase client init from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/pages/` — One component per route. Each page independently fetches data on mount via `apiFetch`. No shared data cache.
- `src/App.tsx` — Shell layout with role-based nav. All routes except `/login` require authentication.

### Content Pipeline Flow
1. Celery Beat triggers scraper tasks periodically
2. Scrapers create `SourceContent` records from HotPepper/Instagram
3. For each active `GbpLocation`, a `GbpPost` (status=pending) or `GbpMediaUpload` (status=pending) is auto-created
4. Salon operators review/edit/approve in the UI
5. Approval enqueues `post_gbp_post` or `upload_gbp_media` Celery tasks
6. Tasks call GBP API; failures create `Alert` records and update `JobLog`

### Deployment (`deploy/`)
Docker Compose with 7 services: nginx (reverse proxy, port 8080), frontend (Vite dev server, port 5173), api (FastAPI/uvicorn, port 8000), worker (Celery), beat (Celery Beat), db (PostgreSQL 16), redis (Redis 7). Nginx routes `/api/` to backend, `/media/` to static files, `/` to frontend.

## Environment Configuration

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL` — PostgreSQL connection (psycopg driver)
- `REDIS_URL` — Redis for Celery broker
- `SUPABASE_URL` / `SUPABASE_JWKS_URL` — Auth verification
- `TOKEN_ENC_KEY_B64` — 32-byte AES key (base64). Generate: `python -c "import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`
- `OAUTH_STATE_SECRET` — HMAC signing key for OAuth CSRF protection
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth for GBP
- `META_APP_ID` / `META_APP_SECRET` — Meta OAuth for Instagram
- Frontend env vars in `frontend/.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`

## Database

PostgreSQL with 12 tables. Initial schema in `backend/alembic/versions/0001_init.py`, with check constraints in `0002` and `scrape_seeded` tracking table in `0003`. All primary keys are UUIDs (`gen_random_uuid()`). `source_contents` has a unique constraint on `(salon_id, source_type, source_id)` to prevent duplicate ingestion.
