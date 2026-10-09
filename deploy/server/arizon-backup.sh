#!/usr/bin/env bash
# Daily backup of all site data (database + uploaded images) in the same ZIP format as
# Settings → backup in the admin panel. Installed as /usr/local/bin/arizon-backup and run
# by /etc/cron.d/arizon as the `arizon` user. Daily files are kept for 14 days.
set -euo pipefail
umask 077
DIR=/srv/arizon/data/backups
cd /srv/arizon/current
npm run -s backup:create -- "$DIR/auto-$(date +%F).zip" >/dev/null
find "$DIR" -name 'auto-*.zip' -mtime +14 -delete
