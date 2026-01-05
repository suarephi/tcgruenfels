"use client";

import { useLanguage } from "@/lib/LanguageContext";

interface Participant {
  id: string;
  tournament_id: string;
  user_id: string;
  partner_id: string | null;
  group_number: number | null;
  seed: number | null;
  user_first_name?: string;
  user_last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
}

interface Match {
  id: string;
  group_number: number | null;
  participant1_id: string | null;
  participant2_id: string | null;
  score: string | null;
  winner_id: string | null;
  status: string;
}

interface Standing {
  participant: Participant;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
}

interface GroupStandingsProps {
  participants: Participant[];
  matches: Match[];
  groupsCount: number;
}

export default function GroupStandings({
  participants,
  matches,
  groupsCount,
}: GroupStandingsProps) {
  const { t } = useLanguage();

  const getParticipantName = (participant: Participant) => {
    const name = `${participant.user_first_name || ""} ${participant.user_last_name || ""}`.trim();
    if (participant.partner_first_name) {
      const partnerName = `${participant.partner_first_name} ${participant.partner_last_name || ""}`.trim();
      return `${name} / ${partnerName}`;
    }
    return name || "Unknown";
  };

  const calculateStandings = (
    groupParticipants: Participant[],
    groupMatches: Match[]
  ): Standing[] => {
    const standings = new Map<string, Standing>();

    // Initialize standings
    groupParticipants.forEach((p) => {
      standings.set(p.id, {
        participant: p,
        played: 0,
        won: 0,
        lost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
      });
    });

    // Process matches
    groupMatches
      .filter((m) => m.status === "completed" && m.score)
      .forEach((match) => {
        const p1Standing = standings.get(match.participant1_id!);
        const p2Standing = standings.get(match.participant2_id!);

        if (!p1Standing || !p2Standing) return;

        // Parse score
        const sets = match.score!.split(",").map((s) => s.trim());
        let p1Sets = 0,
          p2Sets = 0,
          p1Games = 0,
          p2Games = 0;

        sets.forEach((set) => {
          const parts = set.split("-").map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            p1Games += parts[0];
            p2Games += parts[1];
            if (parts[0] > parts[1]) p1Sets++;
            else if (parts[1] > parts[0]) p2Sets++;
          }
        });

        p1Standing.played++;
        p2Standing.played++;
        p1Standing.setsWon += p1Sets;
        p1Standing.setsLost += p2Sets;
        p2Standing.setsWon += p2Sets;
        p2Standing.setsLost += p1Sets;
        p1Standing.gamesWon += p1Games;
        p1Standing.gamesLost += p2Games;
        p2Standing.gamesWon += p2Games;
        p2Standing.gamesLost += p1Games;

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
      const aSetDiff = a.setsWon - a.setsLost;
      const bSetDiff = b.setsWon - b.setsLost;
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
      const aGameDiff = a.gamesWon - a.gamesLost;
      const bGameDiff = b.gamesWon - b.gamesLost;
      return bGameDiff - aGameDiff;
    });
  };

  // Group participants by group_number
  const groups: Map<number, Participant[]> = new Map();

  if (groupsCount === 1) {
    groups.set(1, participants);
  } else {
    participants.forEach((p) => {
      const groupNum = p.group_number || 1;
      if (!groups.has(groupNum)) {
        groups.set(groupNum, []);
      }
      groups.get(groupNum)!.push(p);
    });
  }

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);

  if (participants.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <p className="text-[var(--stone-500)]">{t.tournament.noParticipants}</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${groupsCount > 1 ? "md:grid-cols-2" : ""}`}>
      {sortedGroups.map(([groupNum, groupParticipants]) => {
        const groupMatches = matches.filter(
          (m) => groupsCount === 1 || m.group_number === groupNum
        );
        const standings = calculateStandings(groupParticipants, groupMatches);

        return (
          <div key={groupNum} className="card-elevated overflow-hidden">
            {groupsCount > 1 && (
              <div className="px-4 py-3 bg-[var(--cream-100)] border-b border-[var(--stone-100)]">
                <h3 className="font-serif text-lg text-[var(--stone-800)]">
                  {t.tournament.group} {String.fromCharCode(64 + groupNum)}
                </h3>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[var(--stone-500)] uppercase tracking-wider border-b border-[var(--stone-100)]">
                    <th className="text-left px-4 py-3 w-8">#</th>
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-center px-2 py-3 w-10">{t.tournament.played}</th>
                    <th className="text-center px-2 py-3 w-10">{t.tournament.won}</th>
                    <th className="text-center px-2 py-3 w-10">{t.tournament.lost}</th>
                    <th className="text-center px-2 py-3 w-16">Sets</th>
                    <th className="text-center px-2 py-3 w-16">Games</th>
                    <th className="text-center px-2 py-3 w-12">{t.tournament.points}</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, idx) => (
                    <tr
                      key={standing.participant.id}
                      className="border-b border-[var(--stone-50)] last:border-0 hover:bg-[var(--cream-50)]"
                    >
                      <td className="px-4 py-3 text-sm text-[var(--stone-500)]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--stone-800)]">
                          {getParticipantName(standing.participant)}
                        </span>
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-[var(--stone-600)]">
                        {standing.played}
                      </td>
                      <td className="text-center px-2 py-3 text-sm font-medium text-[var(--forest-600)]">
                        {standing.won}
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-[var(--stone-600)]">
                        {standing.lost}
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-[var(--stone-600)]">
                        {standing.setsWon}-{standing.setsLost}
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-[var(--stone-600)]">
                        {standing.gamesWon}-{standing.gamesLost}
                      </td>
                      <td className="text-center px-2 py-3">
                        <span className="font-bold text-[var(--stone-800)]">
                          {standing.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
