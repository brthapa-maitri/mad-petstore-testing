load helpers

setup() {
  setup_repo
  export COURSE_OFFLINE=1 FIX="$BATS_TEST_TMPDIR/fix"
  mkdir -p "$FIX"
  stub_gh 'case "$1" in
    pr) cat "$FIX/prs.json" ;;
    api) cat "$FIX/timeline-$(echo "$2" | cut -d/ -f5).json" ;;
  esac'
}

story() { br create "$1" -t task -l "$2" --json | jq -r .id; }
timeline() {  # timeline <n> <label-time> <merge-time>
  printf '[{"event":"labeled","label":{"name":"approved-by-reviewer-agent"},"created_at":"%s"},{"event":"merged","created_at":"%s"}]' "$2" "$3" > "$FIX/timeline-$1.json"
}

@test "passes when every story is closed with a reviewed, merged PR" {
  a=$(story API role:backend); br close "$a" >/dev/null
  story E2E role:qa >/dev/null
  echo "[{\"number\":7,\"title\":\"Pets API [$a]\",\"mergedAt\":\"2026-10-08T10:00:00Z\"}]" > "$FIX/prs.json"
  timeline 7 2026-10-08T09:59:00Z 2026-10-08T10:00:00Z
  run "$COURSE_DIR/checks/S05.sh"
  echo "$output"
  [ "$status" -eq 0 ]
}

@test "fails when the approval label came after the merge" {
  a=$(story API role:backend); br close "$a" >/dev/null
  echo "[{\"number\":7,\"title\":\"Pets API [$a]\",\"mergedAt\":\"2026-10-08T10:00:00Z\"}]" > "$FIX/prs.json"
  timeline 7 2026-10-08T10:05:00Z 2026-10-08T10:00:00Z
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"before merge"* ]]
}

@test "fails when a story is still open" {
  story API role:backend >/dev/null
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"not closed"* ]]
}

@test "fast-forwarded stories need no PR and mark the stage fast-forwarded" {
  a=$(story API role:backend,course:fast-forwarded); br close "$a" >/dev/null
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S05.json)" = fast-forwarded ]
}

@test "ignores PRs merged before the stage started" {
  a=$(story API role:backend); br close "$a" >/dev/null
  mkdir -p progress && echo '{"S05":{"start":1791460000}}' > progress/stages.json
  echo "[{\"number\":7,\"title\":\"Pets API [$a]\",\"mergedAt\":\"2026-10-08T00:00:00Z\"}]" > "$FIX/prs.json"
  timeline 7 2026-10-07T23:59:00Z 2026-10-08T00:00:00Z
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
}

@test "fails with an auth hint when gh fails" {
  stub_gh 'echo "not logged in" >&2; exit 1'
  story API role:backend >/dev/null
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"gh auth status"* ]]
  [ -f progress/checks/S05.json ]
}

@test "fails when there are no story beads" {
  story E2E role:qa >/dev/null
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"no story beads"* ]]
}

@test "fails with an auth hint when the timeline fetch fails" {
  a=$(story API role:backend); br close "$a" >/dev/null
  echo "[{\"number\":7,\"title\":\"Pets API [$a]\",\"mergedAt\":\"2026-10-08T10:00:00Z\"}]" > "$FIX/prs.json"
  stub_gh 'case "$1" in
    pr) cat "$FIX/prs.json" ;;
    api) echo boom >&2; exit 1 ;;
  esac'
  run "$COURSE_DIR/checks/S05.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"gh auth status"* ]]
}

@test "excludes the open seed bead recorded in progress/seed-bead-id" {
  a=$(story API role:backend); br close "$a" >/dev/null
  seed=$(story "Seed" role:frontend)
  mkdir -p progress && echo "$seed" > progress/seed-bead-id
  echo "[{\"number\":7,\"title\":\"Pets API [$a]\",\"mergedAt\":\"2026-10-08T10:00:00Z\"}]" > "$FIX/prs.json"
  timeline 7 2026-10-08T09:59:00Z 2026-10-08T10:00:00Z
  run "$COURSE_DIR/checks/S05.sh"
  echo "$output"
  [ "$status" -eq 0 ]
}
