#!/usr/bin/env bash
# S05 Team run: every non-QA story closed via a reviewed, merged PR into develop; contract tests green.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

if ! beads=$(beads_json 2>/dev/null); then
  fail "br could not list beads — run 'br init' first"; finish S05 || exit 1
fi
if ! prs=$(merged_prs develop 2>/dev/null); then
  fail "gh could not list PRs — run 'gh auth status'"; finish S05 || exit 1
fi
since=$(stage_start S05)

# Reads timeline JSON on stdin; true when the approval label precedes the merge.
approved_before_merge() {
  jq -s 'add
    | ([.[] | select(.event == "labeled" and .label.name == "approved-by-reviewer-agent") | .created_at] | min) as $a
    | ([.[] | select(.event == "merged") | .created_at] | min) as $m
    | ($a != null and $m != null and $a < $m)' | grep -qx true
}

# The seeded bead (progress/seed-bead-id) is owned by S06, not counted here.
seed=$(cat "$COURSE_ROOT/progress/seed-bead-id" 2>/dev/null || true)
stories=$(jq --arg seed "$seed" '[.[] | select(.issue_type == "task" and .id != $seed) | select((.labels // []) as $l
  | ($l | index("role:qa") | not) and ($l | index("course:superseded") | not))]' <<<"$beads")

if [ "$(jq length <<<"$stories")" -eq 0 ]; then
  fail "no story beads found — create the backlog (S04) first"
fi

while IFS=$'\t' read -r id status ff; do
  [ -n "$id" ] || continue
  if [ "$ff" = true ]; then COURSE_FF=1; note "$id fast-forwarded"; continue; fi
  [ "$status" = closed ] || { fail "$id is $status, not closed"; continue; }
  pr=$(pr_for_bead "$prs" "$id" "$since")
  [ -n "$pr" ] || { fail "$id: no PR merged into develop with \"[$id]\" in its title"; continue; }
  if ! tl=$(cd "$COURSE_ROOT" && gh api "repos/{owner}/{repo}/issues/$pr/timeline" --paginate 2>/dev/null); then
    fail "$id: gh could not read PR #$pr timeline — run 'gh auth status'"; continue
  fi
  if approved_before_merge <<<"$tl"; then note "$id: PR #$pr approved by reviewer before merge"
  else fail "$id: PR #$pr has no approved-by-reviewer-agent label before merge"; fi
done < <(jq -r '.[] | [.id, .status, ((.labels // []) | index("course:fast-forwarded") != null)] | @tsv' <<<"$stories")

if [ "${COURSE_OFFLINE:-0}" = 1 ]; then
  note "contract tests skipped (COURSE_OFFLINE=1)"
else
  mkdir -p "$CHECKS_DIR"
  if "$COURSE_ROOT/tests/contract/run.sh" "${COURSE_API_URL:-http://localhost:8000}" > "$CHECKS_DIR/S05-contract.log" 2>&1; then
    note "contract tests green"
  else
    fail "contract tests failed — see progress/checks/S05-contract.log"
  fi
fi
finish S05
