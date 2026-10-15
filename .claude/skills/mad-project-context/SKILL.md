---
name: mad-project-context
description: >
  MAD Petstore project rules every role keeps: the contract of record, string pet ids, test
  ids and form-error, the health endpoint, definition of done, and off-limits paths. Invoke at
  the start of any task on this project, before the role's mad-*-standards skill.
---

# Project context: MAD Petstore

The stack is in `docs/ARCHITECTURE.md` (and in the Stack section `/create-project-overlay` adds
here). The folders, ports and run command are in `compose.yaml` (API in `api/`, web in `web/`).

## Stack
- Web: Next.js (App Router, TypeScript) in `web/`, port 3000; standards in `mad-frontend-standards`.
- API: FastAPI (Pydantic v2, async SQLAlchemy, Alembic) in `api/`, port 8000; standards in
  `mad-backend-standards`.
- Database: PostgreSQL, the `db` service in `compose.yaml`.
- Deployment: none (local only); there is no `infra/` and no deploy script.

## Repo layout
- `api/`, `web/`: the app, each with its own Dockerfile and a README with the no-Docker commands.
- `contracts/`: the API contract and the test-id list (read-only).
- `prototype/index.html`: the screens to follow.
- `e2e/`: QA's Playwright suite. `tests/`: reference suites (off limits, see below).
- `docs/`: architecture, specs, plan.

## Commands
- Start the database: `docker compose up -d db`. Whole app: `docker compose --profile app up -d --build`.
- API (from `api/`): `uv sync`, `uv run pytest`, `uv run ruff check`, `uv run mypy src/`.
- Web (from `web/`): `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Branching
- `TEAM_BASE_BRANCH` is `develop`; every PR targets it. Only a person merges `develop` into `main`.

## Contract of record
- `contracts/petstore-pets.yaml` is the contract of record. Never change it.
- Pet ids are 64-bit in storage and decimal strings in the API and the UI; the id sequence
  starts above 2^53. Never convert an id to a JavaScript number.
- Errors are `{detail}` JSON: 422 for validation, 404 for a missing pet.

## UI rules
- Every element listed in `contracts/testids.md` carries exactly that `data-testid`.
- Show validation errors in `data-testid="form-error"`; do not rely on native `required`.

## Health
- `GET /health` returns 200 on the one public URL that serves the app.

## Definition of done
1. Backend work: `tests/contract/run.sh <api-url>` passes against the running app.
2. Frontend work: `tests/e2e-reference/run.sh <web-url>` passes against the running app.

## Try it locally
The start command and the URL to open are in the README section "Run it on your machine"
(they work on the base branch). Without Docker, see the READMEs in `api/` and `web/`.

## Off limits
- Never edit anything under the top-level `tests/` directory (`e2e/tests/` is yours).
- Never read or edit `course/` or `progress/`.
