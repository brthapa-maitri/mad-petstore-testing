#!/usr/bin/env bash
# S02 Architecture: docs/ARCHITECTURE.md has a Deployment decision naming a cloud and region, no credentials; stack standards generated.
set -euo pipefail
source "$(dirname "$0")/../lib/common.sh"

arch="$COURSE_ROOT/docs/ARCHITECTURE.md"
if [ ! -f "$arch" ]; then
  fail "docs/ARCHITECTURE.md missing: run /mad-plan (Phase 0 writes it)"
  finish S02 || exit 1
fi
deploy=$(deployment_section "$arch")
cloud=$(deployment_cloud "$arch")
if [ -z "$deploy" ]; then fail "ARCHITECTURE.md has no '### Deployment' decision"
elif [ -z "$cloud" ]; then fail "the Deployment decision names no cloud (aws, azure or gcp)"
else grep -qi region <<<"$deploy" || fail "the Deployment decision records no region"; fi
if grep -qE 'AKIA[0-9A-Z]{16}|aws_secret_access_key|-----BEGIN [A-Z ]*PRIVATE KEY' "$arch"; then
  fail "ARCHITECTURE.md contains what looks like a credential: remove it"
fi
sk="$COURSE_ROOT/.claude/skills"
[ -f "$sk/mad-backend-standards/SKILL.md" ] || [ -f "$sk/mad-frontend-standards/SKILL.md" ] || fail "no stack standards: accept /create-project-overlay in Phase 0"
note "cloud: ${cloud:-none}"
finish S02
