# Deploying to a Linux server (PM2 + Nginx + PostgreSQL)

> **Looking for a free option?** For light personal use, **[DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)** (Vercel +
> Neon) needs no server to manage and costs nothing at this scale. This doc is for self-hosting on your own
> Linux box instead — more control, but you're on the hook for patching, backups, and uptime.

## 0. Prerequisites on the server

- Node.js 20.19+ (or 22.13+ / 24+) — `node -v`
- PostgreSQL 14+
- Nginx
- PM2: `sudo npm install -g pm2`
- Git (or another way to copy the project files over)

## 1. Create the database

```bash
sudo -u postgres psql -c "CREATE USER expense_tracker WITH PASSWORD 'pick-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE expense_tracker OWNER expense_tracker;"
```

## 2. Get the code onto the server

```bash
git clone <your-repo-url> expense-tracker
cd expense-tracker
```

(Or `scp`/`rsync` the project folder over if you're not using git.)

## 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `DATABASE_URL` and `DIRECT_URL` — both the same value here, since there's no connection pooler in front of a
  self-hosted Postgres: `postgresql://expense_tracker:pick-a-strong-password@localhost:5432/expense_tracker?schema=public`
  (the two separate variables only matter for poolered setups like Neon — see DEPLOY_VERCEL.md)
- `AUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_EMAIL` / `AUTH_PASSWORD_HASH_BASE64` — only needed if you're **upgrading a database that predates
  multi-user support** (see "Upgrading from the single-user version" below). Leave them out on a brand-new
  deployment — real logins live in the database, created via the app's `/signup` page.

`.env` is never committed — keep it only on the server.

## 4. Install, migrate, build

```bash
npm ci                 # installs deps; postinstall runs `prisma generate`
npx prisma migrate deploy   # creates all tables, including users
npm run build
```

This is a multi-user app: sign up for the very first account at `/signup` once the app is running — it
automatically becomes an approved admin (there's no one else yet to approve it). Everyone who signs up after
that needs an existing admin to approve them from the "Users" page.

## 5. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints, once, so PM2 survives a reboot
```

Check it's alive: `pm2 status`, `pm2 logs expense-tracker`, or `curl http://127.0.0.1:3000/api/health`.

## 6. Point Nginx at it

```bash
sudo cp nginx/expense-tracker.conf /etc/nginx/sites-available/expense-tracker
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
```

Edit `/etc/nginx/sites-available/expense-tracker` and replace `your-domain.com` with your real domain, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Add HTTPS (recommended — this app handles real financial data)

```bash
sudo apt install certbot python3-certbot-nginx   # Debian/Ubuntu
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot rewrites the Nginx config to serve HTTPS and redirect HTTP → HTTPS, and sets up auto-renewal.

> **Login won't work until HTTPS is live.** The session cookie is marked `Secure`, so browsers refuse to store it over plain HTTP (except on `localhost`). Before step 7 finishes, you can still confirm the app process itself is healthy with `curl http://127.0.0.1:3000/api/health` — just don't expect login to persist over `http://your-domain.com` until certbot has run.

## 8. Lock down direct access to port 3000

Only Nginx should be reachable from outside; the app itself should only listen on `127.0.0.1:3000` (already the default — `next start` binds to all interfaces by default, so also enable a firewall):

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH   # keep SSH reachable before enabling ufw, or you'll lock yourself out
sudo ufw enable
```

If you'd rather not rely on the firewall alone, change `ecosystem.config.js`'s start args to `"start -p 3000 -H 127.0.0.1"` so Next only binds to localhost.

## Updating after a code change

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart expense-tracker
```

## Upgrading from the single-user version

If this server was already running the old single-login version (accounts/transactions/EMIs with no owner
yet), migrating needs one extra pass so existing data ends up assigned to a real user instead of vanishing.
Full details: **[MIGRATING_TO_MULTI_USER.md](MIGRATING_TO_MULTI_USER.md)**. Short version:

```bash
git pull && npm ci
# Add DIRECT_URL (same value as DATABASE_URL) if it's not already set, plus
# ADMIN_EMAIL + reuse your existing AUTH_PASSWORD_HASH_BASE64, in .env
npx prisma migrate deploy   # applies the "add users, nullable owner" migration;
                            # the next one (NOT NULL) fails here — that's expected, see below
npm run db:seed             # creates that admin user and backfills all existing rows to them
npx prisma migrate deploy   # re-run: the NOT NULL migration now succeeds
npm run build
pm2 restart expense-tracker
```

## Notes on this app's design

- **Multi-user, fully isolated** — every account/transaction/EMI belongs to exactly one user; nobody can see
  or touch another user's data. New signups need an existing admin's approval (see the in-app "Users" page)
  before they can log in.
- **Account balances are derived, not stored** — every account's current balance/outstanding is computed as `opening balance + net effect of every transaction referencing it`. Editing or deleting a transaction just changes the transaction row; the balance is always recomputed, so it can't drift.
- **Migrations** — `prisma/migrations/` is checked in, so `prisma migrate deploy` on the server just applies the same SQL that was generated during development. Don't run `prisma migrate dev` in production — it's meant for local schema iteration.
