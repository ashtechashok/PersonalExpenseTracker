# Migrating an existing single-user database to multi-user

The app used to have one shared login (`AUTH_USERNAME` / `AUTH_PASSWORD_HASH_BASE64` in `.env`) and every
account/transaction/EMI belonged to "whoever was logged in" implicitly. It's now multi-user: every row has a
real `userId`, and logins live in a `users` table instead of `.env`.

If you're setting up a **brand-new** deployment, none of this applies — just run `prisma migrate deploy` and
sign up at `/signup`. This doc is only for a database that already has accounts/transactions/EMIs from the old
version.

## Why this needs two migrations

Making `userId` required in one step would fail immediately — the database still has old rows with no owner,
and `ALTER COLUMN ... SET NOT NULL` refuses to run over existing `NULL`s. So the upgrade is two migrations with
a backfill script in between (the "expand → migrate data → contract" pattern):

1. **`20260831000000_add_users_nullable_owner`** — creates the `users` table and adds `userId` to
   accounts/transactions/emis, but nullable, so it applies cleanly no matter what's already in those tables.
2. **`npm run db:seed`** — creates one admin user from your existing credentials and assigns every orphaned row
   (`userId IS NULL`) to them.
3. **`20260831000001_require_account_owner`** — tightens `userId` to `NOT NULL` now that nothing is null
   anymore.

## Steps

```bash
git pull
npm ci
```

Add to `.env` (keep everything else you already had):

```
ADMIN_EMAIL="you@example.com"
```

Leave `AUTH_PASSWORD_HASH_BASE64` exactly as it already was in your `.env` — the seed script reuses that
existing hash, so your current password keeps working. `AUTH_USERNAME` is no longer used and can be removed.

```bash
npx prisma migrate deploy
```

This applies migration 1 (nullable owner) successfully, then attempts migration 2 (`NOT NULL`) and **fails —
that's expected**, because the backfill hasn't run yet. Nothing is broken; each migration is transactional, so
migration 1's changes stick and migration 2 simply hasn't been applied yet.

```bash
npm run db:seed
```

This creates your admin user and assigns every existing account/transaction/EMI to them. It prints how many
rows it moved — sanity-check that number against what you expect.

```bash
npx prisma migrate deploy
```

Run it again: migration 2 now succeeds, since every row has an owner.

```bash
npm run build
pm2 restart expense-tracker
```

Log in with your existing password at the email you set in `ADMIN_EMAIL` — all your existing data should be
exactly where you left it, just owned by that account now. From there, use the "Users" page to approve anyone
else who signs up.

## If something goes wrong

`npm run db:seed` is safe to re-run — it no-ops once a user already exists (`Skipping seed — N user(s) already
exist.`) or once there's no orphaned data left (`No pre-existing single-user data to migrate`). If migration 2
keeps failing, query `SELECT COUNT(*) FROM accounts WHERE "userId" IS NULL` (and the same for `transactions`,
`emis`) to see what's still unassigned before retrying.
