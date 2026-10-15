# Shared bats helpers: temp beads repo and a stubbable gh.
COURSE_DIR="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

setup_repo() {
  export COURSE_ROOT="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$COURSE_ROOT" && cd "$COURSE_ROOT"
  git init -q -b develop && git commit -q --allow-empty -m init
  br init >/dev/null 2>&1
}

stub_bin() {
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  printf '#!/usr/bin/env bash\n%s\n' "$2" > "$BATS_TEST_TMPDIR/bin/$1"
  chmod +x "$BATS_TEST_TMPDIR/bin/$1"
  export PATH="$BATS_TEST_TMPDIR/bin:$PATH"
}

stub_gh() { stub_bin gh "$1"; }
