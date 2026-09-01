# Deploying to Vercel + Neon (free)

This is the recommended way to run this app for personal/small-scale use — a couple of users, light daily
usage. Both Vercel's Hobby tier and Neon's free tier cover that with room to spare, no credit card needed for
either, and there's no server to patch or restart.

If you'd rather self-host on your own Linux box instead, see [DEPLOY.md](DEPLOY.md).

## 1. Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project (any region close to you).
2. On the project dashboard, grab **two** connection strings from the "Connection string" panel:
   - The **pooled** one — hostname contains `-pooler` — this is your `DATABASE_URL`.
   - The **direct** one — same hostname without `-pooler` — this is your `DIRECT_URL`.
     (Neon shows a toggle/dropdown for "Pooled connection" vs "Direct connection" — grab both.)

Both look like `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` — keep them somewhere safe, you'll
paste them into Vercel in step 3.

## 2. Apply the schema to Neon

From your machine, with the two connection strings above:

```bash
DATABASE_URL="<pooled-connection-string>" DIRECT_URL="<direct-connection-string>" npx prisma migrate deploy
```

This creates all the tables (including `users`) on Neon. Re-run this same command any time you pull a new
migration later — it only applies what hasn't run yet.

> **Upgrading from an existing single-user database?** See [MIGRATING_TO_MULTI_USER.md](MIGRATING_TO_MULTI_USER.md)
> first — it needs an extra backfill step before this one.

## 3. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket (Vercel deploys from a git repo).
2. Go to [vercel.com/new](https://vercel.com/new), sign up free, and import the repo. Vercel auto-detects
   Next.js — no build config needed.
3. Before the first deploy, add these **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled connection string from step 1 |
   | `DIRECT_URL` | the direct connection string from step 1 |
   | `AUTH_SECRET` | generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

   Set all three for the **Production** environment (and Preview too, if you want preview deployments to work —
   they'll share the same database unless you create a second Neon project for that).

4. Deploy. Vercel runs `npm install` (which triggers `prisma generate` via `postinstall`) and `next build`
   automatically.

## 4. First login

Visit your new `*.vercel.app` URL and sign up at `/signup` — the very first account on a fresh database
becomes an approved admin automatically. Approve anyone else who signs up after that from the "Users" page.

## Updating after a code change

```bash
git push                     # Vercel redeploys automatically on push
```

If the change includes a new Prisma migration, apply it once against Neon **before or right after** pushing
(order doesn't matter much for an additive migration, but do it promptly so the deployed code and schema stay
in sync):

```bash
DATABASE_URL="<pooled-connection-string>" DIRECT_URL="<direct-connection-string>" npx prisma migrate deploy
```

## Notes

- **Cold starts**: Vercel's free functions and Neon's free compute both spin down when idle and wake on the
  next request — expect the first request after a quiet stretch to take a second or two longer. Irrelevant at
  your usage level, just don't be surprised by it.
- **Staying within the free tier**: Neon's free plan is 0.5 GB storage / 100 compute-hours per month,
  auto-suspending after 5 minutes idle. At ~30 min/day of actual use that's roughly 15 hours/month — well under
  the cap. Vercel's Hobby caps (1M function invocations, 100 GB bandwidth/month) aren't realistically
  reachable at this scale either.
- **One Neon project per environment you care about isolating** — Production and Preview deployments share
  whatever `DATABASE_URL` you set for each Vercel environment. For a single personal deployment, pointing both
  at the same Neon database is simplest and fine.
