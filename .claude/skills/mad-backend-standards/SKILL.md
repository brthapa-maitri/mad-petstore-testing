---
name: mad-backend-standards
description: >
  Project backend standards for the FastAPI / Pydantic v2 / SQLAlchemy 2.0 (async) stack.
  Invoke before writing, changing, or reviewing any FastAPI route handler, dependency,
  Pydantic schema, SQLAlchemy model, service, settings module, Alembic migration, or
  backend test. Enforces domain-based project structure, async/blocking discipline,
  Annotated dependencies, per-domain settings, async SQLAlchemy conventions, background-work
  boundaries, the httpx + real-DB test setup, ruff, and a review checklist of anti-patterns;
  requires invoking api-and-interface-design before any endpoint, schema, or public
  interface is designed or changed.
---

# Backend standards — FastAPI

Stack (after zhanymkanov/fastapi-best-practices): FastAPI, Pydantic v2, async SQLAlchemy
(2.0-style API), ruff. No versions are pinned here — the project's manifests own them.

## Before you start

- **Invoke the `api-and-interface-design` skill first** whenever the task designs or changes
  any endpoint, request/response schema, error shape, pagination, or public service
  signature. It owns URL/method/status rules, the error envelope, schema hygiene, and
  compatibility rules — this skill does not repeat them.

## Project structure — by domain, not by file type

```
src/
├── {domain}/            # auth/, orders/, ...
│   ├── router.py        # endpoints only
│   ├── schemas.py       # Pydantic models
│   ├── models.py        # SQLAlchemy ORM models
│   ├── service.py       # business logic
│   ├── dependencies.py  # route dependencies (load + validate)
│   ├── config.py        # domain-scoped BaseSettings
│   ├── constants.py     # constants, error codes
│   └── exceptions.py    # domain exceptions
├── config.py            # global BaseSettings
├── models.py            # shared Pydantic / ORM bases
├── exceptions.py        # global exceptions + handlers
├── database.py          # async engine + session factory
└── main.py              # FastAPI app + lifespan
```

- Cross-domain imports use the explicit module form: `from src.auth import service as
  auth_service`, `from src.posts.constants import ErrorCode as PostsErrorCode`. Never
  `import *` and never deep paths like `from src.auth.service.user import ...`.
- `service.py` and `models.py` do not import from `fastapi`/`starlette`.

## Async routes

| Route does this | Use |
| --- | --- |
| `await`-able non-blocking I/O | `async def` |
| Blocking I/O with no async client | `def` (runs in the threadpool) |
| Mix of both | `async def` + `await run_in_threadpool(blocking_fn, ...)` |
| CPU-bound work (> 50 ms) | offload to a worker process (Celery / Arq / RQ) |

- Never call `requests`, `time.sleep`, `open()`, or a sync DB driver inside `async def` — it
  freezes the event loop for every request on that worker.
- Don't make routes or dependencies sync "just because": the threadpool has 40 threads and
  saturating it slows every sync route.

## Pydantic

- Use built-in validators and constraints — `EmailStr`, `AnyUrl`, `Field(min_length=,
  max_length=, pattern=, ge=)`, `StrEnum` — before writing a custom `field_validator`.
- Never `Field(ge=18, default=None)`: a constraint and a `None` default contradict. Pick
  required (`int = Field(ge=18)`) or optional (`int | None = Field(default=None, ge=18)`).
- `json_encoders` is deprecated: use `@field_serializer` on one project base model in
  `src/models.py` (e.g. tz-aware datetime → ISO-8601 UTC) and inherit from it. No v1 APIs
  (`.dict()`, `.parse_obj()`, `class Config`, `@validator`).

## Settings

- One `BaseSettings` subclass **per domain** (`src/auth/config.py` → `AuthConfig` with
  `env_prefix="AUTH_"`), plus a small global `src/config.py`. Never one settings object
  that every domain reads.
- `SettingsConfigDict(env_file=".env", extra="ignore")`; secrets have no defaults; no
  `os.environ[...]` outside `config.py` modules.

## Dependencies

- Always `Annotated[T, Depends(fn)]`, aliased once and reused (`PostDep = Annotated[Post,
  Depends(valid_post_id)]`). The default-argument form `x: T = Depends(fn)` is not accepted.
- Dependencies **load and validate**, not just inject: `valid_post_id` fetches the row and
  raises `PostNotFound` if missing, returning the object — routes never repeat that check.
- Chain dependencies when one check builds on another. Use the same path-variable name across routes so one dependency serves all.
- Dependencies are cached per request; rely on it instead of passing results around. Tests
  swap them via `app.dependency_overrides`, never by monkeypatching internals.

## Database — SQLAlchemy 2.0 async

- `create_async_engine(..., pool_pre_ping=True)` + `async_sessionmaker(expire_on_commit=False)`
  in `src/database.py`; `get_db` yields an `AsyncSession`. 2.0 style only: `Mapped[...]`,
  `mapped_column(...)`, `select()` — no `query()`, no sync session, no `encode/databases`.
- Naming: `lower_snake`, **singular** tables (`post`, `user`, `post_like`), prefix-grouped
  (`payment_account`, `payment_bill`), `_at` for datetimes, `_date` for dates, the same FK
  column name everywhere (`profile_id` in every table, never `user_id` in some).
- `MetaData(naming_convention=...)` with explicit `ix`/`uq`/`ck`/`fk`/`pk` templates so every
  constraint name is deterministic and migrations stay reviewable.
- SQL-first, Pydantic-second: joins, aggregation, and JSON shaping happen in SQL; Pydantic
  validates the result, it doesn't transform it.

## Background work

- `BackgroundTasks` only for < 1 s in-process work that may be silently lost (they run after
  the response in the same worker and die with it — never for anything you'd page on).
- This project has no task queue: work that would need retries, visibility, scheduling,
  rate limiting, or CPU is out of scope — raise it with the lead instead of adding one.

## Migrations (Alembic)

- Async template (`alembic init -t async migrations`); dated slugs via `file_template =
  %%(year)d-%%(month).2d-%%(day).2d_%%(slug)s` (`2026-04-14_add_post_content_idx.py`).
- Static (no app-model imports in `upgrade`) and reversible (`downgrade()` implemented);
  never edit a merged migration — add a new one.

## Testing

These commands take effect once the API scaffolding story lands; run them from `api/`.

- `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`; never
  `async_asgi_testclient`.
- Integration tests hit a **real** database (an ephemeral schema created per test session in the
  compose `db` Postgres, `docker compose up -d db`, and dropped afterwards); mock only auth/external services via `dependency_overrides`.
  Run: `uv run pytest`.

## Docs, lint, tooling

- `openapi_url=None` unless `settings.ENVIRONMENT in {"local", "staging"}`.
- `ruff check --fix` + `ruff format` + `mypy src/` in pre-commit and CI. Package manager:
  uv (`uv sync`, `uv run ruff check --fix`, `uv run ruff format`, `uv run mypy src/`).

## Review checklist — anti-patterns to reject

- Blocking call (`requests`, `time.sleep`, `open`, sync driver) inside `async def`.
- `async_asgi_testclient`; `encode/databases`.
- `ConfigDict(json_encoders=...)`; `Field(ge=..., default=None)`; default-arg `Depends`.
- `except Exception` around a route body — hides bugs, turns 500s into silent 200s.
- `BackgroundTasks` for work that needs retries; deep cross-domain imports; one global
  `BaseSettings`; a mocked DB in integration tests.
- Returning an instance of `X` **and** setting `response_model=X` — the model is built twice;
  return the ORM row/dict and let `response_model` validate.
