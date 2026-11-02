#!/usr/bin/env bash
# Server hardening (2026-11 security review). Safe to run again; every changed file is backed up first.
#
#   bash /srv/arizon/current/deploy/server/arizon-harden.sh        (as root)
#
#   1. Nginx: only TLS 1.2 and 1.3 everywhere (the main site already was; the catch-all blocks for the bare IP
#      still allowed TLS 1.0/1.1 from the distribution's nginx.conf).
#   2. SSH: login stays key-only as before; X11 forwarding off, 3 tries per connection, 30 s to log in.
#   3. fail2ban: an address that fails SSH login 5 times in 10 minutes is blocked for an hour, repeat offenders
#      for a week (bots tried about 1,500 logins a day).
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }
say() { printf '\n==> %s\n' "$*"; }
BACKUP=/root/hardening-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP"

say "Nginx: TLS 1.2 and 1.3 only"
cp -a /etc/nginx/nginx.conf "$BACKUP/"
sed -i -E 's/^(\s*ssl_protocols)\s+[^;]*;/\1 TLSv1.2 TLSv1.3;/' /etc/nginx/nginx.conf
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  grep -h "ssl_protocols" /etc/nginx/nginx.conf /etc/nginx/sites-enabled/* | sed 's/^\s*/   /'
else
  cp -a "$BACKUP/nginx.conf" /etc/nginx/nginx.conf
  echo "   nginx rejected the change; the old file is back."; exit 1
fi

say "SSH: tighter limits (still key-only)"
DROPIN=/etc/ssh/sshd_config.d/01-arizon-hardening.conf
[ -f "$DROPIN" ] && cp -a "$DROPIN" "$BACKUP/"
cat > "$DROPIN" <<'EOF'
# Arizon hardening (deploy/server/arizon-harden.sh). Loaded before the other files, so these values win.
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
EOF
if sshd -t; then
  systemctl reload ssh
  sshd -T | grep -E '^(passwordauthentication|permitrootlogin|x11forwarding|maxauthtries|logingracetime) ' | sed 's/^/   /'
else
  rm -f "$DROPIN"; [ -f "$BACKUP/$(basename "$DROPIN")" ] && cp -a "$BACKUP/$(basename "$DROPIN")" "$DROPIN"
  echo "   sshd rejected the change; nothing was applied."; exit 1
fi

say "fail2ban for SSH"
if ! command -v fail2ban-client >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q fail2ban >/dev/null
fi
[ -f /etc/fail2ban/jail.d/arizon.local ] && cp -a /etc/fail2ban/jail.d/arizon.local "$BACKUP/"
cat > /etc/fail2ban/jail.d/arizon.local <<'EOF'
# Arizon hardening (deploy/server/arizon-harden.sh).
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h

# Addresses banned 5 times in a day are banned for a week.
[recidive]
enabled  = true
maxretry = 5
findtime = 1d
bantime  = 1w
EOF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 2
fail2ban-client status | sed 's/^/   /'

say "Done. Backups of the changed files: $BACKUP"
