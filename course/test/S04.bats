load helpers
setup() { setup_repo; }

AC=$'## Acceptance Criteria\n- works'
mk() { br create "$1" -t task -l "$2" -d "${3-$AC}" >/dev/null; }

@test "passes with 3 tasks, one role each, AC, one QA story" {
  mk "API" role:backend; mk "UI" role:frontend; mk "E2E" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  echo "$output"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S04.json)" = pass ]
}

@test "fails when a task has no acceptance criteria" {
  mk "API" role:backend "just do it"; mk "UI" role:frontend; mk "E2E" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Acceptance Criteria"* ]]
}

@test "fails when a task has two role labels" {
  mk "API" role:backend,role:frontend; mk "UI" role:frontend; mk "E2E" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"exactly one role:"* ]]
}

@test "fails with zero QA stories" {
  mk "API" role:backend; mk "UI" role:frontend; mk "UI2" role:frontend
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"expected at least one role:qa story"* ]]
}

@test "passes with two QA stories" {
  mk "API" role:backend; mk "E2E" role:qa; mk "E2E2" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
}

@test "ignores superseded beads" {
  mk "API" role:backend; mk "UI" role:frontend; mk "E2E" role:qa
  mk "Old" role:backend,course:superseded "no ac"
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
}

@test "fails cleanly when beads are not initialised" {
  rm -rf .beads
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"br init"* ]]
  [ "$(jq -r .status progress/checks/S04.json)" = fail ]
}

cloud_arch() { mkdir -p docs; printf '### Deployment\n- **Decision:** %s\n' "$1" > docs/ARCHITECTURE.md; }

@test "a cloud deploy needs a role:devops Deploy story" {
  cloud_arch "aws eu-west-2"; mk "API" role:backend; mk "UI" role:frontend; mk "E2E" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"role:devops"* ]]
  [[ "$output" == *"expected a role:devops Deploy story"* ]]
  mk "Deploy" role:devops
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
  mk "Deploy2" role:devops
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
}

@test "no cloud, no devops story required" {
  cloud_arch "None (local only)"; mk "API" role:backend; mk "UI" role:frontend; mk "E2E" role:qa
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
}
