# Production server (ParsPack cloud, Tehran)

Ubuntu 24.04, 2 vCPU / 4 GB RAM (+2 GB swap) / 60 GB, IP `45.149.77.216`. Everything runs on the one
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

## TLS

No domain yet, so the certificate is a Let's Encrypt **IP certificate** (`shortlived` profile, ~6.5 days)
issued by acme.sh (`/root/.acme.sh`, webroot `/var/www/acme`, cron 4× a day, reloads Nginx).
`APP_URL` must be https in production, which is why this is needed even before a domain.
When a domain is bought: point its A record to the IP, issue a normal cert for it
(`acme.sh --issue -d example.ir -d www.example.ir --webroot /var/www/acme --server letsencrypt`,
then `--install-cert` to the same `/etc/nginx/ssl/arizon.*` paths), set `server_name`, change `APP_URL`
in `shared/.env` and `systemctl restart arizon`.

## Rebuilding the server from scratch

1. `apt install nginx postgresql git ufw` and Node.js 24 (NodeSource); `ufw allow OpenSSH 80/tcp 443/tcp`.
2. `useradd --system --create-home --home-dir /srv/arizon arizon`; create the folders above (owner `arizon`).
3. PostgreSQL: role `arizon` with a password, `createdb -O arizon -E UTF8 --locale=C.UTF-8 -T template0 arizon`.
4. Write `shared/.env` (see `.env.example`; `OTP_PEPPER` must match the backup's source for staff codes to work).
5. Install the files from this folder, `systemctl daemon-reload && systemctl enable arizon`, issue the certificate.
6. `arizon-deploy`, then restore the latest backup:
   `cd /srv/arizon/current && sudo -u arizon npm run backup:restore -- <file.zip> --yes`.
