import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Next.js convention is `.env.local` (not the plain `.env` that `dotenv/config`
// loads by default), so load that explicitly for drizzle-kit's CLI commands too.
loadEnv({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
