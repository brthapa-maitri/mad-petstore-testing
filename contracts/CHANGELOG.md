# Contract changes from upstream Swagger Petstore v3

Source: `contracts/petstore-v3-original.json` (read-only copy).

| Change | Why |
|---|---|
| Only `POST /pet`, `GET /pet/findByStatus`, `GET /pet/{petId}` kept | The course app is basic Pet CRUD; the rest stays readable in the upstream copy |
| `Pet.id` and `petId` are decimal strings (`^[0-9]{1,19}$`) | int64 ids lose precision in JavaScript above 2^53 |
| Security schemes removed | Auth is out of scope for the course |
| JSON only (no XML or form bodies) | One wire format keeps the run short |
| `photoUrls` and `tags` removed; `Category` is `{name}` only | Not used by the two screens |
| `status` required on create; `findByStatus` takes exactly one status | The list screen filters by one status |
| Validation errors are 422 with `{detail}` (upstream: 400/422 mixed) | One rule for every operation; matches FastAPI's default |
| `Error.detail` is optional | FastAPI's built-in validation-error schema does not require it |
| `addPet` documents `400` for an unparseable request body | FastAPI answers malformed JSON with 400 before validation runs |
