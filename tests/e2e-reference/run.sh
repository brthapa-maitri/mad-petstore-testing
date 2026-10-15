#!/usr/bin/env bash
# Reference E2E journeys (testids only). Usage: tests/e2e-reference/run.sh WEB_URL
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci --silent
npx playwright install chromium >/dev/null
WEB_URL="${1:?usage: tests/e2e-reference/run.sh WEB_URL}" npx playwright test
