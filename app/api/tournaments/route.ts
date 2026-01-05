import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProfileById } from "@/lib/db";
import {
  getAllTournaments,
  createTournament,
  TournamentType,
  TournamentFormat,
  TournamentSettings,
} from "@/lib/tournaments";

export async function GET() {
  const tournaments = await getAllTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { name, type, format, settings } = await request.json();

    if (!name || !type || !format) {
      return NextResponse.json(
        { error: "Name, type, and format are required" },
        { status: 400 }
      );
    }

    if (!["singles", "doubles"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (!["round_robin", "single_elimination", "group_knockout"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const id = await createTournament(
      name,
      type as TournamentType,
      format as TournamentFormat,
      settings as Partial<TournamentSettings>
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Tournament creation error:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}
