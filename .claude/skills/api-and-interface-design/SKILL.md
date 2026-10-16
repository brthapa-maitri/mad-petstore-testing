---
name: api-and-interface-design
description: Guides stable API and interface design for the FastAPI/Python backend. Use when designing REST endpoints, Pydantic schemas, module boundaries, or any contract between services. Use when defining request/response models, the contract the Next.js frontend consumes, error semantics, pagination, or tenant-scoped access.
---

# API and Interface Design (FastAPI / Python)

## Overview

Design stable, well-documented interfaces that are hard to misuse. Good interfaces make the right thing easy and the wrong thing hard. This applies to REST endpoints, Pydantic request/response schemas, SQLAlchemy-backed service boundaries, Celery task signatures, and any surface where one piece of code talks to another.


## When to Use

- Designing new API endpoints or a new `APIRouter`
- Defining Pydantic request/response schemas (the contract the frontend consumes)
- Establishing service-layer or module boundaries
- Defining Celery task signatures (they are interfaces too — see below)
- Designing tenant-scoped or RBAC-gated access
- Changing any existing public interface

## Core Principles

### Hyrum's Law

> With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

Every observable behavior — undocumented fields, error message text, ordering, the shape FastAPI emits when you `return` an ORM object — becomes a de facto contract once a consumer depends on it. Design implications:

- **Be intentional about what you expose.** Always set an explicit `response_model`; never `return` a SQLAlchemy model directly (it serializes every loaded column, leaking `tenant_id` internals, `password_hash`, soft-delete flags, the opaque-token mapping, etc.).
- **Don't leak implementation details.** Internal columns, DB enum spellings, and stack traces are not contract. A `response_model` is the seam that keeps them out.
- **Tests are not enough.** Even with perfect contract tests, "safe" changes can break consumers who depend on undocumented behavior.

### The One-Version Rule

Avoid forcing consumers to choose between versions of the same contract. We pin a single API version prefix (`/api/v1/...`) and **extend it additively** rather than spawning `/v2` for every change. A new major version is a last resort, not a routine release valve — diamond dependencies (frontend on v1, a portal on v2, both hitting one service) multiply maintenance cost. Design for a world where one version exists at a time.

### 1. Contract First

Define the Pydantic schema before implementing the handler. The schema *is* the spec — and FastAPI turns it into OpenAPI automatically.

```python
# schemas/task.py — define the contract first
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class TaskCreate(BaseModel):
    """Input: what the caller provides on create."""
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: Priority = Priority.MEDIUM

class TaskUpdate(BaseModel):
    """Input: partial update — every field optional."""
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: Priority | None = None

class TaskRead(BaseModel):
    """Output: what the system returns, including server-generated fields."""
    model_config = ConfigDict(from_attributes=True)  # build from an ORM object safely

    id: UUID
    title: str
    description: str | None
    priority: Priority
    created_at: datetime
    updated_at: datetime
    created_by: UUID
```

The router references those models explicitly so the OpenAPI contract is locked:

```python
@router.post("", response_model=TaskRead, status_code=201)
async def create_task(payload: TaskCreate, ctx: TenantContext = Depends(require_tenant)):
    task = await task_service.create(ctx, payload)
    return task  # filtered through TaskRead — only contract fields escape
```

### 2. Consistent Error Semantics

Pick one error envelope and use it everywhere — including for FastAPI's own validation errors.

```python
# Every error response, from every endpoint, has this shape:
# {
#   "error": {
#     "code": "VALIDATION_ERROR",   # machine-readable, stable
#     "message": "Title is required", # human-readable
#     "details": { ... }              # optional extra context
#   }
# }
```

Status code mapping:

```text
400 → Malformed request (not parseable / wrong content type)
401 → Not authenticated
403 → Authenticated but not authorized (RBAC / wrong tenant / no persona)
404 → Resource not found (also: exists but not in caller's tenant — see note)
409 → Conflict (duplicate, version mismatch, illegal state transition)
422 → Validation failed (well-formed but semantically invalid)
500 → Server error (never expose internal details or stack traces)
```

Implement it once with a domain exception plus exception handlers, and **normalize FastAPI's default 422 body** into the same envelope so the frontend never sees two error shapes:

