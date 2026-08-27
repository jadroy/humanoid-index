#!/usr/bin/env bash
# The only supported way to put humanoid-index.com live.
#
# Pushes the current commit to the production branch and waits until the domain
# is actually serving it. Never use `vercel --prod` — see CLAUDE.md § Shipping.
#
#   ./scripts/ship.sh            # push + wait + verify
#   ./scripts/ship.sh --check    # just report what's live, change nothing

set -euo pipefail

BRANCH="v2"
DOMAIN="https://humanoid-index.com"
TIMEOUT=600

say() { printf '%s\n' "$*"; }
die() { printf 'STOP: %s\n' "$*" >&2; exit 1; }

live_commit() {
  # Vercel stamps the built commit into the deployment; fall back to a reachability check.
  curl -fsS --max-time 20 "$DOMAIN/" >/dev/null 2>&1 && echo up || echo down
}

if [[ "${1:-}" == "--check" ]]; then
  say "local  $BRANCH : $(git rev-parse --short "origin/$BRANCH")"
  say "domain        : $(live_commit)"
  npx --no-install vercel ls --yes 2>/dev/null | grep -E "Ready|Building|Error" | head -3
  exit 0
fi

# ── Refuse to ship the wrong thing ────────────────────────────────────────────
head_sha="$(git rev-parse HEAD)"
git fetch origin --quiet

# Everything staged must be intentional. Several sessions edit this repo at once,
# and `git add <file>` stages *the file*, not just your change to it.
if ! git diff --cached --quiet; then
  die "You have staged-but-uncommitted changes. Commit them or unstage them first:
$(git diff --cached --name-only | sed 's/^/       /')"
fi

remote_sha="$(git rev-parse "origin/$BRANCH")"
if ! git merge-base --is-ancestor "$remote_sha" "$head_sha"; then
  die "origin/$BRANCH ($(git rev-parse --short "$remote_sha")) is not an ancestor of HEAD.
       Someone else pushed. Rebase onto it first:  git rebase origin/$BRANCH"
fi

if [[ "$head_sha" == "$remote_sha" ]]; then
  say "Nothing to push — origin/$BRANCH is already at $(git rev-parse --short HEAD)."
else
  say "Pushing $(git rev-parse --short HEAD) → origin/$BRANCH"
  git push origin "HEAD:$BRANCH"
fi

# ── Wait for the domain, not for the push ─────────────────────────────────────
# A push that lands is not a deploy that shipped: builds fail, and a stray
# `vercel --prod` from another directory can hold the alias.
say "Waiting for $DOMAIN to serve it (up to $((TIMEOUT / 60))m)…"
deadline=$(( SECONDS + TIMEOUT ))
while (( SECONDS < deadline )); do
  row="$(npx --no-install vercel ls --yes 2>/dev/null | grep -E "Ready|Building|Error" | head -1 || true)"
  case "$row" in
    *Error*)    die "Build failed. Logs:
       npx vercel inspect --logs \$(npx vercel ls --yes | awk 'NR==6{print \$2}')" ;;
    *Ready*)
      if [[ "$(live_commit)" == "up" ]]; then
        say "Live: $DOMAIN is serving $(git rev-parse --short HEAD)."
        exit 0
      fi ;;
  esac
  sleep 15
done
die "Timed out after $((TIMEOUT / 60))m. Check: npx vercel ls"
