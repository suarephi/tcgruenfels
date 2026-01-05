"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";
import TournamentBracket from "@/components/TournamentBracket";
import GroupStandings from "@/components/GroupStandings";
import MatchResultDialog from "@/components/MatchResultDialog";
import ManualBracketEditor from "@/components/ManualBracketEditor";

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
  scheduled_date: string | null;
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
  const [scheduleDialog, setScheduleDialog] = useState<{ isOpen: boolean; match: Match | null }>({
    isOpen: false,
    match: null,
  });
  const [scheduleDate, setScheduleDate] = useState("");

  // Admin controls state
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [doublesPartners, setDoublesPartners] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [showBracketEditor, setShowBracketEditor] = useState(false);

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

  const handleAddParticipants = async () => {
    if (selectedUserIds.length === 0) return;
    setActionLoading("add-participant");

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUserIds) {
        const body: { userId: string; partnerId?: string } = { userId };
        if (tournament?.type === "doubles" && doublesPartners[userId]) {
          body.partnerId = doublesPartners[userId];
        }

        const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        setToast({
          message: language === "de"
            ? `${successCount} Teilnehmer hinzugefügt`
            : `${successCount} participant${successCount > 1 ? 's' : ''} added`,
          type: "success"
        });
        setShowAddParticipant(false);
        setSelectedUserIds([]);
        setDoublesPartners({});
        await fetchTournament();
      }

      if (errorCount > 0 && successCount === 0) {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
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
    // For single elimination, show manual bracket editor
    if (tournament?.format === "single_elimination") {
      setShowBracketEditor(true);
      return;
    }

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

  const handleSaveManualBracket = async (matchSlots: { participant1: { id: string } | null; participant2: { id: string } | null }[]) => {
    setActionLoading("generate-matches");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualMatches: matchSlots }),
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Spielplan erstellt" : "Bracket created", type: "success" });
        setShowBracketEditor(false);
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
    // Admin can always edit (or when viewing as any user)
    if (isAdmin) return true;

    const effectiveUserId = currentUserId;
    if (!effectiveUserId) return false;

    const userParticipant = participants.find(
      (p) => p.user_id === effectiveUserId || p.partner_id === effectiveUserId
    );
    if (!userParticipant) return false;

    return (
      match.participant1_id === userParticipant.id ||
      match.participant2_id === userParticipant.id
    );
  };

  // For "View As" - check if the impersonated user can edit this match
  const canViewAsUserEditMatch = (match: Match) => {
    if (!viewAsUserId) return false;

    const userParticipant = participants.find(
      (p) => p.user_id === viewAsUserId || p.partner_id === viewAsUserId
    );
    if (!userParticipant) return false;

    return (
      match.participant1_id === userParticipant.id ||
      match.participant2_id === userParticipant.id
    );
  };

  const getViewAsUserName = () => {
    if (!viewAsUserId) return null;
    const participant = participants.find(
      (p) => p.user_id === viewAsUserId || p.partner_id === viewAsUserId
    );
    if (participant) {
      return `${participant.user_first_name} ${participant.user_last_name}`;
    }
    return null;
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

  const handleSaveSchedule = async (matchId: string, date: string | null) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: date }),
      });

      if (res.ok) {
        setToast({ message: t.tournament.scheduleSaved, type: "success" });
        await fetchTournament();
      } else {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setScheduleDialog({ isOpen: false, match: null });
      setScheduleDate("");
    }
  };

  const getRoundName = (match: Match): string => {
    if (match.stage === "group") {
      return language === "de"
        ? `Gruppe ${match.group_number} - Runde ${match.round}`
        : `Group ${match.group_number} - Round ${match.round}`;
    }
    // For knockout stages
    const totalKnockoutRounds = Math.max(...matches.filter(m => m.stage === "knockout").map(m => m.round));
    const roundFromEnd = totalKnockoutRounds - match.round + 1;

    if (roundFromEnd === 1) return language === "de" ? "Finale" : "Final";
    if (roundFromEnd === 2) return language === "de" ? "Halbfinale" : "Semifinal";
    if (roundFromEnd === 3) return language === "de" ? "Viertelfinale" : "Quarterfinal";
    return language === "de" ? `Runde ${match.round}` : `Round ${match.round}`;
  };

  const openScheduleDialog = (match: Match) => {
    // Navigate to booking page with tournament match context
    const p1Name = getParticipantName(match.participant1);
    const p2Name = getParticipantName(match.participant2);
    const roundName = getRoundName(match);
    const params = new URLSearchParams({
      tournamentId,
      matchId: match.id,
      tournamentName: tournament?.name || "",
      roundName,
      matchInfo: `${p1Name} vs ${p2Name}`,
    });
    router.push(`/book?${params.toString()}`);
  };

  const formatScheduledDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "de" ? "de-CH" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
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
    // Only show standings tab for round_robin and group_knockout formats
    ...(tournament.format !== "single_elimination"
      ? [{ id: "standings" as Tab, label: t.tournament.standings }]
      : []),
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

      {showBracketEditor && tournament && (
        <ManualBracketEditor
          participants={participants}
          tournamentType={tournament.type}
          tournamentFormat={tournament.format}
          onSave={handleSaveManualBracket}
          onCancel={() => setShowBracketEditor(false)}
          loading={actionLoading === "generate-matches"}
        />
      )}

      {/* Schedule Match Modal */}
      {scheduleDialog.isOpen && scheduleDialog.match && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setScheduleDialog({ isOpen: false, match: null });
              setScheduleDate("");
            }}
          />
          <div className="relative w-full max-w-sm card-elevated p-6 animate-scale-in">
            <h3 className="font-serif text-xl text-[var(--stone-900)] mb-4">
              {t.tournament.schedule}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-[var(--stone-600)] mb-3">
                {getParticipantName(scheduleDialog.match.participant1)} vs {getParticipantName(scheduleDialog.match.participant2)}
              </p>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                {t.booking.date}
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setScheduleDialog({ isOpen: false, match: null });
                  setScheduleDate("");
                }}
                className="flex-1 btn-secondary"
              >
                {t.booking.cancelDialog}
              </button>
              {scheduleDialog.match.scheduled_date && (
                <button
                  onClick={() => handleSaveSchedule(scheduleDialog.match!.id, null)}
                  className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-red-50"
                  style={{ color: "#dc2626" }}
                >
                  {t.tournament.clearSchedule}
                </button>
              )}
              <button
                onClick={() => handleSaveSchedule(scheduleDialog.match!.id, scheduleDate || null)}
                disabled={!scheduleDate}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {t.tournament.setSchedule}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddParticipant(false)}
          />
          <div className="relative w-full max-w-lg card-elevated p-6 animate-scale-in max-h-[80vh] flex flex-col">
            <h3 className="font-serif text-xl text-[var(--stone-900)] mb-4">
              {language === "de" ? "Teilnehmer hinzufügen" : "Add Participants"}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {availableUsers.length === 0 ? (
                <p className="text-center text-[var(--stone-500)] py-4">
                  {language === "de" ? "Keine Spieler verfügbar" : "No players available"}
                </p>
              ) : (
                availableUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-[var(--forest-400)] bg-[var(--forest-50)]"
                          : "border-[var(--stone-200)] hover:border-[var(--stone-300)]"
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-[var(--forest-600)] bg-[var(--forest-600)]"
                              : "border-[var(--stone-300)]"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-[var(--stone-800)]">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedUserIds.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--cream-100)]">
                <span className="text-sm text-[var(--stone-600)]">
                  {language === "de"
                    ? `${selectedUserIds.length} Spieler ausgewählt`
                    : `${selectedUserIds.length} player${selectedUserIds.length > 1 ? 's' : ''} selected`}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddParticipant(false);
                  setSelectedUserIds([]);
                }}
                className="flex-1 btn-secondary"
              >
                {t.booking.cancelDialog}
              </button>
              <button
                onClick={handleAddParticipants}
                disabled={selectedUserIds.length === 0 || actionLoading === "add-participant"}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {actionLoading === "add-participant"
                  ? "..."
                  : language === "de"
                  ? `${selectedUserIds.length > 0 ? selectedUserIds.length + ' ' : ''}Hinzufügen`
                  : `Add${selectedUserIds.length > 0 ? ' ' + selectedUserIds.length : ''}`}
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

            {/* View As dropdown */}
            {participants.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-[var(--stone-500)]">
                  {t.tournament.viewAs}:
                </label>
                <select
                  value={viewAsUserId || ""}
                  onChange={(e) => setViewAsUserId(e.target.value || null)}
                  className="select-field select-field-sm min-w-[200px]"
                >
                  <option value="">{t.tournament.viewAsAll}</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.user_id}>
                      {p.user_first_name} {p.user_last_name}
                      {p.partner_first_name && ` / ${p.partner_first_name} ${p.partner_last_name}`}
                    </option>
                  ))}
                </select>
              </div>
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
              matches.map((match) => {
                const isViewAsUserMatch = canViewAsUserEditMatch(match);
                return (
                <div
                  key={match.id}
                  className={`card-elevated p-4 flex items-center justify-between ${
                    isViewAsUserMatch ? "ring-2 ring-[var(--terracotta-300)] bg-[var(--terracotta-50)]" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-[var(--stone-500)] mb-1">
                      {match.stage === "group" && (
                        <span>{t.tournament.group} {match.group_number}</span>
                      )}
                      <span>
                        {t.tournament.round} {match.round}
                      </span>
                      {match.scheduled_date && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--forest-600)]">
                            {formatScheduledDate(match.scheduled_date)}
                          </span>
                        </>
                      )}
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
                        onClick={() => openScheduleDialog(match)}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--terracotta-50)]"
                        style={{ color: "var(--terracotta-500)" }}
                      >
                        {t.tournament.schedule}
                      </button>
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
              );})
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
