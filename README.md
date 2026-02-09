# salon-gbp-system

Closed SaaS for salons: ingest HotPepper / Instagram content and publish (approval-based) to Google Business Profile.

## Structure

- `backend/`: FastAPI + Celery + Alembic (PostgreSQL)
- `frontend/`: React (Vite) admin UI
- `deploy/`: Docker Compose + Nginx (reverse proxy + `/media` static)
- `docs/`: requirements and design docs

## Quickstart (dev)

1. Copy `.env.example` to `.env` and fill values.
2. Run docker compose:

```bash
docker compose -f deploy/docker-compose.yml up --build
```

3. Apply DB migrations:

```bash
docker compose -f deploy/docker-compose.yml exec api alembic upgrade head
```

4. Open:
- API: `http://localhost:8080/api/health`
- UI: `http://localhost:8080/`

