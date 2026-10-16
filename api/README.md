# MAD Petstore API

FastAPI + Pydantic v2 + async SQLAlchemy + Alembic, managed with [uv](https://docs.astral.sh/uv/).

## Run without Docker

From this directory (`api/`), with the database running (`docker compose up -d db` from the repo root):

```bash
uv sync                                   # install dependencies
uv run alembic upgrade head               # create the pet table and pet_id_seq
uv run uvicorn src.main:app --port 8000   # start the API
curl -fsS localhost:8000/health           # {"status":"ok"}
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://petstore:petstore@localhost:5432/petstore` | Postgres connection URL (plain `postgresql://`; the async driver is added internally) |
| `ENVIRONMENT` | `local` | `local` and `staging` serve `/docs` and `/openapi.json`; anything else hides them |

Inside Docker Compose the API uses `postgresql://petstore:petstore@db:5432/petstore`.

## Checks

```bash
uv run pytest          # needs the database; uses an ephemeral schema, dropped afterwards
uv run ruff check
uv run ruff format --check
uv run mypy src/
```

## Notes

- Pet ids are 64-bit in the database (`pet_id_seq` starts at 9007199254740993, 2^53 + 1) and
  decimal strings in the API.
- Errors are `{"detail": ...}` JSON: 422 validation, 404 unknown path/pet, 400 malformed JSON.
