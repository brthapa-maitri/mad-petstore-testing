# Implementation Plan: Paws & Co pet shop

## Overview
A two-screen staff app built from a cut-down Swagger Petstore: staff add a pet at `/add` and see
pets by status at `/`. FastAPI + PostgreSQL behind a Next.js front end, run locally with
`compose.yaml`. One sprint, delivered in one working session by a team of backend, frontend,
devops and QA agents. Full stories: `docs/project-plan-detailed.md`.

## Architecture Decisions
- Next.js + FastAPI + PostgreSQL, local only (no cloud): `docs/ARCHITECTURE.md`.
- The API follows `contracts/petstore-pets.yaml` exactly; ids are int64 in storage and decimal
  strings everywhere else, starting at 2^53 + 1 so precision bugs surface on the first pet.
- The web app calls the API only from server code (`API_URL`); no CORS, no browser calls to :8000.
- `/health` answers on both the API and the web app.

## Dependency graph
```
1.1.1 API scaffold ──► 1.2.1 API add/get ──► 1.3.1 API findByStatus ─┐
        │                    │                                       │
        ▼                    ▼                                       ▼
1.1.3 Dockerfiles ◄── 1.1.2 Web scaffold ──► 1.2.2 Add screen ──► 1.3.2 List screen
        │                                          │                 │
        └──────────────────────────────────────────┴────► 1.4.1 QA E2E
```
Parallel from the start: 1.1.1 (backend) and 1.1.2 (frontend).

## Story List

### Sprint 1: Paws & Co staff app (22 points)
**Milestone:** `docker compose --profile app up -d --build`, open http://localhost:3000; add
"Rex" (available, Dogs) at `/add` and see a 16-digit id; back on `/` Rex is at the top of the
available list; switch to `sold` and the URL becomes `/?status=sold`; an empty name shows the
form error; the QA report shows every flow green.

#### Epic 1.1: Foundation
- [ ] Story 1.1.1: API scaffold with pet table and health check (backend, 3)
- [ ] Story 1.1.2: Web scaffold with layout, schemas and health route (frontend, 3)
- [ ] Story 1.1.3: Dockerfiles and the "Run it on your machine" guide (devops, 2)

#### Epic 1.2: Add a pet
- [ ] Story 1.2.1: API — add a pet and get a pet by id (backend, 3)
- [ ] Story 1.2.2: Add pet screen (frontend, 3)

#### Epic 1.3: Pet list by status
- [ ] Story 1.3.1: API — find pets by status (backend, 2)
- [ ] Story 1.3.2: Pet list screen (frontend, 3)

#### Epic 1.4: Quality
- [ ] Story 1.4.1: QA — end-to-end tests for adding and listing pets (qa, 3)

No Deploy story: the architecture's Deployment decision is "None (local only)".

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| An id passes through a JavaScript number and loses precision | High | Ids start at 2^53 + 1; Zod `PetId` is a string; QA asserts the id is shown unchanged |
| Contract tests (Schemathesis) find edge cases: extra properties, ids above int64 max, odd strings | High | `extra="forbid"`, 404 for out-of-range ids, run `tests/contract/run.sh` in each backend story |
| Frontend stories blocked waiting for the API | Med | Contract is fixed up front; frontend scaffold runs in parallel with the API scaffold |
| `add-pet.ts` touched by both 1.2.2 and 1.3.2 | Low | 1.3.2 depends on 1.2.2, so the edits are sequential |
| The 3-hour session runs long | Med | 8 small stories, each S–M; one QA story instead of one per epic |

## Resolved Questions
- How should QA work be split? → One QA story (1.4.1) after both screens land, covering every flow.
- The team has a devops engineer but nothing to deploy? → devops owns the Dockerfiles and the
  README "Run it on your machine" section (1.1.3).
- Deployment? → None (local only); no Deploy story.
- Spec decisions (server-side API calls, `/health` on both, id start, blank-name handling, form
  reset, newest-first order, status in the URL, no row limit) → recorded in each spec's Resolved Questions.
