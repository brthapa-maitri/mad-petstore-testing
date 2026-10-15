The shop team asked for a quicker view of pets they can still talk about with customers.

## Acceptance Criteria
- When the pet list first loads, it shows pets whose status is `available` **or** `pending`.
- Choosing a status in the filter still shows only pets with that status.
- No API change is needed; the frontend can call `findPetsByStatus` twice and merge the results.
