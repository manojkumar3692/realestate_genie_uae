import { supabaseAdmin } from "./supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "reports";

let bucketEnsured = false;

/**
 * Creates the storage bucket on first use if it doesn't already exist, so there's
 * no manual "create a bucket" step required in the Supabase dashboard. Kept private
 * (not publicly listable) — PDFs are only reachable via short-lived signed URLs.
 */
async function ensureBucket() {
  if (bucketEnsured) return;
  const { data: existing } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!existing) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: "25MB",
      allowedMimeTypes: ["application/pdf"],
    });
    // Ignore "already exists" races from concurrent cold starts; surface anything else.
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
  bucketEnsured = true;
}

export async function uploadPdf(objectPath: string, buffer: Buffer): Promise<void> {
  await ensureBucket();
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
}

/**
 * Returns a signed, time-limited download URL for a stored PDF. Generated fresh on
 * every request rather than cached, since signed URLs expire.
 */
export async function getSignedPdfUrl(objectPath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Failed to create signed URL");
  return data.signedUrl;
}
