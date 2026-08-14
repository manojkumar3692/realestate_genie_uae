import { NextRequest, NextResponse } from "next/server";
import { lookupProjectDirectorySuggestions } from "@/db/repo";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!name.trim()) {
    return NextResponse.json({ matches: [] });
  }
  const matches = await lookupProjectDirectorySuggestions(name);
  return NextResponse.json({ matches });
}
