# Shared helpers for course checks and tools. Source this file; don't execute it.
COURSE_ROOT="${COURSE_ROOT:-$(git rev-parse --show-toplevel)}"
CHECKS_DIR="$COURSE_ROOT/progress/checks"
FAILS=()
EVIDENCE=()
COURSE_FF=0

fail() { FAILS+=("$1"); }
note() { EVIDENCE+=("$1"); }
json_array() { jq -n '$ARGS.positional' --args "$@"; }

emit_result() {
  mkdir -p "$CHECKS_DIR"
  jq -n --arg stage "$1" --arg status "$2" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson failures "$(json_array ${FAILS[@]+"${FAILS[@]}"})" \
    --argjson evidence "$(json_array ${EVIDENCE[@]+"${EVIDENCE[@]}"})" \
    '{stage:$stage,status:$status,failures:$failures,evidence:$evidence,at:$at}' \
    > "$CHECKS_DIR/$1.json"
}

previous_status() { jq -r '.status // empty' "$CHECKS_DIR/$1.json" 2>/dev/null || true; }

finish() {
  local stage="$1" status=pass f
  if [ ${#FAILS[@]} -gt 0 ]; then status=fail
  elif [ "$COURSE_FF" = 1 ] || [ "$(previous_status "$stage")" = fast-forwarded ]; then status=fast-forwarded
  fi
  emit_result "$stage" "$status"
  echo "$stage: $status"
  for f in ${FAILS[@]+"${FAILS[@]}"}; do echo "  ✗ $f"; done
  [ "$status" != fail ]
}

beads_json() {
  local out
  out=$(cd "$COURSE_ROOT" && br list --all --json --limit 0) || return
  jq '.issues // .' <<<"$out"
}

stage_start() { jq -r --arg s "$1" '.[$s].start // 0' "$COURSE_ROOT/progress/stages.json" 2>/dev/null || echo 0; }

merged_prs() { (cd "$COURSE_ROOT" && gh pr list --state merged --base "$1" --limit 200 --json number,title,mergedAt,headRefName); }

pr_for_bead() {
  jq -r --arg tag "[$2]" --argjson since "$3" \
    '[.[] | select((.title | contains($tag)) and ((.mergedAt | fromdateiso8601) >= $since))] | first | .number // empty' <<<"$1"
}

# Body of the '### Deployment' section of an architecture file, up to the next heading.
deployment_section() { awk '/^#+ +Deployment/{on=1;next} on && /^#+ /{exit} on' "$1" 2>/dev/null || true; }
# The cloud the Deployment decision names (aws, azure or gcp), or nothing.
deployment_cloud() { deployment_section "$1" | grep -oiwE 'aws|azure|gcp' | head -1 | tr '[:upper:]' '[:lower:]' || true; }
