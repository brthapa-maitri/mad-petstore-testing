#!/usr/bin/env bash
# S04 Beads: at least 3 tasks, one role: label and AC each, a role:qa story, and a role:devops story when deploying to a cloud.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

if ! beads=$(beads_json 2>/dev/null); then
  fail "br could not list beads — run 'br init' (done by /agent-team-setup) and create beads first"
  finish S04 || exit 1
fi

tasks=$(jq '[.[] | select(.issue_type == "task" and ((.labels // []) | index("course:superseded") | not))]' <<<"$beads")
n=$(jq length <<<"$tasks")
[ "$n" -ge 3 ] || fail "expected at least 3 task beads, found $n"

while IFS=$'\t' read -r id roles has_ac; do
  [ -n "$id" ] || continue
  [ "$roles" = 1 ] || fail "$id: needs exactly one role: label (has $roles)"
  [ "$has_ac" = true ] || fail "$id: description has no '## Acceptance Criteria' section"
done < <(jq -r '.[] | [.id, ([(.labels // [])[] | select(startswith("role:"))] | length),
  ((.description // "") | test("(?m)^#+ *Acceptance Criteria"))] | @tsv' <<<"$tasks")

qa=$(jq '[.[] | select((.labels // []) | index("role:qa"))] | length' <<<"$tasks")
[ "$qa" -ge 1 ] || fail "expected at least one role:qa story, found $qa"

cloud=$(deployment_cloud "$COURSE_ROOT/docs/ARCHITECTURE.md")
if [ -n "$cloud" ]; then
  devops=$(jq '[.[] | select((.labels // []) | index("role:devops"))] | length' <<<"$tasks")
  [ "$devops" -ge 1 ] || fail "the architecture deploys to $cloud: expected a role:devops Deploy story, found $devops"
fi

note "$n task beads, $qa QA stories"
finish S04
