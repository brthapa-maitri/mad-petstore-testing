import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from src.pets.schemas import Pet, PetStatus

FIRST_ID = 9007199254740993  # 2^53 + 1


async def test_migration_creates_pet_table_and_sequence(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        table = await conn.scalar(text("SELECT to_regclass('pet')"))
        # start_value, not nextval: other tests in the session consume the sequence.
        first = await conn.scalar(
            text(
                "SELECT start_value FROM pg_sequences "
                "WHERE sequencename = 'pet_id_seq' AND schemaname = current_schema()"
            )
        )
    assert table == "pet"
    assert first == FIRST_ID


async def test_status_check_constraint(engine: AsyncEngine) -> None:
    from sqlalchemy.exc import IntegrityError

    async with engine.connect() as conn:
        with pytest.raises(IntegrityError):
            await conn.execute(text("INSERT INTO pet (name, status) VALUES ('x', 'gone')"))


def test_pet_serialises_large_int_id_as_exact_string() -> None:
    pet = Pet(id=FIRST_ID, name="Rex", status=PetStatus.available)
    assert pet.id == "9007199254740993"
    assert pet.model_dump(mode="json")["id"] == "9007199254740993"


def test_pet_rejects_non_decimal_id() -> None:
    with pytest.raises(ValidationError):
        Pet(id="abc", name="Rex", status=PetStatus.sold)
