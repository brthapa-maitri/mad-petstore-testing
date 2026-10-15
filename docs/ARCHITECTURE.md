# Architecture: Paws & Co pet shop

## Overview
A small web app for Paws & Co shop staff to see the shop's pets by status (available, pending,
sold) and add a new pet when it arrives. The API is a cut-down Swagger Petstore that follows
`contracts/petstore-pets.yaml` exactly; the screens follow `prototype/index.html`.

## Components

```
  Staff browser (desktop)
          │
          ▼
  ┌──────────────────┐   HTTP/JSON   ┌──────────────────┐   SQL   ┌──────────────────┐
  │ Web (Next.js)    │ ────────────▶ │ API (FastAPI)    │ ──────▶ │ PostgreSQL 17    │
  │ web/  :3000      │               │ api/  :8000      │         │ db    :5432      │
  └──────────────────┘               └──────────────────┘         └──────────────────┘
                     all three run locally via compose.yaml
```

- **Web**: `web/`, http://localhost:3000. Pet list at `/`, add pet at `/add`. Server side calls
  the API at `API_URL`; the browser uses `NEXT_PUBLIC_API_URL` (http://localhost:8000).
- **API**: `api/`, http://localhost:8000. `POST /pet`, `GET /pet/findByStatus`,
  `GET /pet/{petId}`, `GET /health`. Reads `DATABASE_URL`.
- **Database**: the `db` service in `compose.yaml`, `postgresql://petstore:petstore@localhost:5432/petstore`.

## Scope and phases
| Phase | Features | Milestone demo | Entry criterion |
| --- | --- | --- | --- |
| 1 | API foundation (data model, health), add pet, list pets by status, web screens | Staff add a pet at `/add` and see it in the list at `/` under its status | Architecture and specs approved |

Out of scope: logins, orders, customers, photos.

## Decisions
### Frontend: Next.js 15.x (App Router, TypeScript)
- **Decision:** Next.js 15.x with the App Router and TypeScript, in `web/`, port 3000.
- **Rationale:** MAD has `nextjs-standards`; a two-screen staff app needs nothing heavier.
- **Implementation:** Own Dockerfile in `web/`; `web/README.md` gives the commands to run it
  without Docker. Pet ids stay strings end to end (never `Number()`); every element in
  `contracts/testids.md` carries its `data-testid`; errors show in `form-error`.
- **Notes:** Desktop browser only.

### Backend: FastAPI 0.115.x (Python 3.12)
- **Decision:** FastAPI 0.115.x on Python 3.12, in `api/`, port 8000.
- **Rationale:** MAD has `fastapi-standards`; FastAPI's Pydantic models map directly onto the
  OpenAPI contract.
- **Implementation:** Own Dockerfile in `api/`; `api/README.md` gives the commands to run it
  without Docker. Follows `contracts/petstore-pets.yaml` exactly: ids are int64 in storage and
  decimal strings on the wire; errors are `{detail}` JSON (422 validation, 404 missing pet);
  `GET /health` returns 200.
- **Notes:** The contract is never changed.

### Database: PostgreSQL 17
- **Decision:** PostgreSQL 17, the `db` service in `compose.yaml`.
- **Rationale:** Already provided by the repo's local runtime.
- **Implementation:** `BIGINT` pet ids from a sequence that starts above 2^53; schema
  migrations owned by the API.
- **Notes:** Local credentials only (`petstore`/`petstore`), from `compose.yaml`.

### Deployment
- **Decision:** None (local only); the app runs with the repo's local tooling.
- **Rationale:** The learner chose not to use a cloud account for this run.
- **Notes:** Run with `docker compose --profile app up -d --build`, then open
  http://localhost:3000. A cloud target can be added later as a new decision.
