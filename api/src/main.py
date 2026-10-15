from fastapi import FastAPI

from src.config import settings
from src.exceptions import register_exception_handlers

docs_enabled = settings.ENVIRONMENT in {"local", "staging"}

app = FastAPI(
    title="MAD Petstore API",
    openapi_url="/openapi.json" if docs_enabled else None,
    docs_url="/docs" if docs_enabled else None,
    redoc_url=None,
)
register_exception_handlers(app)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
