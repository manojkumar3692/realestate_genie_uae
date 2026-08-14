# Real Estate Genie

A premium, mobile-first dashboard for UAE real estate agents and brokerage firms.
Enter a project's details once, answer a few guided questions, and generate a polished,
branded investment PDF that walks your client through the scope, unit pricing, payment
plan, yearly ROI projection, bank loan breakdown, nearby market growth, and exit/liquidity
plan — then share it straight to their phone or inbox.

This is the **core product loop** (no login/auth yet, by design — see "What's next" below).

## Requirements

- Node.js 18 or newer (tested on 20 and 22).

## Quick start

```bash
npm install
npm run db:push     # creates the local SQLite database at data/app.db
npm run db:seed     # optional: adds a polished demo project ("Marina Horizon Residences")
npm run dev          # http://localhost:3000
```

First-time PDF generation launches a headless Chromium via Playwright. If it fails with a
"browser not found" error, run:

```bash
npx playwright install chromium
```

### Troubleshooting: dev server exits as soon as you load the page

This means a native module (most likely `better-sqlite3`) was built against a different
Node.js version than the one currently running — `npm install` prints an `EBADENGINE`
warning when this happens, and it's not safe to ignore. Fix it with:

```bash
rm -rf node_modules package-lock.json
npm install
```

If you switch Node versions later (e.g. via `nvm`), re-run the two commands above.

For a production-style run:

```bash
npm run build
npm run start
```

## How it's built

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4** — mobile-first responsive UI,
  bottom tab bar on mobile, sidebar step navigation on desktop.
- **SQLite via Drizzle ORM** (`src/db`) — a real relational database with zero setup. It's a
  drop-in choice: swapping to Postgres later is a one-line change to `drizzle.config.ts` and
  `src/db/client.ts`, no schema/query rewrites needed.
- **Financial calculation engine** (`src/lib/calculations.ts`) — pure, dependency-free
  TypeScript functions for yearly appreciation + rental cashflow projections, UAE mortgage
  amortization, payment plan scheduling, exit/liquidity modeling, and comparable-project CAGR.
  Fully unit-testable in isolation from the UI or PDF layer.
- **PDF generation** (`src/lib/pdf-template.ts` + `src/lib/pdf-generate.ts`) — the report is
  built as a self-contained HTML document (hand-rolled inline SVG charts, no client-side JS
  chart library needed) and rendered to PDF with headless Chromium via Playwright. This keeps
  PDF output pixel-perfect and fast, independent of the running Next.js server.
- **Sharing** — WhatsApp (`wa.me` deep link) and Email (`mailto:`) both prefill a message with
  the client's name and a link to the generated PDF, plus a direct download button.

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

- **No authentication yet.** This is intentionally a single-user local app for now — the plan
  discussed was "core logic first, auth/profiles later." Firm settings are a single row,
  not per-agent.
- **Share links are local.** The WhatsApp/Email share buttons link to this app's own server
  (`/api/reports/[id]/download`). That link only works while this app is running and reachable
  by your client — fine for testing on one machine, not yet for sending to a client's phone
  over the internet. Two ways to fix this when you're ready:
  1. Deploy the app somewhere with a public URL (Vercel, a VPS, etc.) — no code changes needed.
  2. In the meantime, use the "Download PDF" button and attach the actual file in WhatsApp/Email
     instead of sharing the link.
- **Comparable project growth is manually entered**, not pulled from a live market data feed
  (DXB Interact / Property Finder / Reidin all require a paid data license) — you enter 2-4
  nearby projects' historical price/sq.ft once per project.
- **Loan figures are indicative**, not a real bank integration — clearly labeled as such in
  the PDF.

## What's next (suggested roadmap)

1. **Auth + multi-agent support** — per-agent login, firm settings become per-user, project
   ownership.
2. **Deploy for a real shareable link** — so WhatsApp/Email share actually reaches clients
   anywhere.
3. **Real email sending** (currently `mailto:` opens the agent's own email client) — wire up
   `nodemailer` (already installed) with an SMTP provider so the agent can send directly from
   the app, and log delivery status.
4. **Project templates / duplication** — clone an existing project as a starting point for a
   similar one.
5. **Live market data connector** — once a data license is available, auto-populate comparable
   project growth instead of manual entry.
6. **PDF polish** — property location map, floor plans, unit-level image gallery.

## Project scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build & run |
| `npm run db:push` | Create/update the SQLite schema |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:seed` | Add a polished demo project (safe to re-run) |
