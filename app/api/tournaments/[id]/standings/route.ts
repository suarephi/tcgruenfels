import { NextRequest, NextResponse } from "next/server";
import {
  getTournamentById,
  getTournamentParticipants,
  getTournamentMatches,
  calculateGroupStandings,
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

  if (tournament.format === "round_robin") {
    // Single round robin - all participants together
    const standings = calculateGroupStandings(participants, matches);
    return NextResponse.json({ standings, groups: null });
  }

  if (tournament.format === "group_knockout") {
    // Calculate standings for each group
    const groups: Map<number, typeof participants> = new Map();
    participants.forEach((p) => {
      const groupNum = p.group_number || 1;
      if (!groups.has(groupNum)) {
        groups.set(groupNum, []);
      }
      groups.get(groupNum)!.push(p);
    });

    const groupStandings: { groupNumber: number; standings: ReturnType<typeof calculateGroupStandings> }[] = [];

    Array.from(groups.entries()).forEach(([groupNum, groupParticipants]) => {
      const groupMatches = matches.filter((m) => m.group_number === groupNum);
      const standings = calculateGroupStandings(groupParticipants, groupMatches);
      groupStandings.push({ groupNumber: groupNum, standings });
    });

    // Sort by group number
    groupStandings.sort((a, b) => a.groupNumber - b.groupNumber);

    return NextResponse.json({ standings: null, groups: groupStandings });
  }

  // Single elimination - no standings, just return participants
  return NextResponse.json({
    standings: null,
    groups: null,
    participants,
  });
}
