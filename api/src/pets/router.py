from typing import Any

from fastapi import APIRouter

from src.pets import service
from src.pets.dependencies import DbDep, PetDep
from src.pets.schemas import NewPet, Pet

router = APIRouter(prefix="/pet", tags=["pets"])


@router.post(
    "", response_model=Pet, status_code=200, response_model_exclude_none=True, operation_id="addPet"
)
async def add_pet(body: NewPet, db: DbDep) -> Any:
    return await service.create(db, body)


@router.get(
    "/{petId}", response_model=Pet, response_model_exclude_none=True, operation_id="getPetById"
)
async def get_pet(pet: PetDep) -> Any:
    return pet
