import { supabase } from "./supabase";

export type TournamentType = "singles" | "doubles";
export type TournamentFormat = "round_robin" | "single_elimination" | "group_knockout";
export type TournamentStatus = "draft" | "registration" | "in_progress" | "completed";
export type MatchStage = "group" | "knockout";
export type MatchStatus = "pending" | "in_progress" | "completed";

export interface TournamentSettings {
  groups_count: number;
  advance_per_group: number;
  sets_to_win: number;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  format: TournamentFormat;
  status: TournamentStatus;
  settings: TournamentSettings;
  created_at: string;
  participant_count?: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  partner_id: string | null;
  group_number: number | null;
  seed: number | null;
  created_at: string;
  // Joined fields
  user_first_name?: string;
  user_last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  stage: MatchStage;
  group_number: number | null;
  participant1_id: string | null;
  participant2_id: string | null;
  score: string | null;
  winner_id: string | null;
  status: MatchStatus;
  scheduled_date: string | null;
  created_at: string;
  // Joined fields
  participant1?: TournamentParticipant;
  participant2?: TournamentParticipant;
}

export interface GroupStanding {
  participant: TournamentParticipant;
  played: number;
  won: number;
  lost: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  points: number;
}

// ============ Tournament CRUD ============

export async function getAllTournaments(): Promise<Tournament[]> {
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }

  // Get participant counts
  const { data: counts } = await supabase
    .from("tournament_participants")
    .select("tournament_id");

  const countMap = new Map<string, number>();
  counts?.forEach((p) => {
    countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1);
  });

  return tournaments.map((t) => ({
    ...t,
    participant_count: countMap.get(t.id) || 0,
  }));
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const { count } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  return { ...data, participant_count: count || 0 };
}

