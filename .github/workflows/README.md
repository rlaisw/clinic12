# GitHub Actions Workflows

## CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` or `develop`.

**Job — lint-and-test** (Node 22.x + Python 3.12):
- Sets up Node.js (v22) and Python (3.12), caches pnpm store
- Installs dependencies: `npm install -g pnpm@10.19.0`, `pnpm install --frozen-lockfile`, `pip install -r backend/requirements.txt`
- Frontend lint (errors only; warnings allowed — 58 pre-existing): `pnpm --filter @repo/ui exec eslint src --max-warnings 999`, `pnpm --filter web exec eslint --max-warnings 999`
- Frontend type check: `pnpm --filter web run check-types` (`next typegen && tsc --noEmit`)
- Backend tests: `python -m pytest medication/tests.py api/tests.py api/rag/tests.py`
- Backend lint: `flake8 . --count --select=E9,F63,F7,F82`
- Django checks: `python manage.py check --deploy`
- Security scan: `bandit -r . -ll`
- Uploads logs artifact on failure

## Deploy Pipeline (`.github/workflows/deploy.yml`)

Triggers on pushes to `main` (or manual dispatch).

- **build**: `pnpm build` (frontend) + `python manage.py collectstatic --noinput` (backend)
- **deploy**: placeholder — add your actual deployment steps (Docker, SSH, Kubernetes, etc.)

## How to Use
1. Push to `main`/`develop` → CI runs automatically
2. View results: https://github.com/rlaisw/clinic12/actions
3. Customize `.github/workflows/deploy.yml` for your production deployment

## Notes
- Uses frozen lockfile (`pnpm-lock.yaml`) for reproducible installs
- Node 20 is deprecated on GitHub runner images — the workflow pins Node 22.x
- The lint steps tolerate pre-existing warnings (`--max-warnings 999`); new errors still fail CI