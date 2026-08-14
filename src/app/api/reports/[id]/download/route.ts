import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getReportById } from "@/db/repo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "data", "reports", report.pdfFileName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "PDF file missing on disk" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${report.pdfFileName}"`,
    },
  });
}
