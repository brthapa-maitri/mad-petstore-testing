from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

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

    @model_validator(mode="before")
    @classmethod
    def category_not_null(cls, v: Any) -> Any:
        # The contract makes category optional, not nullable: omit it rather than send null.
        if isinstance(v, dict) and "category" in v and v["category"] is None:
            raise ValueError("category must be omitted rather than null")
        return v


class Pet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PetId
    name: str
    status: PetStatus
    category: Category | None = None

    @model_validator(mode="before")
    @classmethod
    def from_orm_row(cls, v: Any) -> Any:
        # The row stores the category as a flat column; the API nests it.
        if hasattr(v, "category_name"):
            category = {"name": v.category_name} if v.category_name is not None else None
            return {"id": v.id, "name": v.name, "status": v.status, "category": category}
        return v

    @field_validator("id", mode="before")
    @classmethod
    def id_as_string(cls, v: int | str) -> str:
        # Ids are 64-bit in storage; they cross every boundary as decimal strings.
        return str(v)
