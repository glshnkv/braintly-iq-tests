# Braintly — IQ test web service (MVP)

Mobile-first subscription funnel: **Landing → Quiz (25) → Age → Analyzing → Email → Paywall → Checkout (simulated) → Result**, plus a shareable certificate and an internal funnel dashboard. RU/EN.

## Stack

- **Next.js 16** (App Router, Cache Components, `proxy.ts`), React 19, TypeScript (strict)
- **Tailwind CSS 4**
- **Postgres + Drizzle ORM** (`postgres-js` driver; works with local Postgres and Neon)
- **Zod** for request validation, **Vitest** for unit tests

## Run locally

```bash
cp .env.example .env.local   # set DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD
npm install
npm run db:migrate
npm run dev                  # http://localhost:3000
```

Useful scripts: `npm run check` (types + lint + tests), `npm run build`, `npm run db:generate` (after schema changes).

Test cards in the simulated checkout: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined, `4000 0000 0000 9995` — insufficient funds. Any future expiry and CVC.

Funnel dashboard: `/ru/admin` (basic auth from `ADMIN_USER` / `ADMIN_PASSWORD`).

## Architecture

```
src/
  app/[lang]/…          pages: static shells, interactive parts are client components
  app/api/…             route handlers (thin: validate → call service → JSON)
  server/               server-only business logic
    funnel.ts           session, answers, scoring, lead, checkout, results
    stats.ts            observed question difficulty, archetype rarity, cohort percentile
    admin.ts            funnel dashboard queries
    validation.ts       zod schemas for every request
    http.ts             error mapping (domain errors → status codes)
  lib/quiz/             question bank, scoring, archetypes (bank + scoring are server-only)
  lib/client/           typed API client, funnel step guard
  config/product.ts     pricing, quiz and scoring knobs — no magic numbers in UI/logic
  i18n/                 typed RU/EN dictionaries (EN must match the RU shape)
  db/schema.ts          7 tables: users, sessions, answers, results, subscriptions, payments, events
```

Key decisions:

- **The answer key never reaches the browser.** `questions.ts` and `scoring.ts` import `server-only`, so the build fails if a client component pulls them in. The quiz page sends a localized copy without answers.
- **Before payment the API returns only teaser fields** (first digit of IQ, archetype rarity, strongest scale…). `/api/result` returns `403 not_paid` until a subscription exists — blurring is not just CSS.
- **Funnel state lives on the server.** Each page asks `/api/session` and is redirected to the step the user is allowed to be on; progress survives reloads.
- **Idempotent writes**: re-sent answers and double-clicked payments never create duplicates.
- **Honest data in the hooks**: praise screens, "only 34% solve this", rarity and cohort percentiles come from the database (expert priors until there is enough data).

## Deploy (Vercel + Neon)

1. Import the repo in Vercel with **Root Directory = `web`**; set `ADMIN_USER`, `ADMIN_PASSWORD` (and optionally `NEXT_PUBLIC_SITE_URL`).
2. Project → Storage → create a **Neon** database and connect it: this sets `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
3. Deploy. Vercel runs `npm run vercel-build`, which applies pending Drizzle migrations before `next build`.
