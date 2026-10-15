from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers)


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    # Unparseable JSON is a 400; a parseable body that fails validation is a 422.
    if any(err["type"] == "json_invalid" for err in exc.errors()):
        return JSONResponse({"detail": "Malformed JSON body"}, status_code=400)
    return JSONResponse({"detail": jsonable_encoder(exc.errors())}, status_code=422)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
