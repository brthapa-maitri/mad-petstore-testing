from typing import Annotated

from fastapi import Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.pets import service
from src.pets.exceptions import PetNotFound
from src.pets.models import Pet
from src.pets.schemas import PetId, PetStatus

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def valid_pet_id(pet_id: Annotated[PetId, Path(alias="petId")], db: DbDep) -> Pet:
    pet = await service.get(db, int(pet_id))
    if pet is None:
        raise PetNotFound()
    return pet


PetDep = Annotated[Pet, Depends(valid_pet_id)]


async def valid_status(status: Annotated[list[PetStatus], Query()]) -> PetStatus:
    # The contract takes exactly one status; a repeat of the same value is harmless,
    # different values conflict.
    if len(set(status)) != 1:
        raise HTTPException(status_code=422, detail="status must be given exactly once")
    return status[0]


StatusDep = Annotated[PetStatus, Depends(valid_status)]
