# Project Plan (detailed): Paws & Co pet shop

Stories grouped by sprint and epic. Specs: `docs/specs/foundation.md`, `docs/specs/add-a-pet.md`,
`docs/specs/pet-list-by-status.md`. Every story also keeps `mad-project-context` (contract of
record, string ids, test ids, off-limits paths).

Shared commands — API, from `api/`: `uv run pytest`, `uv run ruff check`, `uv run mypy src/`.
Web, from `web/`: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Database for any local run or test: `docker compose up -d db`.

---

# Sprint 1: Paws & Co staff app

## Epic 1.1: Foundation

## Story 1.1.1: API scaffold with pet table and health check

**Type:** backend
**Points:** 3
**Dependencies:** None

**Description:** Create the FastAPI project in `api/` (uv) per `docs/specs/foundation.md`:
settings, async database session, the Alembic migration that creates the `pet` table and the
`pet_id_seq` sequence starting at 9007199254740993, the Pydantic pet schemas with string ids,
`GET /health`, and `{detail}` error handlers (422, 404, 400 for malformed JSON). No pet routes yet.

**Acceptance criteria:**
- [ ] `GET /health` returns 200 `{"status":"ok"}`.
- [ ] On a fresh database, `uv run alembic upgrade head` creates `pet`, and the sequence's first
      value is 9007199254740993; `Pet` serialises an int id above 2^53 to the exact decimal string.
- [ ] An unknown path returns 404 `{detail}` and a malformed JSON body returns 400 `{detail}`.
- [ ] `api/README.md` gives install, migrate, start, env vars and the `DATABASE_URL`.

**Verification:**
- [ ] Tests pass: `uv run pytest` (from `api/`)
- [ ] Build succeeds: `uv run ruff check && uv run mypy src/`
- [ ] Manual check: `uv run uvicorn src.main:app --port 8000`, then `curl -fsS localhost:8000/health`

**Files likely touched:**
- `api/pyproject.toml`, `api/uv.lock`, `api/README.md`
- `api/src/main.py`, `api/src/config.py`, `api/src/database.py`, `api/src/exceptions.py`, `api/src/models.py`
- `api/src/pets/models.py`, `api/src/pets/schemas.py`
- `api/migrations/` (env + first migration)
- `api/tests/test_health.py`, `api/tests/conftest.py`

## Story 1.1.2: Web scaffold with layout, schemas and health route

**Type:** frontend
**Points:** 3
**Dependencies:** None

**Description:** Create the Next.js app in `web/` (npm, App Router, TypeScript strict) per
`docs/specs/foundation.md`: `env.ts` (`API_URL`), the `server-only` API wrapper, the Zod pet
schemas with `PetId` as a string, a layout styled after `prototype/style.css`, placeholder pages
for `/` and `/add` carrying their root test ids, and `/health` (rewrite to `app/api/health/route.ts`,
which checks the API).

**Acceptance criteria:**
- [ ] `/` renders `data-testid="pet-list-page"` with an `add-pet-link` to `/add`, and `/add` renders
      `data-testid="add-pet-page"` with a `back-to-list-link` to `/`.
- [ ] `GET /health` on :3000 returns 200 when the API's `/health` answers and 503 when it does not.
- [ ] The `PetId` schema accepts a 19-digit string and rejects a number.
- [ ] `web/README.md` gives install, start and env vars (`API_URL`).

**Verification:**
- [ ] Tests pass: `npm test` (from `web/`)
- [ ] Build succeeds: `npm run lint && npx tsc --noEmit && npm run build`
- [ ] Manual check: `npm run dev`, open http://localhost:3000 and http://localhost:3000/health

**Files likely touched:**
- `web/package.json`, `web/package-lock.json`, `web/next.config.ts`, `web/tsconfig.json`, `web/README.md`
- `web/src/env.ts`, `web/src/server/api.ts`, `web/src/lib/schemas/pet.ts`
- `web/src/app/layout.tsx`, `web/src/app/page.tsx`, `web/src/app/add/page.tsx`, `web/src/app/api/health/route.ts`

## Story 1.1.3: Dockerfiles and the "Run it on your machine" guide

