"use client";

import { useState, useEffect } from "react";
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
}

interface MatchResultDialogProps {
  isOpen: boolean;
  match: Match;
  participants: Participant[];
  onSave: (matchId: string, score: string, winnerId: string) => void;
  onCancel: () => void;
}

export default function MatchResultDialog({
  isOpen,
  match,
  participants,
  onSave,
  onCancel,
}: MatchResultDialogProps) {
  const { t, language } = useLanguage();

  const p1 = participants.find((p) => p.id === match.participant1_id);
  const p2 = participants.find((p) => p.id === match.participant2_id);

  // Check if this is a bye match (one participant is null)
  const isByeMatch = !match.participant1_id || !match.participant2_id;
  const byeWinnerId = isByeMatch
    ? (match.participant1_id || match.participant2_id || "")
    : "";

  const [score, setScore] = useState(match.score || (isByeMatch ? "Freilos" : ""));
  const [winnerId, setWinnerId] = useState(match.winner_id || byeWinnerId);
  const [saving, setSaving] = useState(false);

  // Auto-set winner for bye matches
  useEffect(() => {
    if (isByeMatch && byeWinnerId && !winnerId) {
      setWinnerId(byeWinnerId);
      setScore("Freilos");
    }
  }, [isByeMatch, byeWinnerId, winnerId]);

  if (!isOpen) return null;

  const getParticipantName = (participant?: Participant) => {
    if (!participant) return "Unknown";
    const name = `${participant.user_first_name || ""} ${participant.user_last_name || ""}`.trim();
    if (participant.partner_first_name) {
      const partnerName = `${participant.partner_first_name} ${participant.partner_last_name || ""}`.trim();
      return `${name} / ${partnerName}`;
    }
    return name || "Unknown";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score.trim() || !winnerId) return;

    setSaving(true);
    await onSave(match.id, score.trim(), winnerId);
    setSaving(false);
  };

  // For bye matches, show simplified UI
  if (isByeMatch) {
    const byeWinner = p1 || p2;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md card-elevated p-6 animate-scale-in">
          <h2 className="font-serif text-xl text-[var(--stone-900)] mb-4">
            {language === "de" ? "Freilos bestätigen" : "Confirm Bye"}
          </h2>

          <div className="mb-6 p-4 rounded-lg bg-[var(--forest-50)] border border-[var(--forest-200)]">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[var(--forest-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-[var(--forest-700)]">
                  {getParticipantName(byeWinner)}
                </p>
                <p className="text-sm text-[var(--forest-600)]">
                  {language === "de" ? "kommt weiter (Freilos)" : "advances (bye)"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 btn-secondary"
            >
              {t.booking.cancelDialog}
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                await onSave(match.id, "Freilos", byeWinnerId);
                setSaving(false);
              }}
              disabled={saving}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {saving ? "..." : (language === "de" ? "Bestätigen" : "Confirm")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md card-elevated p-6 animate-scale-in">
        <h2 className="font-serif text-xl text-[var(--stone-900)] mb-4">
          {t.tournament.enterScore}
        </h2>

        {/* Match info */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--cream-100)]">
          <div className="flex items-center justify-center gap-4 text-[var(--stone-700)]">
            <span className="font-medium text-right flex-1">
              {getParticipantName(p1)}
            </span>
            <span className="text-[var(--stone-400)]">{t.tournament.vs}</span>
            <span className="font-medium text-left flex-1">
              {getParticipantName(p2)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Score input */}
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
              {t.tournament.score}
            </label>
            <input
              type="text"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={t.tournament.scorePlaceholder}
              className="input-field"
              required
            />
            <p className="text-xs text-[var(--stone-500)] mt-1">
              Format: 6-4, 3-6, 7-5
            </p>
          </div>

          {/* Winner selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
              {t.tournament.selectWinner}
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  winnerId === match.participant1_id
                    ? "border-[var(--forest-400)] bg-[var(--forest-50)]"
                    : "border-[var(--stone-200)] hover:border-[var(--stone-300)]"
                }`}
              >
                <input
                  type="radio"
                  name="winner"
                  value={match.participant1_id || ""}
                  checked={winnerId === match.participant1_id}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    winnerId === match.participant1_id
                      ? "border-[var(--forest-600)]"
                      : "border-[var(--stone-300)]"
                  }`}
                >
                  {winnerId === match.participant1_id && (
                    <div className="w-2 h-2 rounded-full bg-[var(--forest-600)]" />
                  )}
                </div>
                <span className="font-medium text-[var(--stone-800)]">
                  {getParticipantName(p1)}
                </span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  winnerId === match.participant2_id
                    ? "border-[var(--forest-400)] bg-[var(--forest-50)]"
                    : "border-[var(--stone-200)] hover:border-[var(--stone-300)]"
                }`}
              >
                <input
                  type="radio"
                  name="winner"
                  value={match.participant2_id || ""}
                  checked={winnerId === match.participant2_id}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    winnerId === match.participant2_id
                      ? "border-[var(--forest-600)]"
                      : "border-[var(--stone-300)]"
                  }`}
                >
                  {winnerId === match.participant2_id && (
                    <div className="w-2 h-2 rounded-full bg-[var(--forest-600)]" />
                  )}
                </div>
                <span className="font-medium text-[var(--stone-800)]">
                  {getParticipantName(p2)}
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 btn-secondary"
            >
              {t.booking.cancelDialog}
            </button>
            <button
              type="submit"
              disabled={saving || !score.trim() || !winnerId}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {saving ? "..." : t.tournament.saveResult}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
