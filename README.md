# Real Estate Genie — AI Buyer Intelligence & Lead Reactivation Engine

**This is not a CRM.** You bring your historical leads (any CRM export, any column names). You bring today's
project. The system answers one question: *who from your old database is worth calling for this project, and why?*

## Requirements

- Node.js 20.9+ (tested on 22).
- A free [Supabase](https://supabase.com) project (Postgres database — this app's only datastore).
- Optional: an OpenAI API key, for the AI-assisted parts (see "Running without an AI key" below).

## Quick start

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Copy your credentials** from the Supabase dashboard into `.env.local` (copy `.env.example` as a starting point):
   - `Project Settings -> Database -> Connection string -> Transaction pooler` → `DATABASE_URL` (fill in your DB password).
   - `Project Settings -> API -> Project URL` → `SUPABASE_URL`.
   - `Project Settings -> API Keys` → the secret key → `SUPABASE_SERVICE_ROLE_KEY`.
   - Generate `AUTH_SECRET` with `openssl rand -base64 32` — this signs login session cookies.
   - Optionally set `OPENAI_API_KEY` (see below).
3. **Create the database schema.** Two ways:
   - From a machine with `DATABASE_URL` set: `npm run db:push`.
   - Without running anything locally: open Supabase's SQL Editor and run `drizzle/0000_left_joshua_kane.sql` directly.
4. **Install and run:**
   ```bash
   npm install
   npm run db:seed     # optional: seeds a demo agency with ~600 synthetic leads + 2 demo projects, run through the real pipeline
   npm run dev          # http://localhost:3000
   ```
   If you seed, log in with `demo@realestategenie.local` / `demo12345` (printed at the end of the seed script too).
   Otherwise, visit `/signup` to create your own agency account (you're the first admin).

For a production-style local run: `npm run build && npm run start`.

## Running without an AI key

Everything in this app works with zero AI configuration — the column mapping, the matching/scoring engine, and
duplicate detection are all deterministic TypeScript. Without `OPENAI_API_KEY` set:

- Column mapping still works via alias dictionaries + fuzzy string matching + value inspection (the AI pass is a
  *fallback* for genuinely ambiguous columns only).
- Match explanations fall back to templated bullet points generated from the deterministic score breakdown, instead
  of AI-written ones.
- Free-text note extraction (turning "can stretch to 1M if the payment plan is good" into a structured inferred
  budget) is skipped — customers just don't get an inferred-profile layer on top of their structured data.
- Project free-text paste-parsing and project "strengths/segments" fall back to a deterministic template built from
  the structured fields you filled in.

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`) in `.env.local` at any point and every
AI-assisted feature activates automatically — no code changes needed. The provider lives behind
`src/lib/ai/provider.ts`; swapping to a different vendor means implementing that one interface.

## How it's built

- **Next.js 16 (App Router) + TypeScript + Tailwind v4** — mobile-first UI (bottom tab bar on mobile, top nav on
  desktop), reusing the same design system/tokens as this project's earlier PDF-generator iteration.
- **Supabase Postgres via Drizzle ORM** (`src/db/schema.ts`) — 24 tables, multi-tenant (every table scoped by
  `orgId`, every query in `src/db/repo*.ts` filters on it).
- **Auth** — email/password, bcrypt-hashed, signed JWT session cookies (`src/lib/auth`), two roles (admin/user).
  No third-party auth provider dependency.
- **Architecture is mostly Server Components + Server Actions, not a REST API** — reads call `src/db/repo*.ts`
  functions directly from server components; writes are `"use server"` actions. The only truly async/interactive
  operations (file upload, AI parsing, outreach generation, outcome updates) are still server actions, just invoked
  from client components. There is intentionally no separate `/api` layer to keep two implementations in sync.
- **Import pipeline** (`src/lib/import/`, orchestrated in `src/db/repo.ts`):
  `parseSpreadsheet` (CSV via PapaParse, XLSX via SheetJS, header/sheet/duplicate/empty-column detection) →
  `detectColumns` (deterministic alias dictionary + fuzzy match + value inspection, AI fallback only for what's left
  ambiguous) → user reviews/edits the mapping → `normalizeRow` (phone/budget/location/source normalization) →
  `dedupe.ts` (exact phone/email = confirmed/auto-merged; fuzzy name+phone-tail = probable/possible, left for
  review) → writes the raw / normalized / inferred layers, which are never conflated (`schema.ts`'s data-model
  principle).
- **Matching engine** (`src/lib/matching/score.ts`, pure & fully unit-tested) — a deterministic 8-component weighted
  scorer (budget, location incl. a community-similarity graph, bedrooms, investor/end-user fit, payment plan,
  timeline with recency decay, historical behaviour, objection resolution) plus hard negative-signal discounting
  (do-not-contact, wrong construction status, budget far out of range, etc.), then an optional AI pass on only the
  top ~120 candidates per project to write natural-language explanations and apply small, bounded score nudges for
  nuance a filter can't see. This two-pass design is why running the matcher against 10,000+ leads doesn't require
  10,000+ AI calls.
- **AI layer** (`src/lib/ai/`) — one provider abstraction (`provider.ts`, OpenAI by default), five call sites:
  column classification, note→buyer-profile extraction (always with evidence + confidence, never overwriting raw or
  normalized data), project free-text parsing, match explanations, and outreach message generation.

## What's simplified for this build (and why)

- **Import processing runs inline, not on a queue.** For the row counts a single agency imports at once (hundreds to
  low thousands), this finishes in seconds to under a minute. For a genuinely 50k–100k row import in production,
  swap `runImportPipeline`'s call site for a background job (the function itself doesn't care who calls it) —
  building real queue infrastructure (BullMQ/Redis, etc.) felt like over-engineering for a first milestone, per the
  "don't over-engineer infrastructure" guidance.
- **No pgvector/embeddings.** Location similarity uses a small hand-maintained community-adjacency graph
  (`src/lib/normalize/location.ts`) rather than embeddings — it directly encodes the exact kind of relationship the
  spec's examples call for (JVC~Arjan, Sobha Hartland~Dubai Hills) and is instantly explainable, which a vector
  distance isn't. Worth revisiting if/when semantic project-to-project similarity needs to generalize beyond a
  maintained list.
- **Multi-sheet uploads use the largest sheet** rather than asking the user to pick one — most real exports are
  single-sheet; this can be turned into an explicit picker step if that turns out to matter.

## Data model

See `src/db/schema.ts`. Three layers are always kept separate and never overwrite each other: raw imported values
(`imported_rows`), deterministic normalized structure (`customer_preferences`), and AI-inferred buyer intelligence
(`customer_inferences`, every field backed by a confidence score and a verbatim source excerpt in `evidence_json`).

## Tests

`npm test` runs 80 unit tests (Vitest) covering phone normalization, budget parsing (including lakh/crore/ranges/
"can stretch to"), location aliasing + similarity, fuzzy name matching, the exact abbreviated-header column-mapping
example from the product spec, duplicate detection (confirmed vs. probable vs. possible), row normalization
end-to-end, and the matching engine's scoring, recency decay, objection-resolution, and negative-signal behavior.

## Project scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build & run |
| `npm test` | Run the unit test suite |
| `npm run db:push` | Create/update the schema in your Supabase Postgres database |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:seed` | Seed a demo agency (safe to re-run) |

## Deploying

Same shape as any Next.js 16 app on Vercel: push to a git remote, import into Vercel, set the environment variables
from `.env.local` in the Vercel project settings, and run the SQL migration against your Supabase project before the
first deploy (Vercel won't run it for you).
