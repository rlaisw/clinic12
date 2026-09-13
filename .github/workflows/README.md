# GitHub Actions Workflows

## CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` or `develop`.

**Jobs:**
- **lint-and-test**: Checks code quality
  - Sets up Node.js (v20) and Python (3.12)
  - Installs dependencies via pnpm and pip
  - Runs frontend linting (`pnpm run lint --filter @repo/ui`)
  - Runs frontend type checking (`pnpm run check-types`)
  - Runs backend linting and validation (`flake8`, `manage.py check`)
  - Performs basic security scanning with Bandit
  - Uploads logs on failure

## Deploy Pipeline (`.github/workflows/deploy.yml`)

Triggers on pushes to `main`.

**Jobs:**
- **build**: Builds the frontend and collects static files from the backend
- **deploy**: Deploys to production (placeholder - customize with your deployment method)

## Notes

- The CI workflow uses frozen lockfiles (`pnpm-lock.yaml`) for reproducible builds
- Backend linting uses `flake8` and Django’s `manage.py check`
- Type checking uses `next typegen && tsc --noEmit`
- Security scanning uses `bandit`
- The deploy job is currently a placeholder - customize with your actual deployment steps (Docker, Kubernetes, etc.)

## Prerequisites

- `pnpm` installed globally (version 10.19.0)
- Python 3.12+ available
- Access to private repositories (if needed for secret handling)

## How to Use

1. Push changes to `main` or `develop` to trigger CI
2. View results in the GitHub Actions tab
3. For deployment, update the `deploy` job with your actual deployment commands