```python
# errors.py
class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, details=None):
        self.status, self.code, self.message, self.details = status, code, message, details

class NotFoundError(APIError):
    def __init__(self, message="Resource not found"):
        super().__init__(404, "NOT_FOUND", message)

# main.py
@app.exception_handler(APIError)
async def api_error_handler(_: Request, exc: APIError):
    return JSONResponse(exc.status, {"error": {
        "code": exc.code, "message": exc.message, "details": exc.details}})

@app.exception_handler(RequestValidationError)  # FastAPI's built-in 422 — re-wrap it
async def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(422, {"error": {
        "code": "VALIDATION_ERROR", "message": "Invalid request data",
        "details": exc.errors()}})
```

**Don't mix patterns.** If some handlers `raise HTTPException`, some return `None`, and some return ad-hoc `{"error": ...}` dicts, the consumer can't predict behavior. Raise typed `APIError` subclasses; let the handler render the envelope.

> **Tenant note:** prefer **404 over 403** when a resource exists but belongs to another tenant — a 403 confirms the ID exists and leaks it across the tenant boundary. Fail closed.

### 3. Validate at Boundaries

Trust internal code. Validate at the system edges where external input enters. In FastAPI the boundary is the Pydantic model on the route signature — let it do the work; don't re-validate downstream.

```python
@router.post("", response_model=TaskRead, status_code=201)
async def create_task(payload: TaskCreate, ctx: TenantContext = Depends(require_tenant)):
    # `payload` is already validated and typed. The service layer trusts it.
    return await task_service.create(ctx, payload)
```

Where validation belongs:
- Route handlers (request bodies, query/path params) — via Pydantic models and `Annotated[..., Query()/Path()]`
- The public intake form handler (untrusted public input)
- **External service responses** (Twilio/SendGrid webhooks, Google Calendar) — **always untrusted**; parse into a Pydantic model before using
- Settings / environment loading (`pydantic-settings`)

> **Third-party payloads are untrusted data.** An inbound email webhook or a misbehaving provider can send unexpected types, oversized fields, or instruction-like text. Validate shape and content into a Pydantic model before it touches any logic, persistence, or tenant resolution.

Where validation does **not** belong:
- Between internal service functions that already share Pydantic/typed contracts
- On rows you just read from your own database
- In helpers called only by already-validated code

### 4. Prefer Addition Over Modification

Extend schemas without breaking existing consumers.

```python
# Good: add optional fields with defaults — old clients keep working
class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: Priority = Priority.MEDIUM   # added later, defaulted
    labels: list[str] = Field(default_factory=list)  # added later, defaulted

# Bad: change or remove existing fields — breaks existing consumers
class TaskCreate(BaseModel):
    title: str
    # description: str | None   # removed → breaks callers that send it
    priority: int               # changed str→int → breaks callers
```

A new **required** field on an input model is a breaking change. Add it optional-with-default, backfill, then tighten only behind a version bump.

### 5. Predictable Naming

The wire format is **snake_case** — it matches Python, Pydantic's default, the existing schema (`claim_id`, `tenant_id`, `email_message_id`), and the auto-generated OpenAPI. TypeScript consumes snake_case fields without issue; do **not** sprinkle per-field camelCase aliases. (If a uniform camelCase wire format is ever mandated, do it in one place with a Pydantic `alias_generator` + `populate_by_name=True`, never field-by-field.)

| Pattern | Convention | Example |
|---|---|---|
| REST paths | Plural nouns, versioned, no verbs | `GET /api/v1/claims`, `POST /api/v1/claims` |
| Path/query params | snake_case | `?sort_by=created_at&page_size=20` |
| Request/response fields | snake_case | `{ "created_at": ..., "claim_id": ... }` |
| Boolean fields | `is_`/`has_`/`can_` prefix | `is_closed`, `has_attachments` |
| Enum values | UPPER_SNAKE (`str, Enum`) | `"IN_PROGRESS"`, `"PARTIAL_FAILURE"` |
| Celery tasks | `verb_noun` | `render_email`, `process_inbound_email` |

```python
from enum import Enum
class Priority(str, Enum):           # serializes as "LOW" / "MEDIUM" / "HIGH"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
```

