import { NextRequest, NextResponse } from "next/server";
import { createDraftProject, listProjects } from "@/db/repo";

export async function GET() {
  return NextResponse.json(await listProjects());
}

export async function POST(request: NextRequest) {
  let name = "Untitled Project";
  try {
    const body = await request.json();
    if (body?.name) name = body.name;
  } catch {
    // no body provided — use default name
  }
  const id = await createDraftProject(name);
  return NextResponse.json({ id }, { status: 201 });
}
