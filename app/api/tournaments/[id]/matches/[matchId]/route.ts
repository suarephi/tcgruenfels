import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProfileById } from "@/lib/db";
import {
  getMatchById,
  getTournamentParticipants,
  updateMatchResult,
  updateMatchSchedule,
  advanceWinnerToNextRound,
  getTournamentMatches,
} from "@/lib/tournaments";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  const isAdmin = profile?.is_admin || false;

  // Get the match
  const match = await getMatchById(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Check if user is a participant in this match (or admin)
  if (!isAdmin) {
    const participants = await getTournamentParticipants(tournamentId);
    const userParticipant = participants.find(
      (p) => p.user_id === user.id || p.partner_id === user.id
    );

    if (!userParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this tournament" },
        { status: 403 }
      );
    }

    const isInMatch =
      userParticipant.id === match.participant1_id ||
      userParticipant.id === match.participant2_id;

    if (!isInMatch) {
      return NextResponse.json(
        { error: "You can only update your own matches" },
        { status: 403 }
      );
    }
  }

  try {
    const { score, winnerId, scheduledDate } = await request.json();

    // Handle schedule update (admin or match participants)
    if (scheduledDate !== undefined) {
      const success = await updateMatchSchedule(matchId, scheduledDate);
      if (!success) {
        return NextResponse.json({ error: "Schedule update failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Handle score update
    if (!score || !winnerId) {
      return NextResponse.json(
        { error: "Score and winner are required" },
        { status: 400 }
      );
    }

    // Validate winner is one of the participants
    if (winnerId !== match.participant1_id && winnerId !== match.participant2_id) {
      return NextResponse.json(
        { error: "Winner must be a participant in this match" },
        { status: 400 }
      );
    }

    const success = await updateMatchResult(matchId, score, winnerId);
    if (!success) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Advance winner to next round (for knockout matches)
    const updatedMatch = await getMatchById(matchId);
    if (updatedMatch) {
      await advanceWinnerToNextRound(tournamentId, updatedMatch);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Match update error:", error);
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 }
    );
  }
}
