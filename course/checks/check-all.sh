#!/usr/bin/env bash
# Run every stage check, or only those up to a given stage: check-all.sh [S##]. Exit 1 if any failed.
set -uo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
current="${1:-}"
rc=0
for check in "$dir"/S[0-9][0-9].sh; do
  stage=$(basename "$check" .sh)
  if [ -n "$current" ] && [[ "$stage" > "$current" ]]; then continue; fi
  "$check" || rc=1
done
exit $rc
