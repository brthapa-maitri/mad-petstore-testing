# Spec: Pet list by status

Feature 3 of 3. Builds on `docs/specs/foundation.md` and `docs/specs/add-a-pet.md`. Project-wide
commands, structure and style are in the foundation spec and the `mad-*-standards` skills; only
what differs is here.

## Objective
Staff open `/`, see the pets with one status (available by default), switch the status to see
pending or sold pets, and follow a link to add a pet. This stops them promising a pet that is
already reserved or sold.

User story: *As shop staff, I see which pets are available before promising one to a customer.*

## API (contract: `contracts/petstore-pets.yaml`, never changed)
- `GET /pet/findByStatus?status=<available|pending|sold>` (`findPetsByStatus`):
  - 200 → array of `Pet` with exactly that status, ids as decimal strings, **newest first**
    (`ORDER BY id DESC`; ids come from one ascending sequence). Empty array when none. No paging.
  - 422 `{detail}` → `status` missing, repeated with different values, or not one of the three.
- Lives in `api/src/pets/router.py` beside the add-pet routes; the query is one indexed `SELECT`.

## Screen `/` (follows `prototype/index.html`)
- Elements and `data-testid`s exactly as `contracts/testids.md` → "Pet list": `pet-list-page`,
  `status-filter` (options `available`, `pending`, `sold`), `add-pet-link` (to `/add`),
  `pet-list` (the table body), one `pet-row` per pet with `pet-row-name` and `pet-row-status`
  (raw value), `pet-list-empty` "No pets with this status." shown only when the list is empty.
- The status lives in the URL: `/` means `available`; `/?status=pending` and `/?status=sold`
  select those. An unknown value (`/?status=foo`) shows `available`.
- `page.tsx` is a Server Component that awaits `searchParams`, fetches with `cache: "no-store"`
  and renders the table; only the status `<select>` is a `"use client"` leaf that calls
  `router.push("/?status=<value>")` on change.
- The add-pet Server Action calls `revalidatePath("/")`, and the list fetch is uncached, so a
  pet added on `/add` is in the list the next time `/` loads.
- If the API is unreachable, the page's `error.tsx` shows "Could not load pets." with a retry
  button (`reset()`); it never shows the empty-state message for an error.
- Names render as text (React escaping); ids are never converted to numbers.

## Testing Strategy
- API (`api/tests/pets/`): each status returns only its pets; newest first; empty array for a
  status with no pets; missing/unknown status → 422.
- Web (Vitest): the status parser maps `undefined`/`"foo"` → `available` and keeps the three
  valid values; the row component renders a 19-digit id string unchanged.
- Definition of done (`mad-project-context`): `tests/contract/run.sh http://localhost:8000`
  passes for all three operations; all of `tests/e2e-reference/run.sh http://localhost:3000` passes.

## Boundaries
- Always: fetch the list on the server, uncached; keep the status in the URL.
- Ask first: client-side filtering or a fetching library; adding columns beyond name and status.
- Never: change `contracts/`; call the API from the browser; show `pet-list-empty` together with rows.

## Success Criteria
1. `/` shows `status-filter` set to `available` and only rows whose `pet-row-status` is `available`.
2. Choosing `sold` changes the URL to `/?status=sold` and shows only sold pets; refreshing keeps `sold`.
3. A pet added on `/add` appears at the top of its status's list on the next visit to `/`.
4. A status with no pets shows `pet-list-empty` and no `pet-row`.
5. `/?status=foo` behaves like `/`.
6. With the API stopped, `/` shows "Could not load pets." and a retry button.
7. `GET /pet/findByStatus?status=bogus` → 422 `{detail}`.
8. The full contract suite and the full reference E2E suite pass.

## Resolved Questions
- Row order? → Newest first (`id DESC`).
- Is the status in the URL? → Yes, `/?status=<value>`; `/` and unknown values mean `available`.
- Row limit? → None; the contract has no paging.
