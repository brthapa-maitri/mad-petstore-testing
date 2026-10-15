#!/usr/bin/env bash
# File the seeded S06 bead. Its AC deliberately contradicts the approved spec's default filter.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
source "$here/../lib/common.sh"
cd "$COURSE_ROOT"
if ! out=$(br create "Pet list: show available and pending pets by default" -t task -p 2 \
  -l role:frontend -d "$(cat "$here/bug-bead.md")" --json); then
  echo "br create failed — run 'br init' in $COURSE_ROOT first" >&2
  exit 1
fi
id=$(jq -r '.id // .[0].id // empty' <<<"$out")
[ -n "$id" ] || { echo "br create returned no bead id" >&2; exit 1; }
mkdir -p progress && echo "$id" > progress/seed-bead-id
echo "Filed seed bead $id"
