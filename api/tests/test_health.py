import httpx
import pytest
from fastapi import FastAPI
from pydantic import BaseModel

from src.exceptions import register_exception_handlers
from src.main import app


def client_for(target: FastAPI) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=target), base_url="http://test")


async def test_health_returns_ok() -> None:
    async with client_for(app) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_unknown_path_returns_404_detail() -> None:
    async with client_for(app) as client:
        response = await client.get("/nope")
    assert response.status_code == 404
    assert "detail" in response.json()


class Body(BaseModel):
    name: str


@pytest.fixture
def body_app() -> FastAPI:
    # No pet routes exist yet, so exercise the handlers on a throwaway route.
    probe = FastAPI()
    register_exception_handlers(probe)

    @probe.post("/probe")
    async def probe_route(body: Body) -> dict[str, str]:
        return {"name": body.name}

    return probe


async def test_malformed_json_returns_400_detail(body_app: FastAPI) -> None:
    async with client_for(body_app) as client:
        response = await client.post(
            "/probe", content="{not json", headers={"content-type": "application/json"}
        )
    assert response.status_code == 400
    assert "detail" in response.json()


async def test_invalid_body_returns_422_detail(body_app: FastAPI) -> None:
    async with client_for(body_app) as client:
        response = await client.post("/probe", json={"name": 5})
    assert response.status_code == 422
    assert "detail" in response.json()
