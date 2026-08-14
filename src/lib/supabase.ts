import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Find the URL under Project " +
      "Settings -> API, and the key under Project Settings -> API Keys -> \"Publishable and " +
      "secret API keys\" (use the secret key, sb_secret_...; older projects may instead show " +
      "a service_role JWT under a \"Legacy API keys\" tab — either works). This key is secret " +
      "— only set it as a server-side environment variable (.env.local locally, Vercel " +
      "Environment Variables in production), never expose it to the browser."
  );
}

// Server-only client using the service role key, which bypasses Row Level Security.
// This file must never be imported from client components.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
