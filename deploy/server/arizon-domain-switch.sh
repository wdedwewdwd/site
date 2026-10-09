#!/usr/bin/env bash
# Moves the site from the bare IP to its domain, without a gap. Installed as
# /usr/local/bin/arizon-domain-switch and run every minute by arizon-domain.timer until done.
# As soon as a domain's DNS (asked straight from its own name servers) points to this server,
# a Let's Encrypt certificate is issued for every name that does, Nginx serves them
# (www and .com redirect to the main domain) and APP_URL becomes https://arizonyadak.ir.
set -euo pipefail

IP=45.149.77.216
MAIN=arizonyadak.ir
NAMES=(arizonyadak.ir www.arizonyadak.ir arizonyadak.com www.arizonyadak.com)
STATE=/var/lib/arizon-domain
ACME=/root/.acme.sh/acme.sh
ENV_FILE=/srv/arizon/shared/.env
mkdir -p "$STATE"

points_here() {
  local zone ns
  zone=$(echo "$1" | awk -F. '{print $(NF-1)"."$NF}')
  ns=$(dig +short NS "$zone" | head -1)
  [ -n "$ns" ] && [ "$(dig +short "$1" A @"$ns" | tail -1)" = "$IP" ]
}

ready=()
for n in "${NAMES[@]}"; do points_here "$n" && ready+=("$n"); done
printf '%s\n' "${ready[@]}" | grep -qx "$MAIN" || { echo "Waiting: $MAIN does not point here yet."; exit 0; }

want=$(printf '%s\n' "${ready[@]}" | sort | tr '\n' ' ')
have=$(cat "$STATE/names" 2>/dev/null || true)
if [ "$want" != "$have" ]; then
  # Let's Encrypt allows only a few failed checks per hour; after a failure, wait 20 minutes.
  if [ -f "$STATE/failed" ] && [ $(( $(date +%s) - $(stat -c %Y "$STATE/failed") )) -lt 1200 ]; then
    echo "Last attempt failed recently; retrying later."; exit 0
  fi
  echo "Issuing a certificate for: $want"
  args=(); for n in "${ready[@]}"; do args+=(-d "$n"); done
  if ! "$ACME" --issue --server letsencrypt "${args[@]}" --webroot /var/www/acme --keylength ec-256 --force; then
    touch "$STATE/failed"; exit 1
  fi
  rm -f "$STATE/failed"
  "$ACME" --install-cert -d "$MAIN" --ecc --key-file /etc/nginx/ssl/domain.key \
    --fullchain-file /etc/nginx/ssl/domain.crt --reloadcmd "systemctl reload nginx"
  chmod 600 /etc/nginx/ssl/domain.key

  others=$(printf '%s\n' "${ready[@]}" | grep -vx "$MAIN" | tr '\n' ' ')
  cat > /etc/nginx/sites-available/arizon <<NGX
# Installed as /etc/nginx/sites-available/arizon (linked from sites-enabled). Written by arizon-domain-switch.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 301 https://$MAIN\$request_uri; }
}

# The bare IP (and any unknown name) goes to the main domain. Keeps its own IP certificate.
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    ssl_certificate     /etc/nginx/ssl/arizon.crt;
    ssl_certificate_key /etc/nginx/ssl/arizon.key;
    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 301 https://$MAIN\$request_uri; }
}
NGX
  if [ -n "${others// /}" ]; then
    cat >> /etc/nginx/sites-available/arizon <<NGX

# www and .com redirect to the main domain.
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $others;
    ssl_certificate     /etc/nginx/ssl/domain.crt;
    ssl_certificate_key /etc/nginx/ssl/domain.key;
    return 301 https://$MAIN\$request_uri;
}
NGX
  fi
  cat >> /etc/nginx/sites-available/arizon <<NGX

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $MAIN;

    ssl_certificate     /etc/nginx/ssl/domain.crt;
    ssl_certificate_key /etc/nginx/ssl/domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 12m;   # server actions accept up to 9 MB of images

    location / {
        include snippets/arizon-proxy.conf;
    }

    # Live chat streams (Server-Sent Events): no buffering, long-lived connections
    location ~ ^/api/(admin/)?chat/ {
        include snippets/arizon-proxy.conf;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }

    # Admin backup restore accepts large zip files
    location = /api/admin/backup/restore {
        client_max_body_size 500m;
        proxy_request_buffering off;
        proxy_read_timeout 10m;
        include snippets/arizon-proxy.conf;
    }

    # Built assets are fingerprinted and safe to cache for a long time
    location /_next/static/ {
        include snippets/arizon-proxy.conf;
        expires 365d;
        access_log off;
    }
}
NGX
  nginx -t
  systemctl reload nginx

  if ! grep -qx "APP_URL=\"https://$MAIN\"" "$ENV_FILE"; then
    sed -i "s|^APP_URL=.*|APP_URL=\"https://$MAIN\"|" "$ENV_FILE"
    systemctl restart arizon
    # Pages prerendered at build time (robots.txt, sitemap links, metadata) still carry the old
    # address, so rebuild once in the background; the site stays up meanwhile.
    systemd-run --unit "arizon-rebuild-$(date +%s)" --collect /usr/local/bin/arizon-deploy --force
  fi
  echo "$want" > "$STATE/names"
  echo "Now serving: $want"
fi

if [ "${#ready[@]}" -eq "${#NAMES[@]}" ]; then
  echo "All names point here; switch complete."
  systemctl disable --now arizon-domain.timer >/dev/null 2>&1 || true
fi
