# Test plan: pets (add a pet, pet list by status)

Bead: ps-9y5.1 (Story 1.4.1). Sources: `docs/specs/add-a-pet.md`, `docs/specs/pet-list-by-status.md`,
the acceptance criteria of stories 1.2.2 and 1.3.2, and `contracts/testids.md`.
Seed: `e2e/tests/seed.spec.ts` (the pet list at `/`). Selectors: `data-testid` only.

**Test data.** The local database is shared and the contract has no DELETE, so tests never clean up
rows. Each test makes its own pets with unique, realistic names (`makePetName()`, e.g.
`Biscuit 7f3k2q`) and asserts only on those pets. The empty-state scenario needs a status with no
pets: it runs first and is skipped, with a note, when every status already has pets. Start from a
fresh database (`docker compose --profile app down && docker compose --profile app up -d --build`)
to run it.

**API-down scenarios** stop the container that publishes port 8000 and start it again afterwards
(the Playwright projects `stop-api`, `api-down` and `start-api`). They only run against the local
stack.

## 1. Add a pet (`e2e/tests/add-pet.spec.ts`)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1.1 | Add a pet with a category | Open `/`, click `add-pet-link`, enter name, choose `pending`, category `Dogs`, submit | `created-pet` shows a 16–19 digit `created-pet-id`, the name, `pending`; `form-error` hidden; `GET /pet/<id>` returns the same name and status with `category.name = "Dogs"` |
| 1.2 | Form resets after a successful add | Add a pet with status `sold` and a category | Name and category inputs empty; `pet-status-select` back to `available` |
| 1.3 | Empty name is rejected | Submit with an empty name | `form-error` reads "Name is required (1–100 characters)."; `created-pet` hidden |
| 1.4 | Spaces-only name is rejected | Submit name `"    "` | Same as 1.3 |
| 1.5 | 101-character name is rejected | Submit a 101-character name | `form-error` name message; `created-pet` hidden; the typed values stay in the form |
| 1.6 | 100-character name is accepted | Submit a 100-character name | `created-pet-name` is the exact 100 characters |
| 1.7 | 51-character category is rejected | Valid name, 51-character category | `form-error` "Category must be at most 50 characters." |
| 1.8 | 50-character category is accepted | Valid name, 50-character category | `created-pet` shown; the API stores the category |
| 1.9 | Name is trimmed by the form | Submit `"  <name>  "` | `created-pet-name` is the trimmed name |
| 1.10 | Markup and non-ASCII names render as text | Submit `<b>Zoë 🐶</b> …` | `created-pet-name` shows the literal text |
| 1.11 | Duplicate names are allowed | Add the same name twice | Two different ids |
| 1.12 | Fixing an error then submitting succeeds | Submit empty, then fill a name and submit | `form-error` hidden, `created-pet` shown |
| 1.13 | Back to the list | On `/add`, click `back-to-list-link` | `pet-list-page` at `/` |
| 1.14 | Deep link and refresh on `/add` | Open `/add` directly; reload | Form shown, status `available`, no `created-pet` |

## 2. Pet list by status (`e2e/tests/pet-list.spec.ts`)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 2.1 | Default list is available | Open `/` | `status-filter` = `available`; every `pet-row-status` is `available` |
| 2.2–2.4 | Filter by each status, URL survives refresh | Add a pet with status S; open `/`; choose S | URL `/?status=S`; the pet's row is listed; only S rows; after reload still S and the pet listed |
| 2.5 | New pet is at the top of its list | Add a pet with status S; click `back-to-list-link`; choose S | First `pet-row-name` is the new pet |
| 2.6 | Newest first | Add two `sold` pets in order | The second appears above the first |
| 2.7 | `/?status=foo` behaves like `/` | Open `/?status=foo` | `status-filter` = `available`; only `available` rows |
| 2.8 | Back button restores the previous filter | `/` → choose `pending` → choose `sold` → back | URL `/?status=pending`, filter `pending`, only pending rows |
| 2.9 | No empty message with rows | Open a status with pets | `pet-list-empty` absent |

## 3. Empty state (`e2e/tests/empty-state.spec.ts`, runs first)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 3.1 | A status with no pets shows the empty message | Find a status with no pets through the API; open `/?status=<it>` | `pet-list-empty` "No pets with this status."; no `pet-row` |

## 4. API (`e2e/tests/pet-api.spec.ts`)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 4.1 | Unknown pet id → 404 | `GET /pet/1` | 404 `{detail}` |
| 4.2 | Id above int64 max → 404 | `GET /pet/9999999999999999999` | 404 `{detail}` |
| 4.3 | Non-numeric id → 422 | `GET /pet/abc` | 422 `{detail}` |
| 4.4 | Unknown status → 422 | `GET /pet/findByStatus?status=bogus` | 422 `{detail}` |
| 4.5 | An id above 2^53 shown unchanged | Add a pet in the UI; read `created-pet-id`; `GET /pet/<id>` (raw JSON text) | The id is above 2^53 and the UI string equals the API's id string exactly |

## 5. API stopped (`e2e/tests/api-down.spec.ts`, after the API is stopped)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 5.1 | List shows the error page | Open `/` | "Could not load pets." and a retry button; no `pet-list-empty`, no `pet-list` |
| 5.2 | Add shows the server error | On `/add`, submit a valid pet | `form-error` "Could not add the pet. Try again."; `created-pet` hidden |
| 5.3 | Retry recovers after the API comes back | Open `/` (error), start the API, click retry | The pet list renders |
