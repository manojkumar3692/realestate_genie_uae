# Real Estate Genie

A premium, mobile-first dashboard for UAE real estate agents and brokerage firms.
Enter a project's details once, answer a few guided questions, and generate a polished,
branded investment PDF that walks your client through the scope, unit pricing, payment
plan, yearly ROI projection, bank loan breakdown, nearby market growth, and exit/liquidity
plan — then share it straight to their phone or inbox.

This is the **core product loop** (no login/auth yet, by design — see "What's next" below).

## Requirements

- Node.js 20.9+ (tested on 22). Node 18 is no longer supported by this app's tooling.
- A free [Supabase](https://supabase.com) project (Postgres database + file storage — both
  used by this app).

## Quick start

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Copy your credentials** from the Supabase dashboard:
   - `Project Settings -> Database -> Connection string -> Transaction pooler` → this is your
     `DATABASE_URL` (make sure to fill in your database password in the string).
   - `Project Settings -> API -> Project URL` → this is your `SUPABASE_URL`. Safe to share
     publicly — it's just a hostname.
   - `Project Settings -> API Keys -> "Publishable and secret API keys"` tab → reveal the
     **secret key** (starts with `sb_secret_...`) → this is your `SUPABASE_SERVICE_ROLE_KEY`.
     (Older projects may instead show a "Legacy API keys" tab with a `service_role` JWT —
     either format works, the app just needs whichever one your project has.)
     **Keep this secret** — it bypasses all database/storage security rules. Never commit it
     or paste it into a chat session.
3. **Set these as environment variables** — either in a local `.env.local` file (copy
   `.env.example` as a starting point) if you're running the app on your own machine, or
   directly in your deploy platform's dashboard (e.g. Vercel → Settings → Environment
   Variables) if you're not running it locally at all:

   ```bash
   DATABASE_URL=postgres://postgres.xxxxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   SUPABASE_STORAGE_BUCKET=reports   # optional, defaults to "reports"
   ```

4. **Create the database schema.** Two ways to do this, pick whichever fits how you're working:
   - **From a machine with `DATABASE_URL` set** (local dev, or anywhere with the repo and env
     vars): `npm run db:push`.
   - **Without running anything locally**: open your Supabase project's SQL Editor and run the
     contents of `drizzle/0000_init.sql` directly — it creates the same 7 tables (already
     verified against a live Postgres instance) without needing your connection string
     anywhere outside Supabase's own dashboard.

5. **Install and run:**

   ```bash
   npm install
   npm run db:seed     # optional: adds a polished demo project ("Marina Horizon Residences")
   npm run dev          # http://localhost:3000
   ```

The Storage bucket for PDFs (private, named by `SUPABASE_STORAGE_BUCKET`) is created
automatically on first PDF generation — no manual bucket setup needed.

