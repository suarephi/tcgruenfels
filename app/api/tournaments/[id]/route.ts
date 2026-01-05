import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProfileById } from "@/lib/db";
import {
  getTournamentById,
  getTournamentParticipants,
  getTournamentMatches,
  updateTournament,
  deleteTournament,
  deleteAllMatches,
  generateRoundRobinMatches,
  generateSingleEliminationMatches,
  generateGroupKnockoutMatches,
} from "@/lib/tournaments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await getTournamentById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const participants = await getTournamentParticipants(id);
  const matches = await getTournamentMatches(id);

  return NextResponse.json({ tournament, participants, matches });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const body = await request.json();
    const { action, ...updates } = body;

    // Special action to generate matches
    if (action === "generate_matches") {
      const tournament = await getTournamentById(id);
      if (!tournament) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }

      const participants = await getTournamentParticipants(id);
      if (participants.length < 2) {
        return NextResponse.json(
          { error: "Need at least 2 participants" },
          { status: 400 }
        );
      }

      // Delete existing matches
      await deleteAllMatches(id);

      // Generate new matches based on format
      if (tournament.format === "round_robin") {
        await generateRoundRobinMatches(id, participants);
      } else if (tournament.format === "single_elimination") {
        await generateSingleEliminationMatches(id, participants);
      } else if (tournament.format === "group_knockout") {
        await generateGroupKnockoutMatches(
          id,
          participants,
          tournament.settings.groups_count
        );
      }

      return NextResponse.json({ success: true });
    }

    // Special action to start tournament
    if (action === "start") {
      await updateTournament(id, { status: "in_progress" });
      return NextResponse.json({ success: true });
    }

    // Special action to complete tournament
    if (action === "complete") {
      await updateTournament(id, { status: "completed" });
      return NextResponse.json({ success: true });
    }

    // Regular update
    const success = await updateTournament(id, updates);
    if (!success) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tournament update error:", error);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const success = await deleteTournament(id);
  if (!success) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
