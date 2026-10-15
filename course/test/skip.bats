load helpers

setup() {
  setup_repo
  REFREPO="$BATS_TEST_TMPDIR/reference"
  mkdir -p "$REFREPO/reference" "$REFREPO/api" "$REFREPO/web" "$REFREPO/qa/test-reports/pets"
  echo '[{"title":"Ref API","labels":["role:backend"],"description":"## Acceptance Criteria\n- a"},
         {"title":"Ref UI","labels":["role:frontend"],"description":"## Acceptance Criteria\n- b"},
         {"title":"Ref E2E","labels":["role:qa"],"description":"## Acceptance Criteria\n- c"}]' > "$REFREPO/reference/backlog.json"
  echo api > "$REFREPO/api/main.py"; echo web > "$REFREPO/web/page.tsx"; echo r > "$REFREPO/qa/test-reports/pets/index.html"
  git -C "$REFREPO" init -q -b main && git -C "$REFREPO" add -A && git -C "$REFREPO" commit -q -m ref
  export COURSE_REFERENCE_URL="$REFREPO"
  git init -q --bare "$BATS_TEST_TMPDIR/origin.git"
  git remote add origin "$BATS_TEST_TMPDIR/origin.git" && git push -q origin develop
}

@test "S04 supersedes open learner tasks and loads the reference backlog" {
  old=$(br create "Mine" -t task -l role:backend --json | jq -r .id)
  run "$COURSE_DIR/skip.sh" S04
  [ "$status" -eq 0 ]
  [ "$(br show "$old" --json | jq -r '(.[0] // .).status')" = closed ]
  run "$COURSE_DIR/checks/S04.sh"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S04.json)" = fast-forwarded ]
}

@test "S04 keeps open role:devops beads (the learner's Deploy story)" {
  old=$(br create "Mine" -t task -l role:backend --json | jq -r .id)
  dep=$(br create "Deploy" -t task -l role:devops --json | jq -r .id)
  run "$COURSE_DIR/skip.sh" S04
  [ "$status" -eq 0 ]
  [ "$(br show "$old" --json | jq -r '(.[0] // .).status')" = closed ]
  [ "$(br show "$dep" --json | jq -r '(.[0] // .).status')" = open ]
  [ "$(br show "$dep" --json | jq -r '(.[0] // .).labels | index("course:superseded")')" = null ]
}

@test "S05 leaves open role:devops beads for the team and says so" {
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  dep=$(br create "Deploy" -t task -l role:devops --json | jq -r .id)
  run "$COURSE_DIR/skip.sh" S05
  echo "$output"
  [ "$status" -eq 0 ]
  [ "$(br show "$b" --json | jq -r '(.[0] // .).status')" = closed ]
  [ "$(br show "$dep" --json | jq -r '(.[0] // .).status')" = open ]
  [[ "$output" == *"role:devops"* ]]
}

@test "S05 copies the layer for each open story, closes it and pushes" {
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  run "$COURSE_DIR/skip.sh" S05
  echo "$output"
  [ "$status" -eq 0 ]
  [ "$(cat api/main.py)" = api ]
  [ ! -e web/page.tsx ]
  [ "$(br show "$b" --json | jq -r '(.[0] // .).status')" = closed ]
  [ "$(git rev-parse HEAD)" = "$(git --git-dir="$BATS_TEST_TMPDIR/origin.git" rev-parse develop)" ]
}

@test "S05 refuses on a dirty tree and changes nothing" {
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  echo x > dirty.txt
  head=$(git rev-parse HEAD)
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 1 ]
  [[ "$output" == *"working tree"* ]]
  [ "$(git rev-parse HEAD)" = "$head" ]
  [ "$(br show "$b" --json | jq -r '(.[0] // .).status')" = open ]
}

@test "S05 refuses off develop" {
  git switch -q -c feat/x
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  head=$(git rev-parse HEAD)
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 1 ]
  [[ "$output" == *"develop"* ]]
  [ "$(git rev-parse HEAD)" = "$head" ]
  [ "$(br show "$b" --json | jq -r '(.[0] // .).status')" = open ]
}

@test "S05 refuses on a detached HEAD" {
  git switch -q --detach
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 1 ]
  [[ "$output" == *"develop"* ]]
}

@test "S06 refuses off develop and on a dirty tree, changing nothing" {
  head=$(git rev-parse HEAD)
  echo x > dirty.txt
  run "$COURSE_DIR/skip.sh" S06
  [ "$status" -eq 1 ]
  [[ "$output" == *"working tree"* ]]
  rm dirty.txt
  git switch -q -c feat/x
  run "$COURSE_DIR/skip.sh" S06
  [ "$status" -eq 1 ]
  [ "$(git rev-parse HEAD)" = "$head" ]
  [ "$(br list --all --json | jq '[(.issues // .)[] | select(.issue_type == "bug")] | length')" -eq 0 ]
}

@test "changes under .beads and progress do not block S05" {
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  mkdir -p progress && echo x > progress/note.txt && echo y > .beads/extra.txt
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 0 ]
}

@test "S05 refuses when local develop is ahead of origin and changes nothing" {
  b=$(br create "API" -t task -l role:backend --json | jq -r .id)
  git commit -q --allow-empty -m local
  head=$(git rev-parse HEAD)
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 1 ]
  [[ "$output" == *"origin/develop"* ]]
  [ "$(git rev-parse HEAD)" = "$head" ]
  [ "$(br show "$b" --json | jq -r '(.[0] // .).status')" = open ]
}

@test "S05 with a story lacking a role label changes nothing" {
  a=$(br create "API" -t task -l role:backend --json | jq -r .id)
  br create "Odd" -t task -l misc --json >/dev/null
  head=$(git rev-parse HEAD)
  run "$COURSE_DIR/skip.sh" S05
  [ "$status" -eq 1 ]
  [ "$(git rev-parse HEAD)" = "$head" ]
  [ "$(br show "$a" --json | jq -r '(.[0] // .).status')" = open ]
}

@test "S06 files a closed fast-forwarded bug and copies web and the report" {
  run "$COURSE_DIR/skip.sh" S06
  [ "$status" -eq 0 ]
  [ -f qa/test-reports/pets/index.html ]
  [ "$(br list --all --json | jq '[(.issues // .)[] | select(.issue_type == "bug" and .status == "closed")] | length')" -eq 1 ]
  [ "$(jq -r .status progress/checks/S06.json)" = fast-forwarded ]
}

@test "unknown stage is a usage error" {
  run "$COURSE_DIR/skip.sh" S03
  [ "$status" -eq 2 ]
}
