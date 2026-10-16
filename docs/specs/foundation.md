# Spec: Foundation

Feature 1 of 3 (build order: foundation → add a pet → pet list by status).

## Objective
Give the team a running, empty app to build the two screens on: an API in `api/` and a web app
in `web/` that both start with `docker compose --profile app up -d --build`, a `pet` table whose
ids are 64-bit and start above 2^53, a health check, and the contract's error shape. No pet
endpoints and no finished screens yet; those are features 2 and 3.

Users: the developers and QA agents on the team (staff see nothing new yet).

## Tech Stack
As in `docs/ARCHITECTURE.md`: FastAPI + Pydantic v2 + async SQLAlchemy + Alembic (Python, uv),
Next.js App Router + TypeScript + Zod (npm), PostgreSQL (`db` in `compose.yaml`). Versions live in
`api/pyproject.toml` and `web/package.json`, not in the standards.

## Commands
- Database: `docker compose up -d db`
- Whole app: `docker compose --profile app up -d --build`, then http://localhost:3000
- API, from `api/`: `uv sync`, `uv run alembic upgrade head`,
  `uv run uvicorn src.main:app --port 8000`, `uv run pytest`, `uv run ruff check`, `uv run mypy src/`
- Web, from `web/`: `npm ci`, `npm run dev` (port 3000), `npm test`, `npm run lint`,
  `npx tsc --noEmit`, `npm run build`

## Project Structure
```
api/
├── Dockerfile            # runs `alembic upgrade head`, then uvicorn on :8000
├── README.md             # no-Docker commands, env vars, DATABASE_URL
├── pyproject.toml, uv.lock
├── migrations/           # Alembic (async template); first migration creates the pet table
├── src/
│   ├── main.py           # app, lifespan, exception handlers, /health
│   ├── config.py         # global settings: DATABASE_URL, ENVIRONMENT
│   ├── database.py       # async engine + session factory
│   ├── exceptions.py     # {detail} handlers: 422 validation, 404, 400 malformed JSON
│   ├── models.py         # shared bases, MetaData naming convention
│   └── pets/             # models.py (Pet ORM), schemas.py (PetId, PetStatus, Category, NewPet, Pet)
└── tests/                # pytest + httpx ASGITransport, real Postgres (ephemeral schema)
web/
├── Dockerfile            # npm ci, next build, next start on :3000
├── README.md             # no-Docker commands, env vars (API_URL)
├── next.config.ts        # rewrite /health → /api/health
└── src/
    ├── app/layout.tsx, page.tsx (`/`), add/page.tsx (`/add`), api/health/route.ts
    ├── server/api.ts     # "server-only" fetch wrapper around API_URL
    ├── lib/schemas/pet.ts  # Zod: PetId (string), PetStatus, Category, NewPet, Pet
    └── env.ts            # Zod-validated env (API_URL)
README.md                 # new section "Run it on your machine"
```

## Data model
`pet` table: `id BIGINT PRIMARY KEY DEFAULT nextval('pet_id_seq')`, `name VARCHAR(100) NOT NULL`,
`status VARCHAR NOT NULL CHECK (status IN ('available','pending','sold'))`,
`category_name VARCHAR(50) NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, index on
`status`. `pet_id_seq` is a `BIGINT` sequence **START WITH 9007199254740993** (2^53 + 1).

## Code Style
Ids cross every boundary as decimal strings:

```python
# api/src/pets/schemas.py
PetId = Annotated[str, Field(pattern=r"^[0-9]{1,19}$")]

class Pet(BaseModel):
    id: PetId
    name: str
    status: PetStatus
    category: Category | None = None

    @field_validator("id", mode="before")
    @classmethod
    def id_as_string(cls, v: int | str) -> str:
        return str(v)
```

```ts
// web/src/lib/schemas/pet.ts
export const PetId = z.string().regex(/^[0-9]{1,19}$/); // never z.number(), never Number(id)
```

Everything else follows `mad-backend-standards` and `mad-frontend-standards`.

## Testing Strategy
- API (pytest, `api/tests/`): `/health` returns 200 `{"status":"ok"}`; the migration creates
  `pet` and the sequence's first value is 9007199254740993; an unknown route returns 404 `{detail}`;
  a malformed JSON body returns 400 `{detail}`; Pydantic `Pet` serialises an int id above 2^53 to
  the exact decimal string.
- Web (Vitest, `web/src/**/*.test.ts`): the `PetId` schema rejects numbers and accepts a
  19-digit string; `/api/health` returns 200 when the API is up and 503 when it is not.
- Smoke: with the app up, `curl -fsS localhost:8000/health` and `curl -fsS localhost:3000/health`
  both succeed.

## Boundaries
- Always: keep ids as strings outside the database; return `{detail}` JSON for every error; call
  the API only from server code via `API_URL`; put every root element's `data-testid` in place.
- Ask first: adding a dependency beyond the standards' stack; changing `compose.yaml`.
- Never: edit `contracts/` or the top-level `tests/`; add CORS or browser calls to :8000; use
  `Number()`/`parseInt()` on an id; commit `.env` files.

## Success Criteria
1. `docker compose --profile app up -d --build` starts db, api and web; all three stay healthy.
2. `GET http://localhost:8000/health` → 200; `GET http://localhost:3000/health` → 200 while the
   API is up, 503 when it is stopped.
3. After the migration, `SELECT nextval('pet_id_seq')` on a fresh database returns 9007199254740993.
4. An unknown API path returns 404 with a JSON `{detail}` body; malformed JSON to any route
   returns 400 `{detail}`.
5. `http://localhost:3000/` renders `data-testid="pet-list-page"` and `/add` renders
   `data-testid="add-pet-page"`, styled after `prototype/index.html`.
6. `uv run pytest`, `uv run ruff check`, `uv run mypy src/`, `npm test`, `npm run lint`,
   `npx tsc --noEmit` and `npm run build` all pass.
7. README.md has a "Run it on your machine" section (start command and URL); `api/README.md` and
   `web/README.md` give install, start, env vars and the database URL without Docker.

## Resolved Questions
- Where does the web app call the API from? → Server side only (Server Components and Server
  Actions via `API_URL`); the browser never calls :8000 and the API has no CORS.
- Which URL answers `GET /health`? → Both: the API on :8000, and the web app on :3000 (a
  rewrite to `app/api/health/route.ts`, which checks the API and returns 503 if it is down).
- Where does the pet id sequence start? → 2^53 + 1 = 9007199254740993.
- Deployment? → None (local only), per `docs/ARCHITECTURE.md`.
