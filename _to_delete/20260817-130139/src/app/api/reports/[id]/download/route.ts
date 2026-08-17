import { NextRequest, NextResponse } from "next/server";
import { getReportById } from "@/db/repo";
import { getSignedPdfUrl } from "@/lib/pdf-storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // pdfFileName actually stores the Supabase Storage object path (e.g.
  // "<projectId>/<file>.pdf"). Redirect to a short-lived signed URL rather
  // than proxying the bytes through this function.
  let signedUrl: string;
  try {
    signedUrl = await getSignedPdfUrl(report.pdfFileName);
  } catch {
    return NextResponse.json({ error: "PDF file missing in storage" }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