**Type:** devops
**Points:** 2
**Dependencies:** 1.1.1, 1.1.2

**Description:** Write `api/Dockerfile` (uv sync, `alembic upgrade head`, then uvicorn on :8000)
and `web/Dockerfile` (npm ci, next build, next start on :3000) so `docker compose --profile app
up -d --build` starts the whole app from the existing `compose.yaml`, and add the README section
"Run it on your machine".

**Acceptance criteria:**
- [ ] `docker compose --profile app up -d --build` starts db, api and web; the migration runs on api start.
- [ ] `curl -fsS localhost:8000/health` and `curl -fsS localhost:3000/health` both return 200.
- [ ] README.md has "Run it on your machine": the start command, http://localhost:3000, and how to stop.

**Verification:**
- [ ] Tests pass: `curl -fsS localhost:8000/health && curl -fsS localhost:3000/health`
- [ ] Build succeeds: `docker compose --profile app build`
- [ ] Manual check: open http://localhost:3000 and see the pet list page

**Files likely touched:**
- `api/Dockerfile`, `api/.dockerignore`
- `web/Dockerfile`, `web/.dockerignore`
- `README.md`

## Epic 1.2: Add a pet

## Story 1.2.1: API — add a pet and get a pet by id

**Type:** backend
**Points:** 3
**Dependencies:** 1.1.1

**Description:** Implement `POST /pet` and `GET /pet/{petId}` exactly as
`contracts/petstore-pets.yaml` and `docs/specs/add-a-pet.md` define, with a `valid_pet_id`
dependency that loads the pet or raises `PetNotFound`.

**Acceptance criteria:**
- [ ] `POST /pet` returns 200 with the created pet (string id); invalid bodies and unknown
      properties return 422 `{detail}`; malformed JSON returns 400.
- [ ] `GET /pet/{petId}` returns the pet, 404 for an unknown id including `9999999999999999999`,
      and 422 for a non-numeric id.
- [ ] `tests/contract/run.sh http://localhost:8000` reports no failures for `addPet` and `getPetById`
      (`findPetsByStatus` failures are expected until 1.3.1).

**Verification:**
- [ ] Tests pass: `uv run pytest` (from `api/`)
- [ ] Build succeeds: `uv run ruff check && uv run mypy src/`
- [ ] Manual check: `curl -s -XPOST localhost:8000/pet -H 'content-type: application/json' -d '{"name":"Rex","status":"available"}'`

**Files likely touched:**
- `api/src/pets/router.py`, `api/src/pets/service.py`, `api/src/pets/dependencies.py`, `api/src/pets/exceptions.py`
- `api/src/main.py`
- `api/tests/pets/test_add_get.py`

## Story 1.2.2: Add pet screen

**Type:** frontend
**Points:** 3
**Dependencies:** 1.1.2, 1.2.1

**Description:** Build `/add` per `prototype/add.html` and `docs/specs/add-a-pet.md`: the form
with every add-pet test id, a Server Action that validates with the shared Zod `NewPet` schema
(trimmed name 1–100, optional category ≤ 50), shows errors in `form-error`, and on success shows
`created-pet` with what the API returned and resets the form.

**Acceptance criteria:**
- [ ] Adding "Rex"/`available`/"Dogs" shows `created-pet` with the API's id, name and status; the
      form clears and status resets to `available`.
- [ ] A blank or spaces-only name, a 101-char name or a 51-char category shows `form-error`
      without calling the API; an API failure shows "Could not add the pet. Try again."
- [ ] The add-pet reference journeys pass: `cd tests/e2e-reference && npm ci &&
      WEB_URL=http://localhost:3000 npx playwright test -g "adding a pet"`.

**Verification:**
- [ ] Tests pass: `npm test` (from `web/`)
- [ ] Build succeeds: `npm run lint && npx tsc --noEmit && npm run build`
- [ ] Manual check: add a pet at http://localhost:3000/add; the shown id has 16+ digits

**Files likely touched:**
- `web/src/app/add/page.tsx`
- `web/src/components/pets/add-pet-form.tsx`
- `web/src/server/actions/add-pet.ts`
- `web/src/lib/schemas/pet.ts`
- `web/src/server/actions/add-pet.test.ts`

