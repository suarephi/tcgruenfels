"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";

interface Participant {
  id: string;
  user_first_name?: string;
  user_last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
}

interface MatchSlot {
  participant1: Participant | null;
  participant2: Participant | null;
}

interface ManualBracketEditorProps {
  participants: Participant[];
  tournamentType: "singles" | "doubles";
  tournamentFormat: "round_robin" | "single_elimination" | "group_knockout";
  onSave: (matches: MatchSlot[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ManualBracketEditor({
  participants,
  tournamentFormat,
  onSave,
  onCancel,
  loading,
}: ManualBracketEditorProps) {
  const { language } = useLanguage();

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)));
  const numMatches = bracketSize / 2;

  // Initialize matches with empty slots
  const [matches, setMatches] = useState<MatchSlot[]>(() =>
    Array.from({ length: numMatches }, () => ({ participant1: null, participant2: null }))
  );

  // Track which participants are assigned
  const getUnassignedParticipants = useCallback(() => {
    const assigned = new Set<string>();
    matches.forEach((match) => {
      if (match.participant1) assigned.add(match.participant1.id);
      if (match.participant2) assigned.add(match.participant2.id);
    });
    return participants.filter((p) => !assigned.has(p.id));
  }, [matches, participants]);

  const getParticipantName = (p: Participant): string => {
    const name = `${p.user_first_name || ""} ${p.user_last_name || ""}`.trim();
    if (p.partner_first_name) {
      const partnerName = `${p.partner_first_name} ${p.partner_last_name || ""}`.trim();
      return `${name} / ${partnerName}`;
    }
    return name || "Unknown";
  };

