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
  # /api/version reports the commit this deployment was built from, so "is it
  # live?" is an equality check rather than a guess. Empty if the domain is down.
  curl -fsS --max-time 20 "$DOMAIN/api/version" 2>/dev/null \
    | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'
}

if [[ "${1:-}" == "--check" ]]; then
  say "origin/$BRANCH : $(git rev-parse --short "origin/$BRANCH")"
  say "domain        : $(live_commit | cut -c1-7)"
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
want="$(git rev-parse HEAD)"
while (( SECONDS < deadline )); do
  got="$(live_commit)"
  if [[ "$got" == "$want" ]]; then
    say "Live: $DOMAIN is serving $(git rev-parse --short HEAD)."
    exit 0
  fi
  sleep 10
done

# Timed out — say why, since "still building" and "build failed" look identical
# from the outside, and a stray `vercel --prod` elsewhere can hold the alias.
say "Domain is still on ${got:-<unreachable>}, expected $(git rev-parse --short "$want")."
npx --no-install vercel ls --yes 2>/dev/null | grep -E "Ready|Building|Error" | head -3 || true
die "Timed out after $((TIMEOUT / 60))m. If a row above says Error, run:
       npx vercel inspect --logs <that-url>"
