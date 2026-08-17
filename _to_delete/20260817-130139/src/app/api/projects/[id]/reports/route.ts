import { NextRequest, NextResponse } from "next/server";
import { getProjectBundle, insertGeneratedReport, listReportsForProject } from "@/db/repo";
import { buildComputedReportData, renderReportHtml } from "@/lib/pdf-template";
import { htmlToPdfBuffer } from "@/lib/pdf-generate";
import { uploadPdf } from "@/lib/pdf-storage";
import type { ProjectBundle, ReportClientInfo } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reports = await listReportsForProject(id);
  return NextResponse.json(reports);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Start from the persisted bundle, then apply any manual overrides the agent
  // made in the review step (e.g. tweaking appreciation %, a unit price, etc.)
  // without necessarily saving those tweaks back as the project's baseline.
  const baseBundle = await getProjectBundle(id);
  if (!baseBundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const bundle: ProjectBundle = body.overrideBundle ?? baseBundle;

  const clientInfo: ReportClientInfo = {
    clientName: body.clientName ?? "",
    clientPhone: body.clientPhone ?? "",
    clientEmail: body.clientEmail ?? "",
    focusUnitTypeId: body.focusUnitTypeId ?? bundle.unitTypes[0]?.id ?? null,
    clientType: body.clientType ?? "investor",
    flipExitYear: body.flipExitYear ?? null,
  };

  if (!bundle.unitTypes.length) {
    return NextResponse.json(
      { error: "Add at least one unit type before generating a report." },
      { status: 400 }
    );
  }

  const computed = buildComputedReportData(bundle, clientInfo);
  const html = renderReportHtml(bundle, clientInfo, computed);
  const pdfBuffer = await htmlToPdfBuffer(html);

  const safeName = bundle.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const fileName = `${safeName}-${Date.now()}.pdf`;
  // Object path within the Supabase Storage bucket; scoped by project id so
  // files from different projects never collide even if names match.
  const objectPath = `${id}/${fileName}`;
  await uploadPdf(objectPath, pdfBuffer);

  const reportId = await insertGeneratedReport({
    projectId: id,
    clientName: clientInfo.clientName,
    clientPhone: clientInfo.clientPhone,
    clientEmail: clientInfo.clientEmail,
    focusUnitTypeId: clientInfo.focusUnitTypeId,
    snapshotJson: JSON.stringify({ bundle, clientInfo }),
    pdfFileName: objectPath,
  });

  return NextResponse.json({
    reportId,
    downloadUrl: `/api/reports/${reportId}/download`,
  });
}
