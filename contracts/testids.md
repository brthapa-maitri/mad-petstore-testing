# data-testid contract

Every screen element below must carry exactly this `data-testid`. The reference E2E suite
and QA tests select by these ids only. Status cells show the raw value: `available`, `pending` or `sold`.

## Pet list (`/`)

| testid | Element |
|---|---|
| `pet-list-page` | Page root |
| `status-filter` | Status select; options `available` (default), `pending`, `sold` |
| `add-pet-link` | Link to the add-pet page |
| `pet-list` | Container of rows |
| `pet-row` | One row per pet with the selected status |
| `pet-row-name` | Pet name cell |
| `pet-row-status` | Pet status cell (raw value) |
| `pet-list-empty` | Shown when no pet has the selected status |

## Add pet (`/add`)

| testid | Element |
|---|---|
| `add-pet-page` | Page root |
| `add-pet-form` | The form |
| `pet-name-input` | Name, required, 1–100 chars |
| `pet-status-select` | Status select, required |
| `pet-category-input` | Category name, optional |
| `add-pet-submit` | Submit button |
| `form-error` | Validation or server error message |
| `created-pet` | Shown after a successful add |
| `created-pet-id` | Id returned by the API (string) |
| `created-pet-name` | Name returned by the API |
| `created-pet-status` | Status returned by the API (raw value) |
| `back-to-list-link` | Link back to the list |
