"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/requireSession";
import { validateImportFile } from "@/lib/security/files";
import { parseSpreadsheet, SpreadsheetParseError } from "@/lib/import/parseSpreadsheet";
import { detectColumns, refineUnmappedColumnsWithAi } from "@/lib/import/detectColumns";
import { classifyColumnsBatch } from "@/lib/ai/classifyColumns";
import {
  createImportJob,
  storeRawImportRows,
  saveColumnMappings,
  getColumnMappings,
  updateColumnMapping,
  runImportPipeline,
  getImportJob,
} from "@/db/repo";
import { runAiEnrichmentForImport } from "@/db/repoMatching";
import { logAudit } from "@/lib/audit";
import type { ColumnDetection } from "@/lib/import/detectColumns";

function fail(message: string): never {
  redirect(`/leads/import?error=${encodeURIComponent(message)}`);
}

export async function uploadImportAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail("Choose a CSV or Excel file to upload.");

  const validation = validateImportFile(file.name, file.type, file.size);
  if (!validation.valid) fail(validation.reason || "That file couldn't be used.");

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseSpreadsheet(buffer, file.name, file.type);
  } catch (err) {
    fail(err instanceof SpreadsheetParseError ? err.message : "Couldn't read that file.");
  }

  const sheet = parsed.sheets.reduce((best, s) => (s.rowCount > (best?.rowCount ?? -1) ? s : best), parsed.sheets[0]);
  if (!sheet || sheet.rowCount === 0) fail("No data rows were found in this file.");

  const importJobId = await createImportJob({
    orgId: session.orgId,
    createdBy: session.sub,
    fileName: file.name,
    fileType: parsed.fileType,
    sheetName: sheet.name,
    headerRowIndex: sheet.headerRowIndex,
    rowCount: sheet.rowCount,
  });

  await storeRawImportRows(importJobId, sheet.rows);

  let detections: ColumnDetection[] = detectColumns(sheet.headers, sheet.columnSamples);
  try {
    detections = await refineUnmappedColumnsWithAi(detections, classifyColumnsBatch);
  } catch {
    // AI refinement is best-effort — deterministic/fuzzy/value-inspection detections already stand.
  }
  await saveColumnMappings(importJobId, detections);

  await logAudit({
    orgId: session.orgId,
    userId: session.sub,
    action: "import.uploaded",
    entityType: "import_job",
    entityId: importJobId,
    metadata: { fileName: file.name, rowCount: sheet.rowCount, sheets: parsed.sheets.length },
  });

  redirect(`/leads/import/${importJobId}/mapping`);
}

export async function confirmImportAction(importJobId: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const job = await getImportJob(importJobId, session.orgId);
  if (!job) fail("Import not found.");

  const mappings = await getColumnMappings(importJobId);
  for (const m of mappings) {
    const selectedField = String(formData.get(`field_${m.id}`) || m.detectedField);
    const ignored = formData.get(`ignore_${m.id}`) === "on";
    await updateColumnMapping(m.id, {
      detectedField: ignored ? "unmapped" : selectedField,
      accepted: !ignored,
      ignored,
    });
  }

  const updatedMappings = await getColumnMappings(importJobId);
  const detections: ColumnDetection[] = updatedMappings.map((m) => ({
    sourceColumn: m.sourceColumn,
    detectedField: m.detectedField as ColumnDetection["detectedField"],
    confidence: m.confidence,
    method: m.method,
    sampleValues: m.sampleValuesJson,
  }));

  await runImportPipeline(session.orgId, importJobId, detections);

  try {
    await runAiEnrichmentForImport(importJobId, session.orgId);
  } catch {
    // AI enrichment is a refinement layer on top of the deterministic import — never block on it.
  }

  redirect(`/leads/import/${importJobId}/summary`);
}
