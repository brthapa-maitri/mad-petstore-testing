# Petstore web

Next.js (App Router, TypeScript) staff app. It calls the API from server code only.

## Run without Docker

```bash
npm ci
API_URL=http://localhost:8000 npm run dev   # http://localhost:3000
```

## Environment

| Variable  | Default                 | Meaning                                      |
| --------- | ----------------------- | -------------------------------------------- |
| `API_URL` | `http://localhost:8000` | Base URL of the API, read on the server only |

## Commands

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

`GET /health` (rewritten to `/api/health`) returns 200 when the API's `/health` answers, else 503.
