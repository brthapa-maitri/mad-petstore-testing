load helpers
setup() { setup_repo; export COURSE_OFFLINE=1 FIX="$BATS_TEST_TMPDIR/fix"; mkdir -p "$FIX"; stub_gh 'cat "$FIX/prs.json"'; }

@test "passes when develop was merged into main" {
  echo '[{"number":12,"title":"Release","mergedAt":"2026-10-08T15:00:00Z","headRefName":"develop"}]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S07.sh"
  [ "$status" -eq 0 ]
}

@test "fails when only feature branches were merged into main" {
  echo '[{"number":12,"title":"x","mergedAt":"2026-10-08T15:00:00Z","headRefName":"feat/x"}]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S07.sh"
  [ "$status" -eq 1 ]
}

@test "fails when no PR was merged into main" {
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S07.sh"
  [ "$status" -eq 1 ]
}

@test "fails with an auth hint and writes JSON when gh fails" {
  stub_gh 'echo no >&2; exit 1'
  run "$COURSE_DIR/checks/S07.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"gh auth status"* ]]
  [ -f "$COURSE_ROOT/progress/checks/S07.json" ]
}

@test "check-all S04 runs only stages up to S04" {
  br create A -t task -l role:backend -d $'## Acceptance Criteria\n- a' >/dev/null
  run "$COURSE_DIR/checks/check-all.sh" S04
  [[ "$output" == *"S04: fail"* ]]
  [[ "$output" != *"S05:"* ]]
  [ "$status" -eq 1 ]
}
