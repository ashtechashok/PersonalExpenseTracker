# Expense Tracker

A personal expense/income tracker with account balance tracking, built with Next.js (App Router), PostgreSQL, and Prisma.

Free and open-source (MIT — see [LICENSE](./LICENSE)) — deploy your own copy, modify it, whatever you like. If it's
useful to you, this project is pay-what-you-want: scan the QR below or send whatever you think it's worth via UPI to
`ashoksmavd@ptyes`. Entirely optional, no obligation either way.

<img src="./paytmqr.jpg" alt="UPI QR code — ashoksmavd@ptyes" width="220" />

## Features

- Log expenses and income, with your own custom categories, payment mediums, and per-transaction source/destination
  accounts (all editable in Settings — see below).
- Bank accounts, credit cards, prepaid cards, cash, and digital wallets, each with a live-computed balance (or
  outstanding + available credit for cards). Add-on/supplementary cards can share a parent card's credit limit.
- Transfers between your own accounts (e.g. an expense that also credits a savings account) update both sides
  correctly.
- Recurring transactions — bills or income you expect every month/quarter/year, with due-date reminders and a
  one-click "mark paid" that logs a real, dated transaction (never a fixed guess at when it actually happened).
- EMI / installment tracking, including installments you're fronting for someone else ("yet to receive") and
  one-time loans.
- Every account has a role (e.g. "Emergency Fund", "Salary Account") that's entirely up to you to define — the
  Dashboard automatically shows a running total for each one you're using, not just a fixed set.
- **Fully per-user customization, no shared/global lists**: your own currency, date/number format, and timezone;
  your own expense/income categories; your own payment mediums (each with its own allowed account types and an
  optional default account); your own account roles. All editable from the in-app Settings page. New signups get
  a sensible starting set of each, which they're free to rename, add to, or delete.
- Per-user light/dark theme and Dashboard card visibility, both saved to your account — consistent across every
  device and browser you log in from, not just the one you set it on.
- Mobile-friendly responsive UI with a collapsible nav menu.
- Multi-user: every user's accounts/transactions/EMIs are private to them. Sign up at `/signup`; the first
  signup on a fresh install becomes an approved admin automatically, everyone after that needs an admin's
  approval (from the in-app "Users" page).

## Local development

Requires Node.js 20.19+ (or 22.13+/24+) and a PostgreSQL database.

```bash
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm install
npx prisma migrate deploy
npm run dev
```

Then sign up at `/signup` — that first account becomes an approved admin automatically.

Open [http://localhost:3000](http://localhost:3000).

## Deploying

- **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)** — Vercel + Neon, free for personal/light use, no server to manage. Recommended.
- **[DEPLOY.md](./DEPLOY.md)** — self-hosting on your own Linux server with PM2 and Nginx.

## Project structure

- `src/app/(app)/transactions` — the main transactions page, form, and table
- `src/app/(app)/accounts` — accounts/cards management
- `src/app/(app)/recurring` — recurring bills/income templates and their period-by-period history
- `src/app/(app)/emi` — EMI/installment tracking
- `src/app/(app)/dashboard` — summary cards (spend/income/balances, one per account role in use)
- `src/app/(app)/settings` — per-user Locale, Categories, Mediums, Account Roles, and Appearance
- `src/app/login`, `src/app/signup`, `src/app/pending` — login/signup pages and the awaiting-approval screen
- `src/app/(app)/users` — admin-only page to approve/decline signups and manage admins
- `src/lib/auth.ts`, `src/lib/session.ts` — password hashing, session cookie/JWT logic, per-request session lookup
- `src/lib/balances.ts` — the account balance math (derived from transactions, never stored/mutated directly)
- `src/lib/recurring.ts`, `src/lib/timezone.ts` — recurring-period math and per-user "today", both timezone-aware
- `src/lib/format.ts`, `src/lib/mediums.ts` — per-user currency/date formatting and medium allowed-account-type helpers
- `src/proxy.ts` — route protection (Next.js 16's replacement for `middleware.ts`)
- `prisma/schema.prisma` — database schema
