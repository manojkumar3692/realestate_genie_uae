import { NextRequest, NextResponse } from "next/server";
import { lookupProjectDirectory } from "@/db/repo";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!name.trim()) {
    return NextResponse.json({ match: null });
  }
  const match = await lookupProjectDirectory(name);
  return NextResponse.json({ match });
}
