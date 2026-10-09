#!/usr/bin/env bash
# Puts a version of the site from GitHub on this server. Installed as /usr/local/bin/arizon-deploy.
#
#   arizon-deploy            deploy the latest `main` (does nothing if it is already live)
#   arizon-deploy --force    rebuild and redeploy even if `main` is already live
#   arizon-deploy --rollback switch back to the previous release (database is not touched)
#
# Every deploy is built in its own folder under /srv/arizon/releases and goes live only after
# the build succeeds, so a failed update never breaks the running site. The data is backed up
# before migrations run. The last few releases are kept for --rollback.
set -euo pipefail

BASE=/srv/arizon
REPO_URL=https://github.com/wdedwewdwd/site.git
BRANCH=main
KEEP_RELEASES=3
HEALTH_URL=http://127.0.0.1:3000/api/health

as_app() { sudo -u arizon -H "$@"; }
say() { printf '\n==> %s\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }
exec 9>/run/arizon-deploy.lock
flock -n 9 || { echo "Another deploy is already running."; exit 1; }

FORCE=false
case "${1:-}" in
  --force) FORCE=true ;;
  --rollback) ROLLBACK=true ;;
  "") ;;
  *) echo "Usage: arizon-deploy [--force|--rollback]"; exit 1 ;;
esac

current=$(readlink -e "$BASE/current" 2>/dev/null || true)

wait_healthy() {
  for _ in $(seq 1 60); do
    curl -fsS -m 5 "$HEALTH_URL" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

releases() { find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d | sort -r; }

switch_to() {
  ln -sfn "$1" "$BASE/current.new"
  mv -T "$BASE/current.new" "$BASE/current"
  systemctl restart arizon
}

if [ "${ROLLBACK:-false}" = true ]; then
  # Release folders start with their date, so name order is age order.
  previous=$(releases | awk -v cur="$current" '$0 < cur' | head -1)
  [ -n "$previous" ] || { echo "No previous release to roll back to."; exit 1; }
  say "Rolling back to $(basename "$previous")"
  switch_to "$previous"
  wait_healthy && echo "Site is up." || { echo "Site did not start; check: journalctl -u arizon -n 50"; exit 1; }
  exit 0
fi

say "Fetching $BRANCH from GitHub"
[ -d "$BASE/repo" ] || as_app git clone -q --bare "$REPO_URL" "$BASE/repo"
as_app git -C "$BASE/repo" fetch -q --prune origin "+refs/heads/*:refs/heads/*"
sha=$(as_app git -C "$BASE/repo" rev-parse --short=10 "$BRANCH")
echo "Latest: $sha $(as_app git -C "$BASE/repo" log -1 --format=%s "$BRANCH")"

if [ "$FORCE" = false ] && [ -n "$current" ] && [ "${current##*-}" = "$sha" ]; then
  echo "This version is already live. (Use --force to rebuild it.)"
  exit 0
fi

release="$BASE/releases/$(date +%Y%m%d-%H%M%S)-$sha"
say "Building $(basename "$release")"
# A release that never went live is removed, so a failed build leaves nothing behind.
LIVE=false
trap '[ "$LIVE" = true ] || rm -rf "$release"' EXIT
as_app mkdir -p "$release"
as_app bash -c "git -C '$BASE/repo' archive '$sha' | tar -x -C '$release'"
as_app ln -s "$BASE/shared/.env" "$release/.env"
cd "$release"
as_app npm ci --no-audit --no-fund --loglevel=error
as_app npm run build

if [ -n "$current" ]; then
  say "Backing up the data before migrations"
  as_app bash -c "umask 077; cd '$current' && npm run -s backup:create -- '$BASE/data/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).zip'"
fi

say "Applying database migrations"
as_app npx prisma migrate deploy

say "Going live"
switch_to "$release"
if ! wait_healthy; then
  echo "The new version did not start. Switching back to the previous one."
  if [ -n "$current" ]; then switch_to "$current"; else LIVE=true; fi
  exit 1
fi
LIVE=true
echo "Site is up: $(basename "$release")"

# Keep the newest releases (the live one is always kept) and old pre-deploy backups for 30 days.
releases | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  [ "$old" = "$release" ] || rm -rf "$old"
done
find "$BASE/data/backups" -name 'pre-deploy-*.zip' -mtime +30 -delete
say "Done"
