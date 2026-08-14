import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Create a Supabase project, copy its connection string " +
      "(Project Settings -> Database -> Connection string -> Transaction pooler), and set it " +
      "as DATABASE_URL in your .env.local file (for local dev) and in your Vercel project's " +
      "Environment Variables (for production)."
  );
}

// Reuse a single connection across hot-reloads in dev and across warm serverless invocations.
const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    // Supabase's connection pooler (pgbouncer, transaction mode) does not support
    // prepared statements, so this must stay off regardless of which connection
    // string (pooled or direct) is used.
    prepare: false,
    // Keep the pool small — each serverless invocation gets its own process, so a
    // large pool per-instance just wastes connections against Supabase's limit.
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { client as sql };
