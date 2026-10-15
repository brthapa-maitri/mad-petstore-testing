load helpers
setup() { setup_repo; mkdir -p .deploy tests/e2e-reference; }
e2e() { printf '#!/usr/bin/env bash\n%s\n' "$1" > tests/e2e-reference/run.sh; chmod +x tests/e2e-reference/run.sh; }

@test "passes when /health is 200 and the reference E2E passes" {
  echo https://pets.example.com > .deploy/url; stub_bin curl 'echo 200'; e2e 'exit 0'
  run "$COURSE_DIR/checks/S08.sh"; echo "$output"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S08.json)" = pass ]
}

@test "fails without a recorded URL" {
  run "$COURSE_DIR/checks/S08.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *".deploy/url"* ]]
}

@test "fails when /health is not 200" {
  echo https://pets.example.com > .deploy/url; stub_bin curl 'echo 503'; e2e 'exit 0'
  run "$COURSE_DIR/checks/S08.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"returned 503"* ]]
}

@test "fails when the reference E2E fails" {
  echo https://pets.example.com > .deploy/url; stub_bin curl 'echo 200'; e2e 'exit 1'
  run "$COURSE_DIR/checks/S08.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"reference E2E failed"* ]]
}

@test "a trailing slash in the recorded URL is dropped" {
  echo https://pets.example.com/ > .deploy/url
  stub_bin curl 'for a; do last=$a; done; echo "$last" > curl-arg; echo 200'; e2e 'echo "$1" > e2e-arg'
  run "$COURSE_DIR/checks/S08.sh"
  [ "$status" -eq 0 ]
  [ "$(cat curl-arg)" = https://pets.example.com/health ]
  [ "$(cat e2e-arg)" = https://pets.example.com ]
}
