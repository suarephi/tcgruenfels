import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getTournamentById,
  getTournamentMatches,
  getTournamentParticipants,
  generateRoundRobinMatches,
  generateSingleEliminationMatches,
  generateGroupKnockoutMatches,
  createManualMatches,
} from "@/lib/tournaments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matches = await getTournamentMatches(id);
  return NextResponse.json({ matches });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const participants = await getTournamentParticipants(id);
  if (participants.length < 2) {
    return NextResponse.json({ error: "Need at least 2 participants" }, { status: 400 });
  }

  // Check if matches already exist
  const existingMatches = await getTournamentMatches(id);
  if (existingMatches.length > 0) {
    return NextResponse.json({ error: "Matches already generated" }, { status: 400 });
  }

  try {
    // Check if manual matches were provided
    const body = await request.json().catch(() => ({}));
    const manualMatches = body.manualMatches;

    if (manualMatches && Array.isArray(manualMatches)) {
      // Create matches from manual configuration
      await createManualMatches(id, manualMatches);
    } else {
      // Auto-generate matches based on format
      switch (tournament.format) {
        case "round_robin":
          await generateRoundRobinMatches(id, participants);
          break;
        case "single_elimination":
          await generateSingleEliminationMatches(id, participants);
          break;
        case "group_knockout":
          await generateGroupKnockoutMatches(
            id,
            participants,
            tournament.settings.groups_count
          );
          break;
        default:
          return NextResponse.json({ error: "Unknown format" }, { status: 400 });
      }
    }

    // Check if matches were created
    const matches = await getTournamentMatches(id);
    if (matches.length > 0) {
      return NextResponse.json({ matches });
    } else {
      return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error generating matches:", error);
    return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
  }
}

// DELETE - Reset/delete all matches for a tournament (admin only, before tournament starts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Only allow resetting if tournament hasn't started or is still in draft
  if (tournament.status === "completed") {
    return NextResponse.json({ error: "Cannot reset completed tournament" }, { status: 400 });
  }

  try {
    // Delete all matches for this tournament
    const { error } = await supabase
      .from("tournament_matches")
      .delete()
      .eq("tournament_id", id);

    if (error) {
      console.error("Error deleting matches:", error);
      return NextResponse.json({ error: "Failed to delete matches" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting matches:", error);
    return NextResponse.json({ error: "Failed to reset matches" }, { status: 500 });
  }
}
