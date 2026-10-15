---
name: mad-frontend-standards
description: >
  Project frontend standards for the Next.js App Router / React / TypeScript stack. Invoke
  before writing, changing, or reviewing any page, layout, component, route handler, server
  action, hook, data-fetching code, form, environment-variable use, or frontend test.
  Enforces server-first component boundaries, Next 15+ async request APIs, the data-fetching
  and caching rules, server-action/route-handler boundaries, error and Suspense boundaries,
  hydration safety, strict TypeScript, NEXT_PUBLIC_ hygiene, the Vitest + Playwright test
  setup, and a review checklist of anti-patterns; requires invoking frontend-ui-engineering
  before any UI component, page, or layout is built or changed.
---

# Frontend standards — Next.js (App Router)

Stack (after laguagu/claude-code-nextjs-skills): Next.js App Router, React, TypeScript
strict, Node.js runtime, Tailwind. No versions are pinned here — the project's manifests own
them; rules marked with a major (e.g. "v16+") apply only when the project is on it.
`cacheComponents` is off.

## Before you start

- **Invoke the `frontend-ui-engineering` skill first** whenever the task builds or changes
  any UI component, page, or layout. It owns component architecture, design-system
  adherence, accessibility, responsive design, and loading/transition states — not repeated here.

## Project structure

```
src/
├── app/                   # routes only: page, layout, loading, error, not-found, route.ts
│   ├── (marketing)/       # route groups for distinct layouts (no URL impact)
│   └── api/<resource>/route.ts
├── components/            # ui/ primitives, <feature>/ components
├── server/                # "server-only" data access + actions/
├── lib/                   # framework-free helpers, API client, Zod schemas, fonts.ts
├── env.ts                 # validated process.env
└── proxy.ts | middleware.ts   # v16+: proxy.ts (Node only); v14–15: middleware.ts
```

- `app/*` files are routing glue: a `page.tsx` composes components from `components/` and
  stays under ~50 lines. No business logic in `page.tsx`/`layout.tsx`.
- Every file in `server/` starts with `import "server-only"`; secrets are read only there.
- `route.ts` and `page.tsx` never share a folder — APIs live under `app/api/`. Internal
  navigation uses `next/link`/`next/navigation`, never `<a href>` or `window.location`.
- `proxy.ts`/`middleware.ts` declares a `matcher` excluding `_next/static`, `_next/image`, `public/`.

## Server vs Client boundaries

- Everything is a Server Component by default; `"use client"` only on leaf components that
  need hooks, event handlers, or browser APIs — never on a page, layout, or a component
  that only renders children. Push it down: wrap `<LikeButton>`, not the section.
- A `"use client"` component is never `async` — fetch in the server parent, pass props.
- Props crossing server → client are RSC-serialisable: primitives, plain objects/arrays,
  `Date`/`Map`/`Set`, Promises, JSX, Server Actions. Never plain functions, class instances,
  `WeakMap`/`WeakSet`, or non-global symbols.
- Never import a Server Component into a Client Component — pass it as `children`;
  `metadata`/`generateMetadata` live only in Server Component files.

## Async request APIs (Next 15+)

- `params`/`searchParams` are `Promise<...>`: type them so and `await` them (or `use()` in a
  sync component) in pages, layouts, `generateMetadata`, and route handlers; `cookies()`,
  `headers()`, `draftMode()` are awaited too.

## Data fetching and caching

| Need | Use |
| --- | --- |
| Read in a Server Component | fetch/DB directly — no API round-trip |
| Mutation from this app's UI | Server Action |
| Read from a Client Component | pass from the server parent; no client-side fetching library |
| Webhook, third-party callback, external/mobile client, cacheable public GET | Route Handler |

- Independent fetches run in `Promise.all`; sequential `await`s only when dependent.
  Independent slow sections each get their own `<Suspense>` so the page streams.
- Wrap per-request data functions in `React.cache()` so page + `generateMetadata` dedupe.
- Every server `fetch` states its cache intent (`cache: "no-store"` or `next: { revalidate,
  tags }`). Every mutation invalidates what it changed: `revalidatePath()`,
  `revalidateTag(tag, profile)`, or `updateTag()` inside an action (v16).

## Server Actions and Route Handlers

