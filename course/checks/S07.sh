#!/usr/bin/env bash
# S07 Final PR: develop merged into main.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

if ! prs=$(merged_prs main 2>/dev/null); then
  fail "gh could not list PRs — run 'gh auth status'"; finish S07 || exit 1
fi
pr=$(jq -r '[.[] | select(.headRefName == "develop")] | first | .number // empty' <<<"$prs")
if [ -n "$pr" ]; then note "develop merged into main by PR #$pr"
else fail "no merged PR from develop into main"; fi
finish S07
