from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from src.database import get_db
from src.main import app

FIRST_ID = "9007199254740993"


@pytest.fixture
async def client(engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def override_db() -> AsyncIterator:  # type: ignore[type-arg]
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def test_add_then_get_round_trip(client: AsyncClient) -> None:
    created = await client.post(
        "/pet", json={"name": "Rex", "status": "available", "category": {"name": "Dogs"}}
    )
    assert created.status_code == 200
    body = created.json()
    assert isinstance(body["id"], str) and int(body["id"]) >= int(FIRST_ID)
    assert body["name"] == "Rex"
    assert body["category"] == {"name": "Dogs"}

    got = await client.get(f"/pet/{body['id']}")
    assert got.status_code == 200
    assert got.json() == body


async def test_category_omitted(client: AsyncClient) -> None:
    r = await client.post("/pet", json={"name": "Tom", "status": "sold"})
    assert r.status_code == 200
    assert "category" not in r.json()


async def test_name_stored_as_sent_and_duplicates_allowed(client: AsyncClient) -> None:
    a = await client.post("/pet", json={"name": "  Rex  ", "status": "pending"})
    b = await client.post("/pet", json={"name": "  Rex  ", "status": "pending"})
    assert a.json()["name"] == "  Rex  "
    assert a.json()["id"] != b.json()["id"]


@pytest.mark.parametrize(
    "body",
    [
        {"status": "available"},
        {"name": "", "status": "available"},
        {"name": "x" * 101, "status": "available"},
        {"name": "Rex", "status": "gone"},
        {"name": "Rex", "status": "available", "category": {"name": ""}},
        {"name": "Rex", "status": "available", "category": {"name": "x" * 51}},
        {"name": "Rex", "status": "available", "extra": 1},
        {"name": "Rex", "status": "available", "category": {"name": "a", "extra": 1}},
        {"name": 5, "status": "available"},
        {"name": "Rex", "status": "available", "category": None},
        ["not", "an", "object"],
    ],
)
async def test_invalid_bodies_return_422(client: AsyncClient, body: object) -> None:
    r = await client.post("/pet", json=body)
    assert r.status_code == 422
    assert "detail" in r.json()


async def test_boundary_lengths_accepted(client: AsyncClient) -> None:
    r = await client.post(
        "/pet", json={"name": "x" * 100, "status": "sold", "category": {"name": "c" * 50}}
    )
    assert r.status_code == 200


async def test_malformed_json_returns_400(client: AsyncClient) -> None:
    r = await client.post("/pet", content="{nope", headers={"content-type": "application/json"})
    assert r.status_code == 400
    assert "detail" in r.json()


@pytest.mark.parametrize("pet_id", ["1", "9999999999999999999", "9223372036854775807"])
async def test_unknown_id_returns_404(client: AsyncClient, pet_id: str) -> None:
    r = await client.get(f"/pet/{pet_id}")
    assert r.status_code == 404
    assert "detail" in r.json()


@pytest.mark.parametrize("pet_id", ["abc", "-1", "1.5", "1" * 20])
async def test_bad_id_returns_422(client: AsyncClient, pet_id: str) -> None:
    r = await client.get(f"/pet/{pet_id}")
    assert r.status_code == 422
    assert "detail" in r.json()
