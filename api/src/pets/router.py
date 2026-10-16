from typing import Any

from fastapi import APIRouter

from src.pets import service
from src.pets.dependencies import DbDep, PetDep, StatusDep
from src.pets.schemas import NewPet, Pet

router = APIRouter(prefix="/pet", tags=["pets"])


@router.post(
    "", response_model=Pet, status_code=200, response_model_exclude_none=True, operation_id="addPet"
)
async def add_pet(body: NewPet, db: DbDep) -> Any:
    return await service.create(db, body)


@router.get(
    "/findByStatus",
    response_model=list[Pet],
    response_model_exclude_none=True,
    operation_id="findPetsByStatus",
)
async def find_pets_by_status(status: StatusDep, db: DbDep) -> Any:
    return await service.find_by_status(db, status.value)


@router.get(
    "/{petId}", response_model=Pet, response_model_exclude_none=True, operation_id="getPetById"
)
async def get_pet(pet: PetDep) -> Any:
    return pet