  const handleDragStart = (e: React.DragEvent, participant: Participant) => {
    e.dataTransfer.setData("participantId", participant.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, matchIndex: number, slot: "participant1" | "participant2") => {
    e.preventDefault();
    const participantId = e.dataTransfer.getData("participantId");

    // Handle "BYE" drag
    if (participantId === "BYE") {
      setMatches((prev) => {
        const newMatches = [...prev];
        newMatches[matchIndex] = { ...newMatches[matchIndex], [slot]: null };
        return newMatches;
      });
      return;
    }

    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Remove participant from any existing slot
    setMatches((prev) => {
      const newMatches = prev.map((match) => ({
        participant1: match.participant1?.id === participantId ? null : match.participant1,
        participant2: match.participant2?.id === participantId ? null : match.participant2,
      }));

      // Add to new slot
      newMatches[matchIndex] = { ...newMatches[matchIndex], [slot]: participant };
      return newMatches;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const removeFromSlot = (matchIndex: number, slot: "participant1" | "participant2") => {
    setMatches((prev) => {
      const newMatches = [...prev];
      newMatches[matchIndex] = { ...newMatches[matchIndex], [slot]: null };
      return newMatches;
    });
  };

  const autoAssign = () => {
    // Auto-assign remaining participants to empty slots
    const unassigned = [...getUnassignedParticipants()];
    const newMatches = [...matches];

    // First fill all first slots, then second slots
    for (let i = 0; i < newMatches.length && unassigned.length > 0; i++) {
      if (!newMatches[i].participant1) {
        newMatches[i].participant1 = unassigned.shift() || null;
      }
    }
    for (let i = 0; i < newMatches.length && unassigned.length > 0; i++) {
      if (!newMatches[i].participant2) {
        newMatches[i].participant2 = unassigned.shift() || null;
      }
    }

    setMatches(newMatches);
  };

  const clearAll = () => {
    setMatches(Array.from({ length: numMatches }, () => ({ participant1: null, participant2: null })));
  };

  const canSave = () => {
    // For single elimination, we need at least some matches to have participants
    const filledMatches = matches.filter((m) => m.participant1 || m.participant2);
    return filledMatches.length > 0;
  };

  const unassigned = getUnassignedParticipants();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-4xl card-elevated overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="p-6"
          style={{
            background: "linear-gradient(135deg, var(--forest-700) 0%, var(--forest-800) 100%)",
          }}
        >
          <h2 className="font-serif text-2xl text-white">
            {language === "de" ? "Spielplan manuell erstellen" : "Create Bracket Manually"}
          </h2>
          <p className="text-[var(--forest-200)] mt-1">
            {language === "de"
              ? "Ziehe Spieler in die Slots oder weise Freilose zu"
              : "Drag players into slots or assign byes"}
          </p>
        </div>

        {/* Content - Two column layout with fixed left, scrollable right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Fixed participants */}
          <div className="w-72 flex-shrink-0 border-r border-[var(--stone-200)] p-4 overflow-y-auto bg-[var(--cream-50)]">
            <h3 className="font-medium text-[var(--stone-800)] mb-3 sticky top-0 bg-[var(--cream-50)] py-1">
              {language === "de" ? "Verfügbare Spieler" : "Available Players"}
              <span className="text-sm text-[var(--stone-500)] ml-2">({unassigned.length})</span>
            </h3>

            <div className="space-y-2 mb-4">
              {unassigned.length === 0 ? (
                <p className="text-sm text-[var(--stone-400)] text-center py-4">
                  {language === "de" ? "Alle Spieler zugewiesen" : "All players assigned"}
                </p>
              ) : (
                unassigned.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p)}
                    className="px-3 py-2 rounded-lg bg-white border border-[var(--stone-200)] cursor-grab active:cursor-grabbing hover:border-[var(--forest-400)] hover:shadow-sm transition-all text-sm"
                  >
                    <span className="font-medium text-[var(--stone-700)]">
                      {getParticipantName(p)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Bye marker */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[var(--stone-600)] mb-2">
                {language === "de" ? "Freilos (Bye)" : "Bye"}
              </h4>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("participantId", "BYE");
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="px-3 py-2 rounded-lg border-2 border-dashed border-[var(--terracotta-300)] bg-[var(--terracotta-50)] cursor-grab active:cursor-grabbing text-center"
              >
                <span className="text-sm text-[var(--terracotta-600)] font-medium">
                  {language === "de" ? "Freilos" : "Bye"}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={autoAssign}
                disabled={unassigned.length === 0}
                className="w-full text-sm font-medium px-3 py-2 rounded-lg bg-[var(--forest-100)] text-[var(--forest-700)] hover:bg-[var(--forest-200)] disabled:opacity-50 transition-all"
              >
                {language === "de" ? "Auto-Zuweisen" : "Auto-Assign"}
              </button>
              <button
                onClick={clearAll}
                className="w-full text-sm font-medium px-3 py-2 rounded-lg bg-[var(--stone-100)] text-[var(--stone-600)] hover:bg-[var(--stone-200)] transition-all"
              >
                {language === "de" ? "Zurücksetzen" : "Clear All"}
              </button>
            </div>
          </div>

          {/* Right Panel - Scrollable match slots */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-medium text-[var(--stone-800)] mb-3">
              {language === "de" ? "Spielpaarungen (Runde 1)" : "Match Pairings (Round 1)"}
              <span className="text-sm text-[var(--stone-500)] ml-2">({matches.length} {language === "de" ? "Spiele" : "matches"})</span>
            </h3>
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-[var(--stone-200)] bg-white"
                >
                  <div className="text-xs text-[var(--stone-500)] mb-2">
                    {language === "de" ? `Spiel ${index + 1}` : `Match ${index + 1}`}
                  </div>
                  <div className="space-y-2">
                    {/* Slot 1 */}
                    <div
                      onDrop={(e) => handleDrop(e, index, "participant1")}
                      onDragOver={handleDragOver}
                      className={`px-3 py-2 rounded-lg min-h-[40px] flex items-center justify-between transition-all ${
                        match.participant1
                          ? "bg-[var(--forest-50)] border border-[var(--forest-200)]"
                          : "border-2 border-dashed border-[var(--stone-200)] bg-[var(--cream-50)]"
                      }`}
                    >
                      {match.participant1 ? (
                        <>
                          <span className="font-medium text-[var(--stone-700)] text-sm">
                            {getParticipantName(match.participant1)}
                          </span>
                          <button
                            onClick={() => removeFromSlot(index, "participant1")}
                            className="text-[var(--stone-400)] hover:text-[var(--terracotta-500)]"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-[var(--stone-400)]">
                          {language === "de" ? "Spieler hierher ziehen" : "Drop player here"}
                        </span>
                      )}
                    </div>

                    <div className="text-center text-xs text-[var(--stone-400)]">vs</div>

                    {/* Slot 2 */}
                    <div
                      onDrop={(e) => handleDrop(e, index, "participant2")}
                      onDragOver={handleDragOver}
                      className={`px-3 py-2 rounded-lg min-h-[40px] flex items-center justify-between transition-all ${
                        match.participant2
                          ? "bg-[var(--forest-50)] border border-[var(--forest-200)]"
                          : "border-2 border-dashed border-[var(--stone-200)] bg-[var(--cream-50)]"
                      }`}
                    >
                      {match.participant2 ? (
                        <>
                          <span className="font-medium text-[var(--stone-700)] text-sm">
                            {getParticipantName(match.participant2)}
                          </span>
                          <button
                            onClick={() => removeFromSlot(index, "participant2")}
                            className="text-[var(--stone-400)] hover:text-[var(--terracotta-500)]"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-[var(--stone-400)]">
                          {language === "de" ? "Spieler hierher ziehen" : "Drop player here"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-[var(--stone-100)]" style={{ background: "var(--cream-50)" }}>
          <button onClick={onCancel} disabled={loading} className="btn-secondary disabled:opacity-50">
            {language === "de" ? "Abbrechen" : "Cancel"}
          </button>
          <button
            onClick={() => onSave(matches)}
            disabled={loading || !canSave()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }}
                />
                {language === "de" ? "Speichere..." : "Saving..."}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {language === "de" ? "Spielplan erstellen" : "Create Bracket"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
