# ruff: noqa: F811
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from tests.pets.test_add_get import client  # noqa: F401

pytestmark = pytest.mark.usefixtures("empty_pet_table")


@pytest.fixture
async def empty_pet_table(engine: AsyncEngine) -> None:
    # The test schema is shared by the session; list results need a known starting set.
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM pet"))


async def _add(client: AsyncClient, name: str, status: str) -> str:
    r = await client.post("/pet", json={"name": name, "status": status})
    return str(r.json()["id"])


async def test_each_status_returns_only_its_pets_newest_first(client: AsyncClient) -> None:
    a1 = await _add(client, "a1", "available")
    await _add(client, "p1", "pending")
    a2 = await _add(client, "a2", "available")
    r = await client.get("/pet/findByStatus", params={"status": "available"})
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert ids == [a2, a1]
    assert all(p["status"] == "available" for p in r.json())


async def test_empty_array_when_none(client: AsyncClient) -> None:
    await _add(client, "a", "available")
    r = await client.get("/pet/findByStatus", params={"status": "sold"})
    assert r.status_code == 200
    assert r.json() == []


async def test_repeated_same_status_ok(client: AsyncClient) -> None:
    await _add(client, "a", "sold")
    r = await client.get("/pet/findByStatus?status=sold&status=sold")
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.parametrize(
    "query", ["", "?status=bogus", "?status=", "?status=sold&status=pending", "?status=Sold"]
)
async def test_bad_status_is_422(client: AsyncClient, query: str) -> None:
    r = await client.get(f"/pet/findByStatus{query}")
    assert r.status_code == 422
    assert "detail" in r.json()