export async function createTournament(
  name: string,
  type: TournamentType,
  format: TournamentFormat,
  settings?: Partial<TournamentSettings>
): Promise<string> {
  const defaultSettings: TournamentSettings = {
    groups_count: 2,
    advance_per_group: 2,
    sets_to_win: 2,
  };

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name,
      type,
      format,
      settings: { ...defaultSettings, ...settings },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateTournament(
  id: string,
  updates: Partial<{
    name: string;
    type: TournamentType;
    format: TournamentFormat;
    status: TournamentStatus;
    settings: Partial<TournamentSettings>;
  }>
): Promise<boolean> {
  const { error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id);

  return !error;
}

export async function deleteTournament(id: string): Promise<boolean> {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  return !error;
}

// ============ Participants ============

export async function getTournamentParticipants(
  tournamentId: string
): Promise<TournamentParticipant[]> {
  const { data: participants, error } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("group_number", { ascending: true, nullsFirst: false })
    .order("seed", { ascending: true, nullsFirst: false });

  if (error || !participants) return [];

  // Get all user IDs to fetch names
  const userIds = new Set<string>();
  participants.forEach((p) => {
    userIds.add(p.user_id);
    if (p.partner_id) userIds.add(p.partner_id);
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return participants.map((p) => {
    const user = profileMap.get(p.user_id);
    const partner = p.partner_id ? profileMap.get(p.partner_id) : null;
    return {
      ...p,
      user_first_name: user?.first_name,
      user_last_name: user?.last_name,
      partner_first_name: partner?.first_name,
      partner_last_name: partner?.last_name,
    };
  });
}

export async function addParticipant(
  tournamentId: string,
  userId: string,
  partnerId: string | null = null,
  groupNumber: number | null = null,
  seed: number | null = null
): Promise<string> {
  const { data, error } = await supabase
    .from("tournament_participants")
    .insert({
      tournament_id: tournamentId,
      user_id: userId,
      partner_id: partnerId,
      group_number: groupNumber,
      seed,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateParticipant(
  id: string,
  updates: Partial<{
    partner_id: string | null;
    group_number: number | null;
    seed: number | null;
  }>
): Promise<boolean> {
  const { error } = await supabase
    .from("tournament_participants")
    .update(updates)
    .eq("id", id);

  return !error;
}

export async function removeParticipant(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("id", id);
  return !error;
}

// ============ Matches ============

export async function getTournamentMatches(
  tournamentId: string
): Promise<TournamentMatch[]> {
  const { data: matches, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage", { ascending: true })
    .order("group_number", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  if (error || !matches) return [];

  // Get participants for names
  const participants = await getTournamentParticipants(tournamentId);
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return matches.map((m) => ({
    ...m,
    participant1: m.participant1_id ? participantMap.get(m.participant1_id) : undefined,
    participant2: m.participant2_id ? participantMap.get(m.participant2_id) : undefined,
  }));
}

export async function getMatchById(id: string): Promise<TournamentMatch | null> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateMatchResult(
  matchId: string,
  score: string,
  winnerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("tournament_matches")
    .update({
      score,
      winner_id: winnerId,
      status: "completed",
    })
    .eq("id", matchId);

  return !error;
}

export async function updateMatchSchedule(
  matchId: string,
  scheduledDate: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from("tournament_matches")
    .update({
      scheduled_date: scheduledDate,
    })
    .eq("id", matchId);

  return !error;
}

export async function createMatch(
  tournamentId: string,
  round: number,
  matchNumber: number,
  stage: MatchStage,
  participant1Id: string | null,
  participant2Id: string | null,
  groupNumber: number | null = null
): Promise<string> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .insert({
      tournament_id: tournamentId,
      round,
      match_number: matchNumber,
      stage,
      group_number: groupNumber,
      participant1_id: participant1Id,
      participant2_id: participant2Id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteAllMatches(tournamentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("tournament_matches")
    .delete()
    .eq("tournament_id", tournamentId);
  return !error;
}

// ============ Match Generation ============

export async function generateRoundRobinMatches(
  tournamentId: string,
  participants: TournamentParticipant[],
  groupNumber: number | null = null
): Promise<void> {
  const matches: {
    tournament_id: string;
    round: number;
    match_number: number;
    stage: MatchStage;
    group_number: number | null;
    participant1_id: string;
    participant2_id: string;
  }[] = [];

  const n = participants.length;
  const rounds = n % 2 === 0 ? n - 1 : n;
  const matchesPerRound = Math.floor(n / 2);

  // Circle method for round-robin scheduling
  const playerList = [...participants];
  if (n % 2 === 1) {
    playerList.push({ id: "BYE" } as TournamentParticipant); // Add bye for odd number
  }

  const numPlayers = playerList.length;
  const half = numPlayers / 2;

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < half; match++) {
      const home = playerList[match];
      const away = playerList[numPlayers - 1 - match];

      if (home.id !== "BYE" && away.id !== "BYE") {
        matches.push({
          tournament_id: tournamentId,
          round: round + 1,
          match_number: match + 1,
          stage: groupNumber !== null ? "group" : "knockout",
          group_number: groupNumber,
          participant1_id: home.id,
          participant2_id: away.id,
        });
      }
    }

    // Rotate players (keep first player fixed)
    const last = playerList.pop()!;
    playerList.splice(1, 0, last);
  }

  if (matches.length > 0) {
    const { error } = await supabase.from("tournament_matches").insert(matches);
    if (error) throw new Error(error.message);
  }
}

export async function generateSingleEliminationMatches(
  tournamentId: string,
  participants: TournamentParticipant[],
  startRound: number = 1
): Promise<void> {
  const n = participants.length;
  const rounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, rounds);
  const byes = bracketSize - n;

  // Seed participants (already sorted by seed)
  const seeded = [...participants];
  while (seeded.length < bracketSize) {
    seeded.push(null as unknown as TournamentParticipant); // Add byes
  }

  // Create first round matches
  const matches: {
    tournament_id: string;
    round: number;
    match_number: number;
    stage: MatchStage;
    participant1_id: string | null;
    participant2_id: string | null;
  }[] = [];

  // Standard bracket seeding (1 vs N, 2 vs N-1, etc.)
  const firstRoundMatches = bracketSize / 2;
  for (let i = 0; i < firstRoundMatches; i++) {
    const p1Index = i;
    const p2Index = bracketSize - 1 - i;
    const p1 = seeded[p1Index];
    const p2 = seeded[p2Index];

    matches.push({
      tournament_id: tournamentId,
      round: startRound,
      match_number: i + 1,
      stage: "knockout",
      participant1_id: p1?.id || null,
      participant2_id: p2?.id || null,
    });
  }

  // Create placeholder matches for subsequent rounds
  let matchesInRound = firstRoundMatches / 2;
  for (let round = startRound + 1; round < startRound + rounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        match_number: i + 1,
        stage: "knockout",
        participant1_id: null,
        participant2_id: null,
      });
    }
    matchesInRound /= 2;
  }

  if (matches.length > 0) {
    const { error } = await supabase.from("tournament_matches").insert(matches);
    if (error) throw new Error(error.message);
  }
}

export async function generateGroupKnockoutMatches(
  tournamentId: string,
  participants: TournamentParticipant[],
  groupsCount: number
): Promise<void> {
  // Group participants by group_number
  const groups: Map<number, TournamentParticipant[]> = new Map();

  participants.forEach((p) => {
    const groupNum = p.group_number || 1;
    if (!groups.has(groupNum)) {
      groups.set(groupNum, []);
    }
    groups.get(groupNum)!.push(p);
  });

  // Generate round robin for each group
  for (const entry of Array.from(groups.entries())) {
    const [groupNum, groupParticipants] = entry;
    await generateRoundRobinMatches(tournamentId, groupParticipants, groupNum);
  }

  // Knockout matches will be generated after group stage completes
}

// ============ Standings Calculation ============

export function calculateGroupStandings(
  participants: TournamentParticipant[],
  matches: TournamentMatch[]
): GroupStanding[] {
  const standings = new Map<string, GroupStanding>();

  // Initialize standings for each participant
  participants.forEach((p) => {
    standings.set(p.id, {
      participant: p,
      played: 0,
      won: 0,
      lost: 0,
      sets_won: 0,
      sets_lost: 0,
      games_won: 0,
      games_lost: 0,
      points: 0,
    });
  });

  // Process completed matches
  matches
    .filter((m) => m.status === "completed" && m.score)
    .forEach((match) => {
      const p1Standing = standings.get(match.participant1_id!);
      const p2Standing = standings.get(match.participant2_id!);

      if (!p1Standing || !p2Standing) return;

      // Parse score (e.g., "6-4, 3-6, 7-5")
      const sets = match.score!.split(",").map((s) => s.trim());
      let p1Sets = 0, p2Sets = 0, p1Games = 0, p2Games = 0;

      sets.forEach((set) => {
        const [g1, g2] = set.split("-").map(Number);
        if (!isNaN(g1) && !isNaN(g2)) {
          p1Games += g1;
          p2Games += g2;
          if (g1 > g2) p1Sets++;
          else if (g2 > g1) p2Sets++;
        }
      });

      p1Standing.played++;
      p2Standing.played++;
      p1Standing.sets_won += p1Sets;
      p1Standing.sets_lost += p2Sets;
      p2Standing.sets_won += p2Sets;
      p2Standing.sets_lost += p1Sets;
      p1Standing.games_won += p1Games;
      p1Standing.games_lost += p2Games;
      p2Standing.games_won += p2Games;
      p2Standing.games_lost += p1Games;

      if (match.winner_id === match.participant1_id) {
        p1Standing.won++;
        p1Standing.points += 3;
        p2Standing.lost++;
      } else {
        p2Standing.won++;
        p2Standing.points += 3;
        p1Standing.lost++;
      }
    });

  // Sort by points, then set difference, then game difference
  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aSetDiff = a.sets_won - a.sets_lost;
    const bSetDiff = b.sets_won - b.sets_lost;
    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
    const aGameDiff = a.games_won - a.games_lost;
    const bGameDiff = b.games_won - b.games_lost;
    return bGameDiff - aGameDiff;
  });
}

// ============ Bracket Advancement ============

export async function advanceWinnerToNextRound(
  tournamentId: string,
  match: TournamentMatch
): Promise<void> {
  if (!match.winner_id || match.stage !== "knockout") return;

  const allMatches = await getTournamentMatches(tournamentId);
  const knockoutMatches = allMatches.filter((m) => m.stage === "knockout");

  // Find the next round match
  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.match_number / 2);
  const isFirstOfPair = match.match_number % 2 === 1;

  const nextMatch = knockoutMatches.find(
    (m) => m.round === nextRound && m.match_number === nextMatchNumber
  );

  if (nextMatch) {
    const update = isFirstOfPair
      ? { participant1_id: match.winner_id }
      : { participant2_id: match.winner_id };

    await supabase
      .from("tournament_matches")
      .update(update)
      .eq("id", nextMatch.id);
  }
}

// ============ Tournament Participant Check (for booking privileges) ============

export async function getActiveTournamentsForUser(userId: string): Promise<Tournament[]> {
  const { data: participations, error } = await supabase
    .from("tournament_participants")
    .select("tournament_id")
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`);

  if (error || !participations || participations.length === 0) return [];

  const tournamentIds = participations.map((p) => p.tournament_id);

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .in("id", tournamentIds)
    .in("status", ["registration", "in_progress"]);

  return tournaments || [];
}