## REST API Patterns

### Resource Design

Group routes in an `APIRouter` with a versioned prefix and a tag; use sub-resources for containment (mirrors the real `claims/{id}/emails` shape).

```python
router = APIRouter(prefix="/api/v1/claims", tags=["claims"])

# GET    /api/v1/claims                 → list claims (query params filter)
# POST   /api/v1/claims                 → create a claim
# GET    /api/v1/claims/{claim_id}      → get one claim
# PATCH  /api/v1/claims/{claim_id}      → partial update
# DELETE /api/v1/claims/{claim_id}      → delete (idempotent)
# GET    /api/v1/claims/{claim_id}/emails  → list a claim's emails (sub-resource)
# POST   /api/v1/claims/{claim_id}/emails  → enqueue an outbound email
```

### Pagination

Paginate every list endpoint from day one. Use a generic page envelope.

```python
from typing import Annotated, Generic, TypeVar
from fastapi import Query
T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    data: list[T]
    pagination: "PageMeta"

class PageMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int

@router.get("", response_model=Page[ClaimRead])
async def list_claims(
    ctx: TenantContext = Depends(require_tenant),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[str, Query()] = "created_at",
    sort_order: Annotated[Literal["asc", "desc"], Query()] = "desc",
):
    ...
```

### Filtering

Use typed query params for filters; bound and enum-constrain them at the boundary.

```python
@router.get("", response_model=Page[ClaimRead])
async def list_claims(
    status: Annotated[ClaimStatus | None, Query()] = None,
    assignee_id: Annotated[UUID | None, Query()] = None,
    created_after: Annotated[datetime | None, Query()] = None,
    ctx: TenantContext = Depends(require_tenant),
):
    ...
```

### Partial Updates (PATCH)

`PATCH` with an all-optional model; apply only the fields the caller actually sent via `exclude_unset`.

```python
@router.patch("/{claim_id}", response_model=ClaimRead)
async def update_claim(claim_id: UUID, payload: ClaimUpdate,
                       ctx: TenantContext = Depends(require_tenant)):
    changes = payload.model_dump(exclude_unset=True)  # untouched fields stay untouched
    return await claim_service.update(ctx, claim_id, changes)
```

## Pydantic Model Patterns

### Input / Output Separation

Never reuse one model for create, update, and read. Separate models keep server-generated and internal fields out of inputs, and keep internal columns out of outputs.

```python
class ClaimCreate(BaseModel):      # caller-provided only
    insured_id: UUID
    property_id: UUID
    description: str | None = None

class ClaimRead(BaseModel):        # contract output — no tenant internals, no soft-delete flags
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    status: ClaimStatus
    insured_id: UUID
    created_at: datetime
```

### Discriminated Unions for Variants

Model "one of several shapes" with a `Literal` tag and a `discriminator` — Pydantic validates and narrows, and OpenAPI documents each variant.

```python
from typing import Annotated, Literal, Union
from pydantic import Field

class Pending(BaseModel):
    type: Literal["PENDING"]

class InProgress(BaseModel):
    type: Literal["IN_PROGRESS"]
    assignee_id: UUID
    started_at: datetime

class Closed(BaseModel):
    type: Literal["CLOSED"]
    closed_at: datetime
    closed_by: UUID

ClaimState = Annotated[Union[Pending, InProgress, Closed], Field(discriminator="type")]
```

### Typed IDs

Use `UUID` (not bare `str`) so malformed IDs are rejected at the boundary. For extra safety against mixing entity IDs, alias with `NewType`.

```python
from typing import NewType
from uuid import UUID
ClaimId = NewType("ClaimId", UUID)
TenantId = NewType("TenantId", UUID)
# Signals intent and catches "passed a TenantId where a ClaimId was expected" in review/type-check.
```

## FastAPI-Specific Boundaries

### Auth, RBAC & Tenant Scoping via Dependencies

Make access rules a **dependency**, not handler boilerplate. One `require_tenant` / `require_persona` dependency means every route enforces isolation the same way, and the rule lives in one place.