## Epic 1.3: Pet list by status

## Story 1.3.1: API — find pets by status

**Type:** backend
**Points:** 2
**Dependencies:** 1.2.1

**Description:** Implement `GET /pet/findByStatus` per the contract and
`docs/specs/pet-list-by-status.md`: exactly one status, results newest first (`id DESC`).

**Acceptance criteria:**
- [ ] Each status returns only its pets, newest first; a status with no pets returns `[]`.
- [ ] A missing or unknown status returns 422 `{detail}`.
- [ ] `tests/contract/run.sh http://localhost:8000` passes for all three operations.

**Verification:**
- [ ] Tests pass: `uv run pytest` (from `api/`)
- [ ] Build succeeds: `uv run ruff check && uv run mypy src/`
- [ ] Manual check: `curl -s 'localhost:8000/pet/findByStatus?status=available'`

**Files likely touched:**
- `api/src/pets/router.py`, `api/src/pets/service.py`
- `api/tests/pets/test_find_by_status.py`

## Story 1.3.2: Pet list screen

**Type:** frontend
**Points:** 3
**Dependencies:** 1.1.2, 1.2.2, 1.3.1

**Description:** Build `/` per `prototype/index.html` and `docs/specs/pet-list-by-status.md`:
a Server Component that reads `?status=` (default and unknown → `available`), fetches uncached,
and renders rows or the empty state; a client `<select>` leaf that pushes `/?status=<value>`;
`error.tsx` with retry; and `revalidatePath("/")` in the add-pet action.

**Acceptance criteria:**
- [ ] `/` shows only available pets with `status-filter` = `available`; choosing `sold` moves to
      `/?status=sold` and shows only sold pets; `/?status=foo` behaves like `/`.
- [ ] A status with no pets shows `pet-list-empty` and no rows; with the API down, "Could not
      load pets." and a retry button show.
- [ ] The full `tests/e2e-reference/run.sh http://localhost:3000` suite passes.

**Verification:**
- [ ] Tests pass: `npm test` (from `web/`)
- [ ] Build succeeds: `npm run lint && npx tsc --noEmit && npm run build`
- [ ] Manual check: add a pet, return to `/`, see it at the top of its status

**Files likely touched:**
- `web/src/app/page.tsx`, `web/src/app/error.tsx`, `web/src/app/loading.tsx`
- `web/src/components/pets/pet-table.tsx`, `web/src/components/pets/status-filter.tsx`
- `web/src/lib/status.ts`, `web/src/lib/status.test.ts`
- `web/src/server/actions/add-pet.ts`

## Epic 1.4: Quality

## Story 1.4.1: QA — end-to-end tests for adding and listing pets

**Type:** qa
**Points:** 3
**Dependencies:** 1.1.3, 1.2.2, 1.3.2

**Description:** Write Playwright E2E specs in `e2e/tests/` (per `mad-qa-standards`) from the
acceptance criteria of stories 1.2.2 and 1.3.2, run them against the full local stack, file real
application bugs with the `bug-report` skill, and commit the QA report.

**Acceptance criteria:**
- [ ] Specs cover: add a pet and see the API's id/name/status; empty-name and over-length errors in
      `form-error`; the new pet at the top of its status list; filtering by each status and the URL
      surviving a refresh; the empty state; an unknown pet id returns 404 from the API; an id above
      2^53 is shown unchanged as a string.
- [ ] Every spec selects by `data-testid` only and runs green with `npm --prefix e2e test`, or each
      failure has a filed bug bead.
- [ ] The QA report is committed under `qa/test-reports/<feature>/`.

**Verification:**
- [ ] Tests pass: `npm --prefix e2e test` (app up with `docker compose --profile app up -d --build`)
- [ ] Build succeeds: `npx --prefix e2e tsc --noEmit -p e2e`
- [ ] Manual check: open the committed report and confirm each flow above is listed

**Files likely touched:**
- `e2e/tests/add-pet.spec.ts`
- `e2e/tests/pet-list.spec.ts`
- `qa/test-reports/pets/`
