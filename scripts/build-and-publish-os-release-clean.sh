#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="${WORKTREE_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/redcore-os-release-worktree.XXXXXX")}"
KEEP_WORKTREE="${KEEP_WORKTREE:-0}"

cleanup() {
  rm -f "$WORKTREE_DIR/node_modules"
  if [ "$KEEP_WORKTREE" = "1" ]; then
    return
  fi

  git -C "$ROOT_DIR" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || rm -rf "$WORKTREE_DIR"
}
trap cleanup EXIT

git -C "$ROOT_DIR" worktree add --detach "$WORKTREE_DIR" HEAD >/dev/null

if [ -d "$ROOT_DIR/node_modules" ] && [ ! -e "$WORKTREE_DIR/node_modules" ]; then
  ln -s "$ROOT_DIR/node_modules" "$WORKTREE_DIR/node_modules"
fi

exec "$WORKTREE_DIR/scripts/build-and-publish-os-release.sh"
