import { NextRequest, NextResponse } from "next/server";
import { getTournamentMatches } from "@/lib/tournaments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matches = await getTournamentMatches(id);
  return NextResponse.json({ matches });
}
