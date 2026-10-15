from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

PetId = Annotated[str, Field(pattern=r"^[0-9]{1,19}$")]


class PetStatus(StrEnum):
    available = "available"
    pending = "pending"
    sold = "sold"


class Category(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=50)


class NewPet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    status: PetStatus
    category: Category | None = None


class Pet(BaseModel):
    id: PetId
    name: str
    status: PetStatus
    category: Category | None = None

    @field_validator("id", mode="before")
    @classmethod
    def id_as_string(cls, v: int | str) -> str:
        # Ids are 64-bit in storage; they cross every boundary as decimal strings.
        return str(v)
