/**
 * Formula-injection guard. Raw imported values are stored and displayed
 * as-is (never mutated — see the data-model principle in schema.ts), but any
 * time we generate a downloadable CSV/XLSX from this app's own data (e.g. a
 * future "export matches" feature), values must be sanitized here first —
 * a cell value starting with =, +, -, or @ can execute as a formula when the
 * file is opened in Excel/Sheets.
 */
export function sanitizeForSpreadsheetExport(value: string): string {
  if (!value) return value;
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}
