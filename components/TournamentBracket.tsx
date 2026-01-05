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
  tournament_id: string;
  round: number;
  match_number: number;
  stage: "group" | "knockout";
  group_number: number | null;
  participant1_id: string | null;
  participant2_id: string | null;
  score: string | null;
  winner_id: string | null;
  status: "pending" | "in_progress" | "completed";
  scheduled_date: string | null;
  participant1?: Participant;
  participant2?: Participant;
}

interface TournamentBracketProps {
  matches: Match[];
  participants: Participant[];
  onMatchClick?: (match: Match) => void;
}

export default function TournamentBracket({
  matches,
  participants,
  onMatchClick,
}: TournamentBracketProps) {
  const { t } = useLanguage();

  if (matches.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <p className="text-[var(--stone-500)]">{t.tournament.noMatches}</p>
      </div>
    );
  }

  // Group matches by round
  const rounds = new Map<number, Match[]>();
  matches.forEach((match) => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, []);
    }
    rounds.get(match.round)!.push(match);
  });

  // Sort rounds
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const totalRounds = sortedRounds.length;

  const getParticipantName = (participant?: Participant) => {
    if (!participant) return t.tournament.bye;
    const name = `${participant.user_first_name || ""} ${participant.user_last_name || ""}`.trim();
    if (participant.partner_first_name) {
      const partnerName = `${participant.partner_first_name} ${participant.partner_last_name || ""}`.trim();
      return `${name} / ${partnerName}`;
    }
    return name || "TBD";
  };

  const getRoundName = (roundIndex: number, total: number) => {
    const roundsFromEnd = total - roundIndex;
    if (roundsFromEnd === 1) return t.tournament.final;
    if (roundsFromEnd === 2) return t.tournament.semifinals;
    if (roundsFromEnd === 3) return t.tournament.quarterfinals;
    return `${t.tournament.round} ${roundIndex + 1}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {sortedRounds.map(([round, roundMatches], roundIndex) => {
          // Sort matches by match_number
          const sortedMatches = [...roundMatches].sort(
            (a, b) => a.match_number - b.match_number
          );

          // Calculate spacing for visual alignment
          const matchHeight = 80; // Height of each match card
          const gapMultiplier = Math.pow(2, roundIndex);

          return (
            <div key={round} className="flex flex-col">
              {/* Round header */}
              <div className="text-center mb-4">
                <span className="text-sm font-medium text-[var(--stone-500)] uppercase tracking-wide">
                  {getRoundName(roundIndex, totalRounds)}
                </span>
              </div>

              {/* Matches */}
              <div
                className="flex flex-col justify-around flex-1"
                style={{
                  gap: `${(gapMultiplier - 1) * matchHeight + 16}px`,
                  paddingTop: `${((gapMultiplier - 1) * matchHeight) / 2}px`,
                }}
              >
                {sortedMatches.map((match) => {
                  const isClickable =
                    onMatchClick && match.participant1_id && match.participant2_id;
                  const p1 = participants.find((p) => p.id === match.participant1_id);
                  const p2 = participants.find((p) => p.id === match.participant2_id);

                  return (
                    <div
                      key={match.id}
                      onClick={() => isClickable && onMatchClick(match)}
                      className={`w-48 rounded-lg border border-[var(--stone-200)] bg-white overflow-hidden shadow-sm ${
                        isClickable ? "cursor-pointer hover:border-[var(--forest-300)] hover:shadow-md transition-all" : ""
                      }`}
                    >
                      {/* Player 1 */}
                      <div
                        className={`px-3 py-2 flex items-center justify-between border-b border-[var(--stone-100)] ${
                          match.winner_id === match.participant1_id
                            ? "bg-[var(--forest-50)]"
                            : ""
                        }`}
                      >
                        <span
                          className={`text-sm truncate flex-1 ${
                            match.winner_id === match.participant1_id
                              ? "font-semibold text-[var(--forest-700)]"
                              : match.winner_id && match.winner_id !== match.participant1_id
                              ? "text-[var(--stone-400)]"
                              : "text-[var(--stone-700)]"
                          }`}
                        >
                          {getParticipantName(p1)}
                        </span>
                        {match.score && (
                          <span className="text-xs font-mono text-[var(--stone-500)] ml-2">
                            {match.score.split(",")[0]}
                          </span>
                        )}
                      </div>

                      {/* Player 2 */}
                      <div
                        className={`px-3 py-2 flex items-center justify-between ${
                          match.winner_id === match.participant2_id
                            ? "bg-[var(--forest-50)]"
                            : ""
                        }`}
                      >
                        <span
                          className={`text-sm truncate flex-1 ${
                            match.winner_id === match.participant2_id
                              ? "font-semibold text-[var(--forest-700)]"
                              : match.winner_id && match.winner_id !== match.participant2_id
                              ? "text-[var(--stone-400)]"
                              : "text-[var(--stone-700)]"
                          }`}
                        >
                          {getParticipantName(p2)}
                        </span>
                        {match.score && (
                          <span className="text-xs font-mono text-[var(--stone-500)] ml-2">
                            {match.score.split(",")[1]?.trim() || ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Winner display */}
        {sortedRounds.length > 0 && (
          <div className="flex flex-col">
            <div className="text-center mb-4">
              <span className="text-sm font-medium text-[var(--terracotta-600)] uppercase tracking-wide">
                {t.tournament.winner}
              </span>
            </div>
            <div
              className="flex flex-col justify-center flex-1"
              style={{
                paddingTop: `${((Math.pow(2, totalRounds - 1) - 1) * 80) / 2}px`,
              }}
            >
              {(() => {
                const finalMatch = sortedRounds[totalRounds - 1]?.[1]?.[0];
                if (!finalMatch?.winner_id) {
                  return (
                    <div className="w-48 rounded-lg border-2 border-dashed border-[var(--stone-200)] bg-[var(--cream-50)] p-4 text-center">
                      <span className="text-sm text-[var(--stone-400)]">TBD</span>
                    </div>
                  );
                }

                const winner = participants.find((p) => p.id === finalMatch.winner_id);
                return (
                  <div className="w-48 rounded-lg border-2 border-[var(--terracotta-300)] bg-gradient-to-br from-[var(--terracotta-50)] to-[var(--cream-100)] p-4 text-center shadow-md">
                    <div className="text-2xl mb-2">🏆</div>
                    <span className="font-semibold text-[var(--stone-800)]">
                      {getParticipantName(winner)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
