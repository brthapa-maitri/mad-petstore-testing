from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.pets.models import Pet
from src.pets.schemas import NewPet

# Largest value a Postgres BIGINT holds; a well-formed id above it can match no row.
INT64_MAX = 9223372036854775807


async def create(db: AsyncSession, data: NewPet) -> Pet:
    # Name is stored exactly as sent: the contract only constrains length.
    pet = Pet(
        name=data.name,
        status=data.status.value,
        category_name=data.category.name if data.category else None,
    )
    db.add(pet)
    await db.commit()
    await db.refresh(pet)
    return pet


async def get(db: AsyncSession, pet_id: int) -> Pet | None:
    if pet_id > INT64_MAX:
        return None
    return await db.get(Pet, pet_id)


async def find_by_status(db: AsyncSession, status: str) -> list[Pet]:
    # One indexed SELECT (pet_status_idx); ids rise with the sequence, so id DESC is newest first.
    result = await db.scalars(select(Pet).where(Pet.status == status).order_by(Pet.id.desc()))
    return list(result)
