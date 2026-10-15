load helpers

setup() { setup_repo; source "$COURSE_DIR/lib/common.sh"; }

@test "finish writes pass JSON when nothing failed" {
  note "all good"
  run finish S99
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S99.json)" = pass ]
  [ "$(jq -r '.evidence[0]' progress/checks/S99.json)" = "all good" ]
}

@test "finish writes fail JSON and returns 1 when something failed" {
  fail "missing thing"
  run finish S99
  [ "$status" -eq 1 ]
  [ "$(jq -r '.failures[0]' progress/checks/S99.json)" = "missing thing" ]
}

@test "a passing check keeps fast-forwarded status from a previous skip" {
  mkdir -p progress/checks && echo '{"status":"fast-forwarded"}' > progress/checks/S99.json
  run finish S99
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S99.json)" = fast-forwarded ]
}

@test "beads_json returns an array including closed beads" {
  id=$(br create "A" -t task --json | jq -r .id)
  br close "$id" >/dev/null
  run beads_json
  [ "$(echo "$output" | jq 'length')" -eq 1 ]
  [ "$(echo "$output" | jq -r '.[0].status')" = closed ]
}

@test "stage_start is 0 without stages.json and reads it when present" {
  [ "$(stage_start S05)" = 0 ]
  mkdir -p progress && echo '{"S05":{"start":1791450000}}' > progress/stages.json
  [ "$(stage_start S05)" = 1791450000 ]
}

@test "beads_json fails when beads are not initialised" {
  rm -rf .beads
  run beads_json
  [ "$status" -ne 0 ]
}
