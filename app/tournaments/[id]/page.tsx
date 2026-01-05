"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";
import TournamentBracket from "@/components/TournamentBracket";
import GroupStandings from "@/components/GroupStandings";
import MatchResultDialog from "@/components/MatchResultDialog";

interface TournamentSettings {
  groups_count: number;
  advance_per_group: number;
  sets_to_win: number;
}

interface Tournament {
  id: string;
  name: string;
  type: "singles" | "doubles";
  format: "round_robin" | "single_elimination" | "group_knockout";
  status: "draft" | "registration" | "in_progress" | "completed";
  settings: TournamentSettings;
  participant_count: number;
}

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
  participant1?: Participant;
  participant2?: Participant;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

type Tab = "bracket" | "matches" | "standings" | "participants";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const supabase = createBrowserSupabaseClient();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("bracket");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [matchDialog, setMatchDialog] = useState<{ isOpen: boolean; match: Match | null }>({
    isOpen: false,
    match: null,
  });

  // Admin controls state
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tournamentId = params.id as string;

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (!res.ok) {
        router.push("/tournaments");
        return;
      }
      const data = await res.json();
      setTournament(data.tournament);
      setParticipants(data.participants || []);
      setMatches(data.matches || []);
    } catch (error) {
      console.error("Failed to fetch tournament:", error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, router]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        const admin = profile?.is_admin || false;
        setIsAdmin(admin);
        if (admin) {
          fetchAllUsers();
        }
      }
    };

    checkAuth();
    fetchTournament();
  }, [fetchTournament, fetchAllUsers, supabase]);

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;
    setActionLoading("add-participant");
    try {
      const body: { userId: string; partnerId?: string } = { userId: selectedUserId };
      if (tournament?.type === "doubles" && selectedPartnerId) {
        body.partnerId = selectedPartnerId;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Teilnehmer hinzugefügt" : "Participant added", type: "success" });
        setShowAddParticipant(false);
        setSelectedUserId("");
        setSelectedPartnerId("");
        await fetchTournament();
      } else {
        const data = await res.json();
        setToast({ message: data.error || t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    setActionLoading(participantId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants?participantId=${participantId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Teilnehmer entfernt" : "Participant removed", type: "success" });
        await fetchTournament();
      } else {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateMatches = async () => {
    setActionLoading("generate-matches");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Spielplan erstellt" : "Matches generated", type: "success" });
        await fetchTournament();
      } else {
        const data = await res.json();
        setToast({ message: data.error || t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading("update-status");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Status aktualisiert" : "Status updated", type: "success" });
        await fetchTournament();
      } else {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter out users who are already participants
  const availableUsers = allUsers.filter(
    (user) => !participants.some((p) => p.user_id === user.id || p.partner_id === user.id)
  );

  const getParticipantName = (participant?: Participant) => {
    if (!participant) return t.tournament.bye;
    const name = `${participant.user_first_name || ""} ${participant.user_last_name || ""}`.trim();
    if (participant.partner_first_name) {
      const partnerName = `${participant.partner_first_name} ${participant.partner_last_name || ""}`.trim();
      return `${name} / ${partnerName}`;
    }
    return name || "Unknown";
  };

  const canEditMatch = (match: Match) => {
    if (isAdmin) return true;
    if (!currentUserId) return false;

    const userParticipant = participants.find(
      (p) => p.user_id === currentUserId || p.partner_id === currentUserId
    );
    if (!userParticipant) return false;

    return (
      match.participant1_id === userParticipant.id ||
      match.participant2_id === userParticipant.id
    );
  };

  const handleSaveResult = async (matchId: string, score: string, winnerId: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, winnerId }),
      });

      if (res.ok) {
        setToast({ message: t.toast.editSuccess, type: "success" });
        await fetchTournament();
      } else {
        setToast({ message: t.toast.editFailed, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setMatchDialog({ isOpen: false, match: null });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-[var(--stone-100)] text-[var(--stone-600)]",
      registration: "bg-blue-100 text-blue-700",
      in_progress: "bg-[var(--forest-100)] text-[var(--forest-700)]",
      completed: "bg-[var(--terracotta-100)] text-[var(--terracotta-700)]",
    };

    const labels: Record<string, string> = {
      draft: t.tournament.draft,
      registration: t.tournament.registration,
      in_progress: t.tournament.inProgress,
      completed: t.tournament.completed,
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case "round_robin":
        return t.tournament.roundRobin;
      case "single_elimination":
        return t.tournament.singleElimination;
      case "group_knockout":
        return t.tournament.groupKnockout;
      default:
        return format;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: "3px solid var(--forest-100)",
              borderTopColor: "var(--forest-600)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "bracket", label: t.tournament.bracket },
    { id: "matches", label: t.tournament.matches },
    { id: "standings", label: t.tournament.standings },
    { id: "participants", label: t.tournament.participants },
  ];

  const groupMatches = matches.filter((m) => m.stage === "group");
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");

  return (
    <div className="py-8 md:py-12 max-w-6xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {matchDialog.match && (
        <MatchResultDialog
          isOpen={matchDialog.isOpen}
          match={matchDialog.match}
          participants={participants}
          onSave={handleSaveResult}
          onCancel={() => setMatchDialog({ isOpen: false, match: null })}
        />
      )}

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddParticipant(false)}
          />
          <div className="relative w-full max-w-md card-elevated p-6 animate-scale-in">
            <h3 className="font-serif text-xl text-[var(--stone-900)] mb-4">
              {language === "de" ? "Teilnehmer hinzufügen" : "Add Participant"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                  {language === "de" ? "Spieler" : "Player"}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="input-field"
                >
                  <option value="">{language === "de" ? "Spieler auswählen..." : "Select player..."}</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {tournament?.type === "doubles" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                    {language === "de" ? "Partner" : "Partner"}
                  </label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">{language === "de" ? "Partner auswählen..." : "Select partner..."}</option>
                    {availableUsers
                      .filter((u) => u.id !== selectedUserId)
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddParticipant(false)}
                className="flex-1 btn-secondary"
              >
                {t.booking.cancelDialog}
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={!selectedUserId || (tournament?.type === "doubles" && !selectedPartnerId) || actionLoading === "add-participant"}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {actionLoading === "add-participant" ? "..." : language === "de" ? "Hinzufügen" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-serif text-3xl md:text-4xl text-[var(--stone-900)]">
                {tournament.name}
              </h1>
              {getStatusBadge(tournament.status)}
            </div>
            <div className="flex items-center gap-4 text-[var(--stone-500)]">
              <span>
                {tournament.type === "singles" ? t.tournament.singles : t.tournament.doubles}
              </span>
              <span>•</span>
              <span>{getFormatLabel(tournament.format)}</span>
              <span>•</span>
              <span>{participants.length} {t.tournament.participants}</span>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddParticipant(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {language === "de" ? "Teilnehmer hinzufügen" : "Add Participant"}
            </button>

            {participants.length >= 2 && matches.length === 0 && (
              <button
                onClick={handleGenerateMatches}
                disabled={actionLoading === "generate-matches"}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                {actionLoading === "generate-matches"
                  ? "..."
                  : language === "de" ? "Spielplan erstellen" : "Generate Matches"}
              </button>
            )}

            {tournament.status === "draft" && participants.length >= 2 && (
              <button
                onClick={() => handleUpdateStatus("in_progress")}
                disabled={actionLoading === "update-status"}
                className="px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ background: "var(--forest-600)" }}
              >
                {actionLoading === "update-status"
                  ? "..."
                  : language === "de" ? "Turnier starten" : "Start Tournament"}
              </button>
            )}

            {tournament.status === "in_progress" && (
              <button
                onClick={() => handleUpdateStatus("completed")}
                disabled={actionLoading === "update-status"}
                className="px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ background: "var(--terracotta-500)" }}
              >
                {actionLoading === "update-status"
                  ? "..."
                  : language === "de" ? "Turnier beenden" : "End Tournament"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--stone-200)] mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-[var(--forest-700)] border-[var(--forest-600)]"
                  : "text-[var(--stone-500)] border-transparent hover:text-[var(--stone-700)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "bracket" && (
          <div>
            {tournament.format === "group_knockout" && groupMatches.length > 0 && (
              <div className="mb-8">
                <h2 className="font-serif text-xl text-[var(--stone-800)] mb-4">
                  {t.tournament.groups}
                </h2>
                <GroupStandings
                  participants={participants}
                  matches={groupMatches}
                  groupsCount={tournament.settings.groups_count}
                />
              </div>
            )}

            {(tournament.format === "single_elimination" ||
              (tournament.format === "group_knockout" && knockoutMatches.length > 0)) && (
              <div>
                <h2 className="font-serif text-xl text-[var(--stone-800)] mb-4">
                  {tournament.format === "group_knockout" ? t.tournament.bracket : ""}
                </h2>
                <TournamentBracket
                  matches={knockoutMatches.length > 0 ? knockoutMatches : matches}
                  participants={participants}
                  onMatchClick={(match) => {
                    if (canEditMatch(match) && match.participant1_id && match.participant2_id) {
                      setMatchDialog({ isOpen: true, match });
                    }
                  }}
                />
              </div>
            )}

            {tournament.format === "round_robin" && (
              <GroupStandings
                participants={participants}
                matches={matches}
                groupsCount={1}
              />
            )}

            {matches.length === 0 && (
              <div className="card-elevated p-12 text-center">
                <p className="text-[var(--stone-500)]">{t.tournament.noMatches}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <p className="text-[var(--stone-500)]">{t.tournament.noMatches}</p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="card-elevated p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-[var(--stone-500)] mb-1">
                      {match.stage === "group" && (
                        <span>{t.tournament.group} {match.group_number}</span>
                      )}
                      <span>
                        {t.tournament.round} {match.round}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-medium ${
                          match.winner_id === match.participant1_id
                            ? "text-[var(--forest-700)]"
                            : "text-[var(--stone-700)]"
                        }`}
                      >
                        {getParticipantName(match.participant1)}
                      </span>
                      <span className="text-[var(--stone-400)]">{t.tournament.vs}</span>
                      <span
                        className={`font-medium ${
                          match.winner_id === match.participant2_id
                            ? "text-[var(--forest-700)]"
                            : "text-[var(--stone-700)]"
                        }`}
                      >
                        {getParticipantName(match.participant2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {match.score ? (
                      <span className="font-mono text-[var(--stone-600)]">{match.score}</span>
                    ) : (
                      <span className="text-sm text-[var(--stone-400)]">
                        {t.tournament.pending}
                      </span>
                    )}
                    {canEditMatch(match) && match.participant1_id && match.participant2_id && (
                      <button
                        onClick={() => setMatchDialog({ isOpen: true, match })}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--forest-50)]"
                        style={{ color: "var(--forest-600)" }}
                      >
                        {t.tournament.enterScore}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "standings" && (
          <GroupStandings
            participants={participants}
            matches={matches.filter((m) => m.stage === "group" || tournament.format === "round_robin")}
            groupsCount={tournament.format === "round_robin" ? 1 : tournament.settings.groups_count}
          />
        )}

        {activeTab === "participants" && (
          <div className="space-y-2">
            {participants.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <p className="text-[var(--stone-500)]">{t.tournament.noParticipants}</p>
              </div>
            ) : (
              participants.map((participant, idx) => (
                <div
                  key={participant.id}
                  className="card-elevated p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-[var(--cream-200)] flex items-center justify-center text-sm font-medium text-[var(--stone-600)]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-medium text-[var(--stone-800)]">
                        {getParticipantName(participant)}
                      </span>
                      {participant.group_number && (
                        <span className="ml-2 text-sm text-[var(--stone-500)]">
                          {t.tournament.group} {participant.group_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {participant.seed && (
                      <span className="text-sm text-[var(--stone-500)]">
                        {t.tournament.seed} #{participant.seed}
                      </span>
                    )}
                    {isAdmin && matches.length === 0 && (
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        disabled={actionLoading === participant.id}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-red-50"
                        style={{ color: "#dc2626" }}
                      >
                        {actionLoading === participant.id ? "..." : language === "de" ? "Entfernen" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