First-time PDF generation launches a headless Chromium that the full `puppeteer` package
downloads automatically at `npm install` time. If that download was blocked (offline/locked-down
network) and PDF generation fails with a "Could not find Chrome" error, either let it retry with
network access, or point at an existing Chromium/Chrome install on your machine:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome npm run dev
```

### Troubleshooting: dev server exits as soon as you load the page

This means a native module was built against a different Node.js version than the one
currently running — `npm install` prints an `EBADENGINE` warning when this happens, and it's
not safe to ignore. Fix it with:

```bash
rm -rf node_modules package-lock.json
npm install
```

If you switch Node versions later (e.g. via `nvm`), re-run the two commands above.

For a production-style local run:

```bash
npm run build
npm run start
```

## Deploying to Vercel

This app is built to run on Vercel's serverless platform out of the box — the database lives
in Supabase Postgres and generated PDFs live in Supabase Storage, so there's no local disk or
long-running process for Vercel's read-only, ephemeral filesystem to trip over.

1. Push this repo to GitHub/GitLab/Bitbucket and import it into Vercel.
2. **Create the database schema** if you haven't already — run the contents of
   `drizzle/0000_init.sql` in your Supabase project's SQL Editor (see step 4 of "Quick start"
   above). Vercel deploys don't run this automatically.
3. In the Vercel project's **Settings -> Environment Variables**, set:
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — same values as your
     `.env.local` above.
   - `SUPABASE_STORAGE_BUCKET` — optional, same as local.
   - `CHROMIUM_PACK_URL` — **required for PDF generation to work on Vercel.** Vercel's
     serverless functions don't include a Chromium binary, so this app uses
     [`@sparticuz/chromium-min`](https://github.com/Sparticuz/chromium) to fetch a
     Lambda-compatible Chromium build at cold start. Set this to a direct URL to that build's
     `.tar` pack file matching the installed `@sparticuz/chromium-min` version (currently
     `149.0.0`, see `package.json`) — for example:
     ```
     https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar
     ```
     GitHub's release CDN works directly (and is cached to `/tmp` after the first cold start
     per instance), but for lower latency you can instead download that same file once and
     re-host it on Vercel Blob, S3, or similar storage closer to your deployment region. If you
     later bump the `@sparticuz/chromium-min` package version, update this URL to match — a
     version mismatch between the npm package and the downloaded pack will cause PDF
     generation to fail.
4. Deploy. On the first PDF generation request per cold-started function instance, expect a
   few extra seconds while Chromium downloads and unpacks to `/tmp`; subsequent requests to the
   same warm instance are fast.

Redeploying after changing environment variables requires a new deployment (Vercel doesn't
hot-reload env vars into already-running functions) — trigger one from the Vercel dashboard or
by pushing a new commit.

## How it's built

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4** — mobile-first responsive UI,
  bottom tab bar on mobile, sidebar step navigation on desktop.
- **Supabase Postgres via Drizzle ORM** (`src/db`) — a real relational database, reached over
  the pgbouncer transaction pooler so it works from serverless functions.
- **Supabase Storage** (`src/lib/pdf-storage.ts`) — generated PDFs are uploaded to a private
  bucket and served via short-lived signed URLs, generated fresh on every download request.
- **Financial calculation engine** (`src/lib/calculations.ts`) — pure, dependency-free
  TypeScript functions for yearly appreciation + rental cashflow projections, UAE mortgage
  amortization, payment plan scheduling, exit/liquidity modeling, and comparable-project CAGR.
  Fully unit-testable in isolation from the UI or PDF layer.
- **PDF generation** (`src/lib/pdf-template.ts` + `src/lib/pdf-generate.ts`) — the report is
  built as a self-contained HTML document (hand-rolled inline SVG charts, no client-side JS
  chart library needed) and rendered to PDF with headless Chromium via Puppeteer — the full
  `puppeteer` package locally, `puppeteer-core` + `@sparticuz/chromium-min` on Vercel.
- **Sharing** — WhatsApp (`wa.me` deep link) and Email (`mailto:`) both prefill a message with
  the client's name and a link to the generated PDF, plus a direct download button. The link
  points at this app's own `/api/reports/[id]/download` route, which redirects to a fresh
  Supabase signed URL each time it's opened — so it stays valid indefinitely as long as the app
  is deployed, without exposing a permanent public URL to the PDF itself.

## What's in the app right now

- **Dashboard** (`/`) — every project you've created, with quick stats and PDF count.
- **Project workspace** (`/projects/[id]`) — a 6-step guided wizard: Basics, Unit Types,
  Payment Plan, Comparable Projects, Financial Assumptions, and Review & Generate. Every
  number the PDF will use is editable at any step, so you can tweak assumptions per client
  before generating.
- **Firm settings** (`/settings`) — your logo, contact details, brand colors and PDF
  disclaimer text, applied to every report.
- Every generated PDF is saved and listed under its project, so you can re-download or
  re-share it later without regenerating.

## Data model

See `src/db/schema.ts`. One project has many unit types, payment milestones, and comparable
projects, plus one set of financial assumptions. Every "Generate PDF" also stores an
immutable JSON snapshot of the data used (`generated_reports.snapshot_json`), so past PDFs
stay accurate even if you later edit the project.

## Known limitations (by design, for this first milestone)

- **No authentication yet.** This is intentionally a single-user app for now — the plan
  discussed was "core logic first, auth/profiles later." Firm settings are a single row,
  not per-agent, and anyone with your deployed URL can use the app.
- **Comparable project growth is manually entered**, not pulled from a live market data feed
  (DXB Interact / Property Finder / Reidin all require a paid data license) — you enter 2-4
  nearby projects' historical price/sq.ft once per project.
- **Loan figures are indicative**, not a real bank integration — clearly labeled as such in
  the PDF.

## What's next (suggested roadmap)

1. **Auth + multi-agent support** — per-agent login, firm settings become per-user, project
   ownership, and access control on the deployed URL.
2. **Real email sending** (currently `mailto:` opens the agent's own email client) — wire up
   `nodemailer` (already installed) with an SMTP provider so the agent can send directly from
   the app, and log delivery status.
3. **Project templates / duplication** — clone an existing project as a starting point for a
   similar one.
4. **Live market data connector** — once a data license is available, auto-populate comparable
   project growth instead of manual entry.
5. **PDF polish** — property location map, floor plans, unit-level image gallery.

## Project scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build & run |
| `npm run db:push` | Create/update the schema in your Supabase Postgres database |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:seed` | Add a polished demo project (safe to re-run) |
