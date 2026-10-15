#!/usr/bin/env bash
# S06 QA: a fixed bug (type bug + origin:), or a logged earlier catch; QA report committed; reference E2E green.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

if ! beads=$(beads_json 2>/dev/null); then
  fail "br could not list beads — run 'br init' first"; finish S06 || exit 1
fi
if ! prs=$(merged_prs develop 2>/dev/null); then
  fail "gh could not list PRs — run 'gh auth status'"; finish S06 || exit 1
fi

found=0
while IFS=$'\t' read -r id status ff origin; do
  [ -n "$id" ] || continue
  if [ "$ff" = true ]; then COURSE_FF=1; found=1; note "bug $id fast-forwarded"; continue; fi
  [ "$status" = closed ] && [ "$origin" = true ] || continue
  pr=$(pr_for_bead "$prs" "$id" 0)
  [ -n "$pr" ] && { found=1; note "bug $id fixed by PR #$pr"; }
done < <(jq -r '.[] | select(.issue_type == "bug") | [.id, .status,
  ((.labels // []) | index("course:fast-forwarded") != null),
  ((.labels // []) | any(startswith("origin:")))] | @tsv' <<<"$beads")

if [ "$found" = 0 ] && grep -qE '^caught-before-qa: ' "$COURSE_ROOT/progress/record.md" 2>/dev/null; then
  found=1; note "seed caught before QA (progress/record.md)"
fi
[ "$found" = 1 ] || fail "no closed bug bead (type bug, with an origin: label) linked to a merged fix PR, and no 'caught-before-qa:' line in progress/record.md"

if ls "$COURSE_ROOT"/qa/test-reports/*/index.html >/dev/null 2>&1; then note "QA report committed"
else fail "no Playwright report under qa/test-reports/<feature>/index.html"; fi

if [ "${COURSE_OFFLINE:-0}" = 1 ]; then
  note "reference E2E skipped (COURSE_OFFLINE=1)"
else
  mkdir -p "$CHECKS_DIR"
  if "$COURSE_ROOT/tests/e2e-reference/run.sh" "${COURSE_WEB_URL:-http://localhost:3000}" > "$CHECKS_DIR/S06-e2e.log" 2>&1; then
    note "reference E2E green"
  else
    fail "reference E2E failed — see progress/checks/S06-e2e.log"
  fi
fi
finish S06
