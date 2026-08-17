import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedSheet {
  name: string;
  headerRowIndex: number;
  headers: string[];
  /** Original header text before duplicate-suffixing, aligned to `headers`. */
  originalHeaders: string[];
  rows: Record<string, string>[];
  rowCount: number;
  emptyColumns: string[];
  duplicateColumns: string[];
  columnSamples: Record<string, string[]>;
}

export interface ParsedSpreadsheet {
  fileType: "csv" | "xlsx";
  sheets: ParsedSheet[];
  warnings: string[];
}

const MAX_SAMPLE_VALUES = 12;
const HEADER_SCAN_WINDOW = 5;

export class SpreadsheetParseError extends Error {}

export function parseSpreadsheet(buffer: Buffer, fileName: string, mimeType: string): ParsedSpreadsheet {
  const isXlsx =
    /\.xlsx$/i.test(fileName) ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("ms-excel");

  if (isXlsx) return parseXlsx(buffer);
  return parseCsv(buffer);
}

function parseCsv(buffer: Buffer): ParsedSpreadsheet {
  const text = buffer.toString("utf-8");
  if (!text.trim()) throw new SpreadsheetParseError("The file is empty.");

  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  const matrix = (result.data as string[][]).filter((row) => row.length > 0);
  if (matrix.length === 0) throw new SpreadsheetParseError("No rows found in the file.");

  const warnings: string[] = [];
  if (result.errors?.length) {
    warnings.push(`${result.errors.length} row(s) had formatting issues and were parsed on a best-effort basis.`);
  }

  const sheet = buildSheetFromMatrix("Sheet1", matrix, warnings);
  return { fileType: "csv", sheets: [sheet], warnings };
}

function parseXlsx(buffer: Buffer): ParsedSpreadsheet {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/password|encrypted/i.test(message)) {
      throw new SpreadsheetParseError(
        "This Excel file is password-protected. Please remove the password and re-upload."
      );
    }
    throw new SpreadsheetParseError(`Could not read this Excel file: ${message}`);
  }

  if (!workbook.SheetNames.length) {
    throw new SpreadsheetParseError("This Excel file has no sheets.");
  }

  const warnings: string[] = [];
  const sheets: ParsedSheet[] = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown as string[][];
    if (matrix.length === 0) {
      warnings.push(`Sheet "${sheetName}" is empty and was skipped.`);
      continue;
    }
    sheets.push(buildSheetFromMatrix(sheetName, matrix, warnings));
  }

  if (sheets.length === 0) {
    throw new SpreadsheetParseError("No usable sheets with data were found in this workbook.");
  }

  return { fileType: "xlsx", sheets, warnings };
}

function buildSheetFromMatrix(name: string, matrix: string[][], warnings: string[]): ParsedSheet {
  const headerRowIndex = detectHeaderRow(matrix);
  const rawHeaderRow = matrix[headerRowIndex].map((c) => (c ?? "").toString().trim());
  const originalHeaders = [...rawHeaderRow];

  // De-duplicate repeated header names ("Phone", "Phone" -> "Phone", "Phone (2)").
  const seen = new Map<string, number>();
  const headers = rawHeaderRow.map((h, i) => {
    const base = h || `Column ${i + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const duplicateColumns = headers.filter((h, i) => headers.indexOf(h) !== i || rawHeaderRow.indexOf(rawHeaderRow[i]) !== i);

  const dataRows = matrix.slice(headerRowIndex + 1);
  const rows: Record<string, string>[] = dataRows
    .filter((r) => r.some((cell) => (cell ?? "").toString().trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? "").toString().trim();
      });
      return obj;
    });

  const columnSamples: Record<string, string[]> = {};
  const emptyColumns: string[] = [];
  for (const h of headers) {
    const values = rows.map((r) => r[h]).filter((v) => v && v.trim());
    if (values.length === 0) emptyColumns.push(h);
    columnSamples[h] = values.slice(0, MAX_SAMPLE_VALUES);
  }

  if (headerRowIndex > 0) {
    warnings.push(`Sheet "${name}": detected the header row at row ${headerRowIndex + 1} (skipped ${headerRowIndex} leading row(s)).`);
  }
  if (emptyColumns.length) {
    warnings.push(`Sheet "${name}": ${emptyColumns.length} column(s) have no data (${emptyColumns.slice(0, 5).join(", ")}${emptyColumns.length > 5 ? "…" : ""}).`);
  }

  return {
    name,
    headerRowIndex,
    headers,
    originalHeaders,
    rows,
    rowCount: rows.length,
    emptyColumns,
    duplicateColumns,
    columnSamples,
  };
}

/**
 * Real CRM exports occasionally have a title row or blank rows before the
 * real header. Score the first few rows on "does this look like a header"
 * (short, mostly unique, mostly non-numeric) and pick the best one.
 */
function detectHeaderRow(matrix: string[][]): number {
  const window = Math.min(HEADER_SCAN_WINDOW, matrix.length);
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < window; i++) {
    const row = matrix[i].map((c) => (c ?? "").toString().trim());
    const nonEmpty = row.filter((c) => c !== "");
    if (nonEmpty.length === 0) continue;

    const uniqueRatio = new Set(nonEmpty.map((c) => c.toLowerCase())).size / nonEmpty.length;
    const avgLen = nonEmpty.reduce((s, c) => s + c.length, 0) / nonEmpty.length;
    const numericRatio = nonEmpty.filter((c) => /^[\d.,\-\s]+$/.test(c)).length / nonEmpty.length;
    // A row that has a following data row with more numeric/longer content scores higher too.
    const nextRow = matrix[i + 1]?.map((c) => (c ?? "").toString().trim()) ?? [];
    const hasFollowingData = nextRow.some((c) => c !== "");

    const score =
      nonEmpty.length * 2 +
      uniqueRatio * 5 -
      numericRatio * 8 -
      Math.max(0, avgLen - 30) * 0.1 +
      (hasFollowingData ? 3 : -5);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}
