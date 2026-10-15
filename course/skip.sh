#!/usr/bin/env bash
# Fast-forward a stage from the reference repo. Usage: course/skip.sh S04|S05|S06
set -euo pipefail
source "$(dirname "$0")/lib/common.sh"
REF_URL="${COURSE_REFERENCE_URL:-https://github.com/Maitri-Services/mad-petstore-reference.git}"
REF=refs/course/reference
cd "$COURSE_ROOT"

die() { echo "skip: $*" >&2; exit 1; }
require_clean_develop() {
  [ "$(git branch --show-current)" = develop ] || die "switch to develop first: git switch develop"
  # .beads/ and progress/ are written by br and the course tools on every run, so they never block.
  [ -z "$(git status --porcelain -- . ':(exclude).beads' ':(exclude)progress')" ] || die "working tree has changes — commit or stash them first"
}
preflight() {
  require_clean_develop
  git fetch -q origin develop || die "cannot reach origin — check your network/remote"
  [ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ] || die "develop differs from origin/develop — pull or push first"
}
fetch_reference() { git fetch -q "$REF_URL" "+main:$REF" || die "cannot fetch $REF_URL — ask your facilitator for access"; }
paths_for_role() {
  case "$1" in role:backend) echo api ;; role:frontend) echo web ;; role:fullstack) echo "api web" ;; *) echo "" ;; esac
}
ff_close() { br update "$1" --add-label course:fast-forwarded >/dev/null; br close "$1" -r "fast-forwarded by course/skip.sh" >/dev/null; }
done_ff() { note "$2"; emit_result "$1" fast-forwarded; echo "$1 fast-forwarded: $2"; }

skip_s04() {
  fetch_reference
  all=$(beads_json) || die "br failed — run br init, then retry"
  for id in $(jq -r '.[] | select(.issue_type == "task" and .status != "closed")
    | select((.labels // []) | index("role:devops") | not) | .id' <<<"$all"); do
    br update "$id" --add-label course:superseded >/dev/null
    br close "$id" -r "superseded by reference backlog (course/skip.sh S04)" >/dev/null
  done
  git show "$REF:reference/backlog.json" | jq -c '.[]' | while read -r item; do
    br create "$(jq -r .title <<<"$item")" -t task -p 2 -l "$(jq -r '.labels | join(",")' <<<"$item")" \
      -d "$(jq -r .description <<<"$item")" >/dev/null </dev/null
  done
  done_ff S04 "reference backlog loaded; open learner beads superseded"
}

skip_s05() {
  preflight; fetch_reference
  echo "Stop the team first (/cleanup-team) so no teammate pushes over the fast-forward."
  all=$(beads_json) || die "br failed — run br init, then retry"
  open=$(jq -r '.[] | select(.issue_type == "task" and .status != "closed")
    | select((.labels // []) | index("role:qa") | not)
    | select((.labels // []) | index("role:devops") | not)
    | [.id, ([(.labels // [])[] | select(startswith("role:"))][0] // "")] | @tsv' <<<"$all")
  [ -n "$open" ] || die "no open story beads to fast-forward"
  while IFS=$'\t' read -r id role; do
    [ -n "$(paths_for_role "$role")" ] || die "$id has no backend, frontend or fullstack role label"
  done <<<"$open"
  ids=""
  while IFS=$'\t' read -r id role; do
    # shellcheck disable=SC2046
    git checkout "$REF" -- $(paths_for_role "$role") </dev/null
    git diff --cached --quiet || git commit -q -m "course: fast-forward $id from reference" </dev/null
    ids="$ids $id"
  done <<<"$open"
  git push -q origin develop || die "push failed — nothing was closed; fix the remote and rerun"
  for id in $ids; do ff_close "$id"; done
  done_ff S05 "open stories fast-forwarded from the reference app; role:devops beads left open for the team"
}

skip_s06() {
  preflight; fetch_reference
  git checkout "$REF" -- web qa/test-reports
  git diff --cached --quiet || git commit -q -m "course: fast-forward S06 fix and QA report from reference"
  git push -q origin develop || die "push failed — no bug was filed; fix the remote and rerun"
  id=$(br create "Pet list default shows pending pets (seeded bug)" -t bug -p 2 \
    -l role:frontend,origin:qa,course:fast-forwarded -d "Fast-forwarded by course/skip.sh S06." --json | jq -r '.id // .[0].id')
  br close "$id" -r "fast-forwarded by course/skip.sh" >/dev/null
  done_ff S06 "reference fix and QA report applied; bug $id recorded"
}

case "${1:-}" in
  S04) skip_s04 ;; S05) skip_s05 ;; S06) skip_s06 ;;
  *) echo "usage: course/skip.sh S04|S05|S06" >&2; exit 2 ;;
esac
