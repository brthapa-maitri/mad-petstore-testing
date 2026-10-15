# Spec: Add a pet

Feature 2 of 3. Builds on `docs/specs/foundation.md` (pet table, string ids, `{detail}` errors,
server-side API calls only). Project-wide commands, structure and style are in that spec and the
`mad-*-standards` skills; only what differs is here.

## Objective
When a pet arrives, a staff member opens `/add`, types its name, picks a status and optionally a
category, and submits. The pet is stored and the page shows exactly what the API created,
including its id. Staff can then add the next pet or go back to the list.

User story: *As shop staff, I add a new pet when it arrives so it shows up in the list straight away.*

## API (contract: `contracts/petstore-pets.yaml`, never changed)
- `POST /pet` (`addPet`): body `NewPet` `{name, status, category?: {name}}`, JSON only.
  - 200 → the created `Pet` with `id` as a decimal string.
  - 422 `{detail}` → missing/empty name, name > 100 chars, unknown status, category name empty
    or > 50 chars, any unknown property (top level or in `category`), wrong types.
  - 400 `{detail}` → body is not parseable JSON.
  - The name is stored exactly as sent (no trimming); duplicate names are allowed.
- `GET /pet/{petId}` (`getPetById`):
  - 200 → the `Pet`.
  - 404 `{detail}` → no such pet, **including** a well-formed id above the int64 maximum
    (e.g. `9999999999999999999`): never a 500.
  - 422 `{detail}` → `petId` does not match `^[0-9]{1,19}$`.
- Domain layout: `api/src/pets/` gains `router.py`, `service.py`, `dependencies.py`
  (`valid_pet_id` loads the pet or raises `PetNotFound`), `exceptions.py`.

## Screen `/add` (follows `prototype/add.html`)
- Elements and `data-testid`s exactly as `contracts/testids.md` → "Add pet": `add-pet-page`,
  `add-pet-form`, `pet-name-input`, `pet-status-select` (options `available`, `pending`, `sold`;
  default `available`), `pet-category-input`, `add-pet-submit`, `form-error`, `created-pet`,
  `created-pet-id`, `created-pet-name`, `created-pet-status`, `back-to-list-link` (to `/`).
- The form has no native `required`/`maxlength` validation blocking submit (`noValidate`); the
  Server Action validates with the shared Zod `NewPet` schema:
  - name is trimmed; blank or > 100 chars → `form-error` "Name is required (1–100 characters)."
  - category is trimmed; empty → omitted; > 50 chars → `form-error` "Category must be at most 50 characters."
- On success: `created-pet` shows the id, name and status **returned by the API** (status as the
  raw value); `form-error` is hidden; name and category clear and status resets to `available`.
- On API failure (non-200 or unreachable): `form-error` shows "Could not add the pet. Try again."
  (or the API's 422 `detail` message when it is a string); `created-pet` stays hidden.
- The submit button is disabled while the action runs (`useFormStatus`).
- The id is rendered as the string the API sent; it is never converted to a number.

## Testing Strategy
- API (`api/tests/pets/`): add then get round-trip; the first id on a fresh schema is
  `"9007199254740993"`; every 422 case above; malformed JSON → 400; unknown id → 404;
  `9999999999999999999` → 404; `abc` → 422; category omitted vs present.
- Web (Vitest): `NewPet` schema trims and rejects blank names, accepts 100 chars, rejects 101;
  the Server Action maps an API 422/500/network error to the `form-error` message.
- Definition of done (`mad-project-context`): `tests/contract/run.sh http://localhost:8000`
  passes for `addPet` and `getPetById`; the add-pet journeys in
  `tests/e2e-reference/run.sh http://localhost:3000` pass.

## Boundaries
- Always: return what the API created, never what the form sent; keep ids as strings.
- Ask first: any deviation from the contract's status codes; adding a form library.
- Never: change `contracts/`; trim or reject names in the API beyond the contract; call the API
  from the browser.

## Success Criteria
1. Submitting "Rex", `available`, category "Dogs" shows `created-pet` with a 16–19 digit id,
   name `Rex` and status `available`; `GET /pet/<that id>` returns the same pet with
   `category: {name: "Dogs"}`.
2. Submitting with an empty or spaces-only name shows `form-error` and leaves `created-pet` hidden;
   no request reaches the API.
3. A 101-character name or a 51-character category shows `form-error`.
4. After a successful add, the name and category inputs are empty and status is `available`.
5. With the API stopped, submitting shows "Could not add the pet. Try again." in `form-error`.
6. `GET /pet/9999999999999999999` → 404 `{detail}`; `GET /pet/abc` → 422 `{detail}`.
7. The contract tests for `addPet`/`getPetById` and the reference add-pet journeys pass.

## Resolved Questions
- A spaces-only name? → The web form trims and rejects it; the API follows the contract
  (minLength 1) and stores the name as sent.
- After a successful add? → Show `created-pet`, clear name and category, reset status to
  `available`; stay on `/add`.
- Duplicate names? → Allowed (assumption confirmed with the assumptions list; ids distinguish pets).
- An id above int64 max? → 404, never 500 (assumption confirmed with the assumptions list).
