import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

// `drizzle-kit push`/`studio` fire off many introspection queries concurrently. Supabase's
// "Transaction" pooler (port 6543, what DATABASE_URL points at for the app's own runtime — the
// right choice for a serverless Next.js/Vercel deployment) doesn't preserve per-connection
// prepared-statement/session state across those concurrent queries, and can hand results from
// one query back as the answer to a different one. In practice this showed up as drizzle-kit
// reporting a foreign-key constraint under the wrong table name (always off by one table) and
// then crashing when it tried to parse that mismatched row as a CHECK constraint.
//
// Fix: give migration tooling a separate, unpooled connection string. Add DIRECT_URL to
// .env.local — from Supabase: Project Settings -> Database -> Connection string -> "Session
// pooler" (port 5432) or "Direct connection". Falls back to DATABASE_URL if DIRECT_URL isn't
// set, so this stays a no-op until that env var exists.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  // Supabase manages several internal schemas (auth, storage, realtime, extensions, vault, ...)
  // alongside our own tables. Without this filter, `drizzle-kit push` introspects the whole
  // database. We only ever define tables in `public`, so scope introspection there.
  schemaFilter: ["public"],
  // This Supabase project's `public` schema is shared with an unrelated app (its tables predate
  // this one and are not part of Real Estate Genie). `tablesFilter` entries prefixed with "!"
  // are excludes — without these, `drizzle-kit push` sees these tables as "not in schema.ts" and
  // proposes dropping them, which is real data loss on someone else's tables. Never remove a
  // table from this list unless you've confirmed it's safe to let drizzle-kit manage/delete it.
  tablesFilter: [
    "!firm_settings",
    "!old_pdfgenie_projects",
    "!comparable_projects",
    "!financial_assumptions",
    "!generated_reports",
    "!payment_milestones",
    "!unit_types",
    "!project_directory",
  ],
} satisfies Config;
