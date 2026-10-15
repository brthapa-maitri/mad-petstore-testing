#!/usr/bin/env bash
# Contract tests: Schemathesis against BASE_URL (the gate), then an informational OpenAPI diff.
set -euo pipefail
base="${1:?usage: tests/contract/run.sh BASE_URL}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
st_image="${SCHEMATHESIS_IMAGE:-schemathesis/schemathesis:4.29.4}"
diff_image="${OASDIFF_IMAGE:-tufin/oasdiff:v1.33.0}"

# Containers reach the host via host.docker.internal on macOS, via the host network on Linux.
net=(--network host); url="$base"
if [ "$(uname)" = Darwin ]; then
  net=(); url="${base/localhost/host.docker.internal}"; url="${url/127.0.0.1/host.docker.internal}"
fi

docker run --rm "${net[@]+"${net[@]}"}" -v "$root/contracts:/contracts:ro" "$st_image" \
  run /contracts/petstore-pets.yaml --url "$url" --checks all --generation-allow-x00 false

# The diff is informational only: framework-generated specs differ in shape, never fail the run on it.
served="$(mktemp -d)"
if curl -fsS "$base/openapi.json" -o "$served/openapi.json"; then
  echo "== OpenAPI diff (informational, does not affect the result) =="
  docker run --rm -v "$root/contracts:/contracts:ro" -v "$served:/served:ro" "$diff_image" \
    breaking /contracts/petstore-pets.yaml /served/openapi.json || true
  echo "== end of informational OpenAPI diff =="
else
  echo "no $base/openapi.json — skipping the informational OpenAPI diff"
fi
