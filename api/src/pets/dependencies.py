from typing import Annotated

from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.pets import service
from src.pets.exceptions import PetNotFound
from src.pets.models import Pet
from src.pets.schemas import PetId

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def valid_pet_id(pet_id: Annotated[PetId, Path(alias="petId")], db: DbDep) -> Pet:
    pet = await service.get(db, int(pet_id))
    if pet is None:
        raise PetNotFound()
    return pet


PetDep = Annotated[Pet, Depends(valid_pet_id)]
