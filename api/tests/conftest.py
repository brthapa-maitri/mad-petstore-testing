import asyncio
import os
import uuid
from collections.abc import AsyncIterator, Iterator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from src.config import settings


async def _execute(sql: str) -> None:
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        await conn.execute(text(sql))
    await engine.dispose()


@pytest.fixture(scope="session")
def db_schema() -> Iterator[str]:
    """An ephemeral schema in the compose Postgres, migrated to head and dropped afterwards."""
    schema = f"test_{uuid.uuid4().hex[:12]}"
    asyncio.run(_execute(f'CREATE SCHEMA "{schema}"'))
    os.environ["ALEMBIC_SCHEMA"] = schema
    try:
        command.upgrade(Config("alembic.ini"), "head")
        yield schema
    finally:
        os.environ.pop("ALEMBIC_SCHEMA", None)
        asyncio.run(_execute(f'DROP SCHEMA "{schema}" CASCADE'))


@pytest.fixture
async def engine(db_schema: str) -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(
        settings.async_database_url,
        connect_args={"server_settings": {"search_path": db_schema}},
    )
    yield eng
    await eng.dispose()