```python
async def require_tenant(user: User = Depends(current_user)) -> TenantContext:
    if user.tenant_id is None:
        raise APIError(403, "NO_TENANT", "User is not bound to a tenant")
    return TenantContext(tenant_id=user.tenant_id, user_id=user.id)

# Fail closed: services filter every query by ctx.tenant_id; a missing tenant
# context must deny, never default to "all tenants".
```

### Celery Task Signatures Are Interfaces Too

A task's name + arguments are a contract: enqueuers and the worker fleet must agree, and in-flight messages outlive a deploy. Keep args **primitive and minimal** (IDs, not ORM objects — they aren't serializable and bloat the broker), add new args **optional with defaults**, and keep tasks idempotent.

```python
@celery_app.task(name="render_email", bind=True, max_retries=5)
def render_email(self, email_message_id: str, tenant_id: str) -> None:
    # IDs only (JSON-serializable over SQS); the task re-reads state from PostgreSQL/S3.
    ...
```

### Async Endpoints That Enqueue Work

When an endpoint hands work to Celery, return **202 Accepted** with enough for the client to track it — don't block the request on the worker.

```python
@router.post("/{claim_id}/emails", response_model=EmailEnqueuedRead, status_code=202)
async def send_email(claim_id: UUID, payload: EmailCreate,
                     ctx: TenantContext = Depends(require_tenant)):
    msg = await email_service.persist_queued(ctx, claim_id, payload)  # status=queued
    render_email.apply_async(args=[str(msg.id), str(ctx.tenant_id)])  # email-out chain
    return msg  # → { "email_message_id": ..., "status": "QUEUED" }
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just `return` the ORM object" | It serializes every column — leaks `tenant_id`, `password_hash`, soft-delete flags. Always set a `response_model`. |
| "We'll document the API later" | FastAPI generates OpenAPI from your schemas now. The Pydantic models *are* the docs — define them first. |
| "`raise HTTPException` is fine everywhere" | Raw `HTTPException` produces FastAPI's default body, not our `{error:{code,message}}` envelope. Raise typed `APIError`s. |
| "We don't need pagination yet" | You will the moment a tenant has 100+ claims. Add it from the start. |
| "PATCH is fiddly, let's use PUT" | PUT forces the client to resend the whole object and risks clobbering concurrent edits. PATCH + `exclude_unset` is what clients want. |
| "camelCase so the frontend is happy" | TS reads snake_case fine, and the existing schema is snake_case. Per-field aliases are inconsistency waiting to happen. |
| "We'll cut /v2 when we need a change" | Most changes are additive — add optional fields under /v1. A new major version is a last resort (diamond deps). |
| "Validate again in the service layer" | The Pydantic model at the boundary already validated. Re-validating internal trusted data is noise. |
| "Internal services don't need contracts" | Internal callers are still callers. Typed Pydantic boundaries enable parallel work and prevent coupling. |

## Red Flags

- A handler that `return`s a SQLAlchemy model (or any endpoint with no `response_model`)
- Mixed error shapes — some `HTTPException`, some `{"error": ...}`, some `None`
- A query in a service that isn't filtered by `tenant_id` (tenant-leak / fail-open)
- 403 (not 404) for a resource in another tenant — confirms the ID exists across the boundary
- List endpoints without pagination
- Verbs in paths (`/api/v1/createClaim`), or unversioned paths (`/claims`)
- Required new fields added to an existing input model (breaking change)
- Celery tasks taking ORM objects or whole payloads instead of IDs
- Third-party webhook bodies used before parsing into a Pydantic model

## Verification

After designing an API:

- [ ] Every route declares an explicit `response_model` and `status_code`
- [ ] No handler returns a raw ORM object
- [ ] Errors use the single `{error:{code,message,details}}` envelope — including the `RequestValidationError` handler
- [ ] Validation happens at the boundary (Pydantic models / `Annotated` params) only
- [ ] Every list endpoint is paginated
- [ ] Every tenant-scoped query filters by `tenant_id`; missing context fails closed
- [ ] New fields are additive and optional/defaulted (backward compatible)
- [ ] Paths are versioned (`/api/v1/...`), plural-noun, verb-free; fields are snake_case
- [ ] Celery task args are primitive (IDs), with new args optional; tasks are idempotent
- [ ] The generated OpenAPI (`/docs`) reflects the intended contract
