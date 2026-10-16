import asyncio
import os

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from src.config import settings

config = context.config

# Migrations are static (no app-model imports), so there is no target metadata.
target_metadata = None

# Tests point Alembic at an ephemeral schema through this variable.
SCHEMA = os.environ.get("ALEMBIC_SCHEMA")


def _url() -> str:
    return settings.async_database_url


def run_migrations_offline() -> None:
    # Offline (--sql) mode emits plain SQL and ignores ALEMBIC_SCHEMA: the ephemeral test
    # schema is an online-only feature (it needs a connection to SET search_path).
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        version_table_schema=SCHEMA,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _url()
    connectable = async_engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        if SCHEMA:
            from sqlalchemy import text

            await connection.execute(text(f'SET search_path TO "{SCHEMA}"'))
            await connection.commit()
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
