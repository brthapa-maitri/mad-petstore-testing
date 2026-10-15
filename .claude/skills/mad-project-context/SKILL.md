---
name: mad-project-context
description: >
  MAD Petstore project rules every role keeps: the contract of record, string pet ids, test
  ids and form-error, the health endpoint, definition of done, and off-limits paths. Invoke at
  the start of any task on this project, before the role's mad-*-standards skill.
---

# Project context: MAD Petstore

The stack is in `docs/ARCHITECTURE.md` (and in the Stack section `/create-project-overlay` adds
here). The folders, ports and run command are in `compose.yaml` (API in `api/`, web in `web/`).

## Contract of record
- `contracts/petstore-pets.yaml` is the contract of record. Never change it.
- Pet ids are 64-bit in storage and decimal strings in the API and the UI; the id sequence
  starts above 2^53. Never convert an id to a JavaScript number.
- Errors are `{detail}` JSON: 422 for validation, 404 for a missing pet.

## UI rules
- Every element listed in `contracts/testids.md` carries exactly that `data-testid`.
- Show validation errors in `data-testid="form-error"`; do not rely on native `required`.

## Health
- `GET /health` returns 200 on the one public URL that serves the app.

## Definition of done
1. Backend work: `tests/contract/run.sh <api-url>` passes against the running app.
2. Frontend work: `tests/e2e-reference/run.sh <web-url>` passes against the running app.

## Try it locally
The start command and the URL to open are in the README section "Run it on your machine"
(they work on the base branch). Without Docker, see the READMEs in `api/` and `web/`.

## Off limits
- Never edit anything under the top-level `tests/` directory (`e2e/tests/` is yours).
- Never read or edit `course/` or `progress/`.
