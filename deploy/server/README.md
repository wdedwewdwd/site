# Production server (ParsPack cloud, Tehran)

Site: **https://arizonyadak.ir**. Ubuntu 24.04, 2 vCPU / 4 GB RAM (+2 GB swap) / 60 GB, IP `45.149.77.216`. Everything runs on the one
machine: Nginx (TLS, reverse proxy) → Next.js (`arizon.service`, 127.0.0.1:3000) → PostgreSQL 16 (localhost).
SSH is root with the key `~/.ssh/arizon_server` on the owner's laptop (alias `arizon` in `~/.ssh/config`).

## Layout

| Path | What |
|---|---|
| `/srv/arizon/current` | symlink to the live release (the service's working directory) |
| `/srv/arizon/releases/<date>-<sha>/` | one folder per deploy, the newest 3 are kept |
| `/srv/arizon/repo` | bare clone of GitHub, source for releases |
| `/srv/arizon/shared/.env` | production settings (linked into every release; mode 600, never commit) |
| `/srv/arizon/data/uploads` | `UPLOAD_DIR` (product, banner and chat images) |
| `/srv/arizon/data/backups` | `auto-*.zip` daily (14 days), `pre-deploy-*.zip` before migrations (30 days) |

Files in this folder are the installed copies: `arizon-deploy.sh` → `/usr/local/bin/arizon-deploy`,
`arizon-backup.sh` → `/usr/local/bin/arizon-backup`, `arizon.cron` → `/etc/cron.d/arizon`,
`arizon.service` → `/etc/systemd/system/`, `nginx/*` → the paths in their first lines.
After editing one here, copy it to the server too (the deploy script does not install them).

## Everyday commands

```bash
ssh arizon arizon-deploy              # deploy GitHub main (owner: double-click update-server.cmd)
ssh arizon arizon-deploy --rollback   # back to the previous release (database untouched)
ssh arizon journalctl -u arizon -f    # site log; with SMS_PROVIDER=console, login codes appear here as [dev-sms]
ssh arizon "cd /srv/arizon/current && sudo -u arizon npm run admin:set -- 09xxxxxxxxx"   # first admin / reset a code
```

Deploy = build a new release folder → back up data → `prisma migrate deploy` → switch the symlink →
restart → health check (`/api/health`), switching back if the new version does not start.

## Domain and TLS

`arizonyadak.ir` and `arizonyadak.com` are registered at MihanWebHost. Their DNS zones live on the owner's
MihanWebHost cPanel hosting (name servers `ns723/ns724.mihanwebhost.com`, edited in cPanel → Zone Editor), which
also hosts the domain's email (`mail`/`webmail`/MX still point to 89.39.208.132) and the old WordPress site.
Only the two apex A records were changed to this server; `www` are CNAMEs. **Cancelling that hosting would take
DNS and email down** — move the zones elsewhere first.

Nginx serves the app only on `arizonyadak.ir`; `www.*`, `arizonyadak.com`, plain http and the bare IP redirect there.
Certificates come from acme.sh (`/root/.acme.sh`, webroot `/var/www/acme`, cron 4× a day, reloads Nginx):
`arizonyadak.ir_ecc` (all four names, 90 days) → `/etc/nginx/ssl/domain.*`, and a short-lived IP certificate
(`45.149.77.216_ecc`) → `/etc/nginx/ssl/arizon.*` so `https://45.149.77.216` can still redirect.

`arizon-domain-switch.sh` did the move on 2026-10-09: a one-minute systemd timer waited until the names pointed
here (asking the domain's own name servers), then issued the certificate, wrote the Nginx config, set `APP_URL`
and rebuilt (prerendered pages such as robots.txt embed `APP_URL`, so changing it always needs
`arizon-deploy --force`). The timer disabled itself afterwards; reuse the script if the domain ever changes.

## Rebuilding the server from scratch

1. `apt install nginx postgresql git ufw` and Node.js 24 (NodeSource); `ufw allow OpenSSH 80/tcp 443/tcp`.
2. `useradd --system --create-home --home-dir /srv/arizon arizon`; create the folders above (owner `arizon`).
3. PostgreSQL: role `arizon` with a password, `createdb -O arizon -E UTF8 --locale=C.UTF-8 -T template0 arizon`.
4. Write `shared/.env` (see `.env.example`; `OTP_PEPPER` must match the backup's source for staff codes to work).
5. Install the files from this folder, `systemctl daemon-reload && systemctl enable arizon`, issue the certificate.
6. `arizon-deploy`, then restore the latest backup:
   `cd /srv/arizon/current && sudo -u arizon npm run backup:restore -- <file.zip> --yes`.
