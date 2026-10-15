load helpers
setup() { setup_repo; mkdir -p docs .claude/skills/mad-project-context .claude/skills/mad-backend-standards; touch .claude/skills/mad-project-context/SKILL.md .claude/skills/mad-backend-standards/SKILL.md; }
arch() { printf '# Architecture: Pets\n\n## Decisions\n%s\n' "$1" > docs/ARCHITECTURE.md; }
DEPLOY=$'### Deployment\n- **Decision:** aws eu-west-2, account 123456789012; ECS Fargate + RDS PostgreSQL; region eu-west-2\n'

@test "passes with a Deployment decision naming a cloud and region, and an overlay" {
  arch "$DEPLOY"
  run "$COURSE_DIR/checks/S02.sh"; echo "$output"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S02.json)" = pass ]
}

@test "fails without docs/ARCHITECTURE.md" {
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"/mad-plan"* ]]
}

@test "fails without a Deployment decision" {
  arch $'### Backend: FastAPI\n- **Decision:** FastAPI\n'
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"Deployment"* ]]
}

@test "fails when the Deployment decision names no cloud" {
  arch $'### Deployment\n- **Decision:** None (local only)\n'
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"names no cloud"* ]]
}

@test "fails when the architecture holds a credential" {
  arch "$DEPLOY"$'\nkey AKIAABCDEFGHIJKLMNOP\n'
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"credential"* ]]
}

@test "fails without stack standards" {
  arch "$DEPLOY"; rm -r .claude/skills/mad-backend-standards
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"no stack standards"* ]]
}

@test "passes with frontend standards only" {
  arch "$DEPLOY"; rm -r .claude/skills/mad-backend-standards
  mkdir -p .claude/skills/mad-frontend-standards; touch .claude/skills/mad-frontend-standards/SKILL.md
  run "$COURSE_DIR/checks/S02.sh"
  [ "$status" -eq 0 ]
}