- Actions live in `server/actions/*.ts` with `"use server"`: check auth first, parse input
  with the Zod schema from `lib/schemas/`, return `{ ok: true, data } | { ok: false, error }`.
  Never throw to the client; never return raw API/ORM objects.
- `redirect()`, `notFound()`, `permanentRedirect()` throw on purpose — call them **outside**
  `try/catch`, or `unstable_rethrow(error)` first inside the catch.
- Route handlers are thin proxies (no backend business logic); `after()` for post-response
  work. Node.js runtime by default — `runtime = "edge"` only where the project already uses
  Edge and every dependency is Edge-compatible.

## Error, loading, and Suspense boundaries

- Every data-fetching segment has `loading.tsx` and a `"use client"` `error.tsx` using
  `reset()`; the root has `global-error.tsx` and `not-found.tsx`. Missing resources call
  `notFound()`, never render empty.
- `useSearchParams()` in a static route must sit inside `<Suspense>` (production build
  fails; dev hides it) — or `await connection()` in the server parent to make it dynamic.
- Hydration safety: no `window`/`localStorage`/`Date.now()`/`Math.random()`/locale
  formatting during render — gate on a mounted state or `useId()`; no invalid HTML nesting.
- Caught errors are reported to no error-tracking sink: `error.tsx` logs with `console.error` and shows the message.

## Assets, scripts, bundling

- Remote images: `images.remotePatterns` (never deprecated `images.domains`); `fill` always
  pairs with `sizes`; non-default `quality` values are listed in `images.qualities`.
- Fonts are instantiated once in `lib/fonts.ts` with `subsets` + a CSS `variable` wired into
  Tailwind; never per component, never `<link>`/`@import` to Google Fonts.
- Third-party scripts use `next/script` (inline ones need `id`); GA/GTM via `@next/third-parties`.
- Browser-only libraries load via `next/dynamic(..., { ssr: false })` inside the leaf;
  native/ORM packages go in `serverExternalPackages`, ESM-only ones in `transpilePackages`.
  No custom `webpack()` config — Turbopack is the bundler.

## TypeScript and state

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. No `any`, no `!` outside tests,
  no `enum` (use `as const`). Props are a named exported `type XProps`.
- API types come from hand-written Zod schemas in `lib/schemas` matching
  `contracts/petstore-pets.yaml` (ids are `z.string()`) — never typed ad hoc in a component.
- URL (`searchParams`/`nuqs`) is the source of truth for shareable state; server data is
  never copied into `useState`/a store; there is no global store.
- Forms: one Zod schema shared by client and action; `react-hook-form` + `zodResolver` for
  > 2 fields, else `<form action>` + `useActionState`; submit disabled via `useFormStatus`.

## Environment variables

- All access goes through `src/env.ts` (Zod-validated at build); no `process.env.X` elsewhere.
  `NEXT_PUBLIC_` only for browser-safe values, never secrets/internal URLs; `.env.example` updated in the same PR.

## Testing and tooling

These commands take effect once the web scaffolding story lands; paths are relative to `web/`.

- Vitest + React Testing Library + `user-event`; query by role/label, `data-testid` last.
  Actions and `lib/` are tested directly with `vi.mock` on `server/`.
- Playwright in the repo-root `e2e/`, one spec per added/changed user flow, against a seeded
  local stack (`docker compose --profile app up -d --build`). Run: `npm test` (Vitest, in
  `web/`) and `npm --prefix e2e test` (from the repo root).
- `eslint` (`next/core-web-vitals` + `@typescript-eslint/strict-type-checked`), `prettier
  --check`, `tsc --noEmit` clean; `next build` before a PR. Package manager:
  npm (`npm ci`, `package-lock.json` committed).

## Review checklist — anti-patterns to reject

- `"use client"` on a page/layout; `async` client component; function/class-instance props
  to a Client Component; un-awaited `params`/`searchParams`/`cookies()`/`headers()`.
- Sequential `await`s of independent data; `useEffect` fetching; un-annotated server `fetch`.
- `redirect()`/`notFound()` inside `try/catch` without `unstable_rethrow`;
  `useSearchParams()` without `<Suspense>`; `window`/`Date.now()`/`Math.random()` in render.
- `<img>`, `<link>` fonts, raw `<script>`, `images.domains`, custom `webpack()`, `runtime =
  "edge"` without a project-wide reason; `process.env.X` outside `env.ts`; a secret under `NEXT_PUBLIC_`.
