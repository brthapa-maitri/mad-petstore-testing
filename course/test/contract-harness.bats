load helpers

setup() {
  command -v docker >/dev/null || skip "docker not available"
  ROOT="$(cd "$COURSE_DIR/.." && pwd)"
  PORT=8765
  python3 "$ROOT/tests/contract/stub_server.py" "$PORT" & STUB=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fs "localhost:$PORT/pet/findByStatus?status=sold" >/dev/null && break; sleep 0.3; done
}
teardown() { [ -n "${STUB:-}" ] && kill "$STUB" 2>/dev/null || true; }

@test "contract tests pass against the conforming stub" {
  run "$ROOT/tests/contract/run.sh" "http://localhost:$PORT"
  echo "$output"
  [ "$status" -eq 0 ]
}

@test "contract tests fail when the server returns numeric ids" {
  sed 's/"id": str(/"id": int(/' "$ROOT/tests/contract/stub_server.py" > "$BATS_TEST_TMPDIR/bad.py"
  kill "$STUB"; wait "$STUB" 2>/dev/null || true
  python3 "$BATS_TEST_TMPDIR/bad.py" "$PORT" & STUB=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fs "localhost:$PORT/pet/findByStatus?status=sold" >/dev/null && break; sleep 0.3; done
  curl -fs "localhost:$PORT/pet/findByStatus?status=sold" >/dev/null
  run "$ROOT/tests/contract/run.sh" "http://localhost:$PORT"
  echo "$output"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Response violates schema"* ]]
  [[ "$output" == *'is not of type "string"'* ]]
}
