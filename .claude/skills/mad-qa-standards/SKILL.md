---
name: mad-qa-standards
description: >
  MAD Petstore QA standards: Playwright E2E in e2e/ via the playwright-test MCP, data-testid
  selectors, seed test, report location. Invoke when doing role:qa work, after mad-project-context.
---

# QA standards: Playwright

- Invoke `mad-project-context` first; `compose.yaml` has the app's local URLs and how to start it.
- Tests live in `e2e/tests/`; build on `e2e/tests/seed.spec.ts`; plan, generate and heal with the
  `playwright-test` MCP from `.mcp.json`.
- First use: `npm --prefix e2e ci && npx --prefix e2e playwright install chromium`.
- Select elements only by `data-testid` from `contracts/testids.md`; no CSS or text selectors.
- One spec per user flow. Always cover: an empty-name submit shows `form-error`; an unknown pet id
  returns 404 from the API; a pet id above 2^53 is shown unchanged as a string.
- Reports: the framework's `qa-test-reports` skill, into `qa/test-reports/<feature>/`
  (`PLAYWRIGHT_HTML_OUTPUT_DIR=../qa/test-reports/<feature> npm --prefix e2e test`; the path is relative to `e2e/`).
- File real application bugs with the framework's `bug-report` skill.
- Never edit the top-level `tests/` directory; a failing reference test is an application bug, so file it.
