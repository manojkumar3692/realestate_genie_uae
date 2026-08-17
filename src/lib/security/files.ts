/** Upload validation for lead import files. Keep this strict — customer data is sensitive. */

export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024; // 25MB — plenty for 100k rows of text data

const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // some browsers send this for .csv/.xlsx — validated further by extension
]);

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateImportFile(fileName: string, mimeType: string, sizeBytes: number): FileValidationResult {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: "Only .csv and .xlsx files are supported." };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType) && mimeType !== "") {
    return { valid: false, reason: `Unrecognized file type (${mimeType}). Please upload a .csv or .xlsx export.` };
  }
  if (sizeBytes <= 0) {
    return { valid: false, reason: "The file appears to be empty." };
  }
  if (sizeBytes > MAX_IMPORT_FILE_BYTES) {
    return {
      valid: false,
      reason: `File is too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). The limit is ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB.`,
    };
  }
  return { valid: true };
}
