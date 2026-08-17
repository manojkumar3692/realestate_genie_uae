import { NextRequest, NextResponse } from "next/server";
import { getFirmSettings, updateFirmSettings } from "@/db/repo";

export async function GET() {
  return NextResponse.json(await getFirmSettings());
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = await updateFirmSettings(body);
  return NextResponse.json(updated);
}
