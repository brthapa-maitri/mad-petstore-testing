load helpers

setup() {
  setup_repo
  export COURSE_OFFLINE=1 FIX="$BATS_TEST_TMPDIR/fix"
  mkdir -p "$FIX" qa/test-reports/pets && touch qa/test-reports/pets/index.html
  stub_gh 'cat "$FIX/prs.json"'
}

bug() { br create "List shows pending" -t bug -l "$1" --json | jq -r .id; }
merged() { echo "[{\"number\":9,\"title\":\"Fix [$1]\",\"mergedAt\":\"2026-10-08T12:00:00Z\"}]" > "$FIX/prs.json"; }

@test "passes with a closed bug bead linked to a merged fix PR" {
  b=$(bug role:frontend,origin:qa); br close "$b" >/dev/null
  merged "$b"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 0 ]
}

@test "fails when the bug bead has no origin label" {
  b=$(bug role:frontend); br close "$b" >/dev/null
  merged "$b"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"no closed bug bead"* ]]
}

@test "a bug filed as a labelled task does not count" {
  t=$(br create "List shows pending" -t task -l bug,origin:qa --json | jq -r .id); br close "$t" >/dev/null
  merged "$t"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"no closed bug bead"* ]]
}

@test "an open origin-labelled bug with a merged fix PR does not count" {
  b=$(bug role:frontend,origin:qa)
  merged "$b"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"no closed bug bead"* ]]
}

@test "a closed origin-labelled bug with no merged PR does not count" {
  b=$(bug role:frontend,origin:qa); br close "$b" >/dev/null
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"no closed bug bead"* ]]
}

@test "a fast-forwarded bug bead passes with fast-forwarded status" {
  b=$(bug role:frontend,origin:qa,course:fast-forwarded); br close "$b" >/dev/null
  echo '[]' > "$FIX/prs.json"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status "$COURSE_ROOT/progress/checks/S06.json")" = fast-forwarded ]
}

@test "caught-before-qa record line satisfies the bug path" {
  echo '[]' > "$FIX/prs.json"
  mkdir -p progress && printf 'notes\ncaught-before-qa: reviewer flagged the seed AC on PR #6\n' > progress/record.md
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 0 ]
}

@test "fails without a committed Playwright report" {
  rm -rf qa
  echo '[]' > "$FIX/prs.json"; mkdir -p progress && echo 'caught-before-qa: x' > progress/record.md
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"qa/test-reports"* ]]
}

@test "fails with an auth hint and writes JSON when gh fails" {
  stub_gh 'echo no >&2; exit 1'
  b=$(bug role:frontend,origin:qa); br close "$b" >/dev/null
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"gh auth status"* ]]
  [ -f "$COURSE_ROOT/progress/checks/S06.json" ]
}

@test "fails with a br init hint when beads are not initialised" {
  rm -rf .beads
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"br init"* ]]
}

@test "reference E2E green is recorded as evidence" {
  export COURSE_OFFLINE=0
  mkdir -p tests/e2e-reference && printf '#!/usr/bin/env bash\nexit 0\n' > tests/e2e-reference/run.sh && chmod +x tests/e2e-reference/run.sh
  b=$(bug role:frontend,origin:qa); br close "$b" >/dev/null
  merged "$b"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 0 ]
  jq -e '.evidence | index("reference E2E green")' "$COURSE_ROOT/progress/checks/S06.json"
}

@test "failing reference E2E fails the check" {
  export COURSE_OFFLINE=0
  mkdir -p tests/e2e-reference && printf '#!/usr/bin/env bash\necho boom\nexit 1\n' > tests/e2e-reference/run.sh && chmod +x tests/e2e-reference/run.sh
  b=$(bug role:frontend,origin:qa); br close "$b" >/dev/null
  merged "$b"
  run "$COURSE_DIR/checks/S06.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"reference E2E failed"* ]]
}
