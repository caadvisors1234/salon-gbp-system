# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI API, Celery workers, SQLAlchemy models, and Alembic migrations.
  - `backend/app/api/routes/` for endpoints, `backend/app/services/` for business logic, `backend/app/worker/` for async jobs, `backend/tests/` for pytest suites.
- `frontend/`: React 18 + Vite + TypeScript admin UI.
  - Route pages in `frontend/src/pages/`, reusable UI in `frontend/src/components/`, shared utilities in `frontend/src/lib/`, tests under `src/**/__tests__/`.
- `deploy/`: Docker and Nginx config (`docker-compose.yml`, `Dockerfile.web`, `nginx/conf.d/`).
- `docs/`: requirements, design, API, operations, and deployment references.

## Build, Test, and Development Commands
- Start full local stack: `docker compose -f deploy/docker-compose.yml up --build`
- Run DB migrations: `docker compose -f deploy/docker-compose.yml exec api alembic upgrade head`
- Backend lint/test (from `backend/`):
  - `ruff check .`
  - `python -m pytest -v`
- Frontend checks (from `frontend/`):
  - `npm ci`
  - `npx tsc -b`
  - `npx vitest run`
  - `npm run build`

## Coding Style & Naming Conventions
- Python: target 3.12, 4-space indentation, max line length 130, linted with Ruff (`backend/ruff.toml`).
- TypeScript/React: follow existing 2-space indentation and strict typing patterns.
- Naming:
  - Python modules/functions: `snake_case`; classes: `PascalCase`.
  - React components/pages: `PascalCase` (e.g., `DashboardPage.tsx`).
  - Hooks: `useXxx` (e.g., `useApiFetch.ts`).
  - Tests: backend `test_*.py`; frontend `*.test.ts` / `*.test.tsx`.

## Testing Guidelines
- Backend uses `pytest`; keep unit tests close to domain behavior (`backend/tests/`) and reuse `backend/tests/fixtures/` for scraper/parser cases.
- Frontend uses `vitest` + Testing Library (`jsdom` environment in `frontend/vitest.config.ts`).
- Add or update tests for each behavioral change and bug fix. CI requires backend lint/tests, frontend type-check/tests/build, and Docker image builds.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat(scope): ...`, `fix(scope): ...`, `refactor: ...`, `docs: ...`.
- Keep commits focused and descriptive; use imperative summaries.
- PRs should include:
  - clear change summary and affected areas (`backend`, `frontend`, `deploy`)
  - linked issue/task (if available)
  - migration or env var notes when relevant
  - screenshots/GIFs for UI changes
  - confirmation that local CI-equivalent checks pass.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets.
- Use placeholder values in CI/build contexts for `VITE_*` and OAuth credentials.
- Treat token encryption and OAuth secrets as required for non-dev environments.
