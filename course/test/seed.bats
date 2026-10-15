load helpers
setup() { setup_repo; }

@test "seed files one frontend task with AC and records its id" {
  run "$COURSE_DIR/seeds/bug-bead.sh"
  [ "$status" -eq 0 ]
  id=$(cat progress/seed-bead-id)
  bead=$(br list --all --json | jq --arg id "$id" '(.issues // .)[] | select(.id == $id)')
  [ "$(echo "$bead" | jq -r .issue_type)" = task ]
  [ "$(echo "$bead" | jq -r '.labels | join(",")')" = role:frontend ]
  echo "$bead" | jq -r .description | grep -q '^## Acceptance Criteria'
}

@test "seed passes the S04 shape rules for its own bead" {
  "$COURSE_DIR/seeds/bug-bead.sh" >/dev/null
  br create API -t task -l role:backend -d $'## Acceptance Criteria\n- a' >/dev/null
  br create E2E -t task -l role:qa -d $'## Acceptance Criteria\n- a' >/dev/null
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
}

@test "seed fails clearly without writing an id when beads are not initialised" {
  rm -rf .beads
  run "$COURSE_DIR/seeds/bug-bead.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"br init"* ]]
  [ ! -e progress/seed-bead-id ]
}
