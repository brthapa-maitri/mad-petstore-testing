#!/usr/bin/env bash
# S09 Teardown: teardown.sh retired .deploy/url and the old URL no longer answers.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

d="$COURSE_ROOT/.deploy"
[ ! -e "$d/url" ] || fail ".deploy/url still exists: run scripts/teardown.sh"
if [ -s "$d/url.destroyed" ]; then
  url=$(head -1 "$d/url.destroyed" | tr -d '[:space:]'); url=${url%/}
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url/health" || true)
  [ "$code" != 200 ] || fail "$url/health still answers 200: the app is still running"
  note "torn down: $url (also check the cloud console for leftovers)"
else
  fail "no .deploy/url.destroyed: run scripts/teardown.sh after deploying"
fi
finish S09
