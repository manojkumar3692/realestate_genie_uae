import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectBundle, saveProjectBundle } from "@/db/repo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bundle = await getProjectBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getProjectBundle(id);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = await request.json();
  const bundle = await saveProjectBundle(id, body);
  return NextResponse.json(bundle);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
