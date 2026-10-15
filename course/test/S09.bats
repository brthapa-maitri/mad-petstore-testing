load helpers
setup() { setup_repo; mkdir -p .deploy; }

@test "passes when the URL was retired and no longer answers" {
  echo https://pets.example.com > .deploy/url.destroyed; stub_bin curl 'echo 000; exit 7'
  run "$COURSE_DIR/checks/S09.sh"; echo "$output"
  [ "$status" -eq 0 ]
  [ "$(jq -r .status progress/checks/S09.json)" = pass ]
}

@test "fails while .deploy/url still exists" {
  echo https://pets.example.com > .deploy/url; echo https://pets.example.com > .deploy/url.destroyed
  stub_bin curl 'echo 000; exit 7'
  run "$COURSE_DIR/checks/S09.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"teardown.sh"* ]]
}

@test "fails when the old URL still answers 200" {
  echo https://pets.example.com > .deploy/url.destroyed; stub_bin curl 'echo 200'
  run "$COURSE_DIR/checks/S09.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"still answers"* ]]
}

@test "fails when nothing was ever torn down" {
  run "$COURSE_DIR/checks/S09.sh"
  [ "$status" -eq 1 ]; [[ "$output" == *"url.destroyed"* ]]
}
