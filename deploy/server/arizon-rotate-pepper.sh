#!/usr/bin/env bash
# Changes OTP_PEPPER on this server without locking anyone out (see scripts/rotate-pepper.ts). Run as root:
#
#   bash /srv/arizon/current/deploy/server/arizon-rotate-pepper.sh            start: new pepper, old one kept
#                                                                             as OTP_PEPPER_PREVIOUS, saved
#                                                                             secrets re-encrypted
#   bash /srv/arizon/current/deploy/server/arizon-rotate-pepper.sh --status   who has signed in since
#   bash /srv/arizon/current/deploy/server/arizon-rotate-pepper.sh --finish   remove OTP_PEPPER_PREVIOUS once
#                                                                             every staff member has signed in
#
# No secret is ever printed. The .env file is backed up (mode 600) before every change.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }
ENV_FILE=/srv/arizon/shared/.env
APP=/srv/arizon/current
reseal() { (cd "$APP" && sudo -u arizon -H npm run -s secrets:reseal -- "$@"); }
backup_env() { local b="/root/env-backup-$(date +%Y%m%d-%H%M%S)"; cp -a "$ENV_FILE" "$b"; chmod 600 "$b"; echo "   .env backed up to $b"; }

case "${1:-}" in
  --status)
    reseal --status
    ;;
  --finish)
    out=$(reseal --status); echo "$out"
    if ! grep -q "can be removed" <<<"$out"; then
      echo "Not every staff member has signed in since the change; OTP_PEPPER_PREVIOUS stays for now."; exit 1
    fi
    backup_env
    sed -i '/^OTP_PEPPER_PREVIOUS=/d' "$ENV_FILE"
    systemctl restart arizon
    echo "OTP_PEPPER_PREVIOUS removed and the site restarted: the old pepper is no longer used anywhere."
    ;;
  "")
    if grep -Eq '^OTP_PEPPER_PREVIOUS=.{32,}' "$ENV_FILE"; then
      echo "A change is already in progress (OTP_PEPPER_PREVIOUS is set). Use --status or --finish."; exit 1
    fi
    old=$(grep -E '^OTP_PEPPER=' "$ENV_FILE" | tail -1 | cut -d= -f2-)
    [ ${#old} -ge 32 ] || { echo "OTP_PEPPER was not found in $ENV_FILE."; exit 1; }
    grep -q 'OTP_PEPPER_PREVIOUS' "$APP/src/lib/env.ts" || { echo "Deploy the version that supports OTP_PEPPER_PREVIOUS first."; exit 1; }
    new=$(openssl rand -base64 48 | tr -d '\n')
    backup_env
    tmp=$(mktemp)
    grep -Ev '^OTP_PEPPER(_PREVIOUS)?=' "$ENV_FILE" > "$tmp"
    printf 'OTP_PEPPER=%s\nOTP_PEPPER_PREVIOUS=%s\n' "$new" "$old" >> "$tmp"
    install -m 600 -o arizon -g arizon "$tmp" "$ENV_FILE"
    rm -f "$tmp"; unset old new
    systemctl restart arizon
    for _ in $(seq 1 60); do curl -fsS -m 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1 && break; sleep 1; done
    curl -fsS -m 5 http://127.0.0.1:3000/api/health >/dev/null || { echo "The site did not come back up; restore the .env backup above."; exit 1; }
    echo "   site restarted with the new pepper"
    reseal
    echo "Staff codes move to the new pepper at each person's next sign-in. Check with --status, then run --finish."
    ;;
  *)
    echo "Usage: arizon-rotate-pepper.sh [--status|--finish]"; exit 1
    ;;
esac
