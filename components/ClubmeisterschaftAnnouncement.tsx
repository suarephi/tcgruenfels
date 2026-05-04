"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "tcgf-cm26-announcement-seen-";

export default function ClubmeisterschaftAnnouncement({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY_PREFIX + userId)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, [userId]);

  const dismiss = () => {
    if (userId) {
      try {
        window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, "1");
      } catch {}
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(28, 22, 16, 0.55)" }}
      onClick={dismiss}
    >
      <div
        className="card-elevated w-full max-w-md p-6 sm:p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Schliessen"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--stone-400)] hover:text-[var(--stone-600)] hover:bg-[var(--stone-100)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--terracotta-200) 0%, var(--terracotta-100) 100%)",
            }}
          >
            <span className="text-xl">🏆</span>
          </div>
          <h2 className="font-serif text-xl text-[var(--stone-900)]">
            Clubmeisterschaft 2026
          </h2>
        </div>

        <div className="space-y-3 text-[var(--stone-700)] leading-relaxed text-sm">
          <p>
            Die Tableaus für <strong>Einzel</strong> und <strong>Doppel</strong> sind aufgeschaltet.
          </p>
          <p>
            Du kannst deine Spiele direkt hier auf der Plattform planen und nach dem Match das
            Resultat selber eintragen.
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--stone-600)]">
            <li>Spiel suchen unter <strong>Turniere</strong></li>
            <li>Spielzeit über <strong>Termin planen</strong> reservieren</li>
            <li>Nach dem Spiel <strong>Resultat eintragen</strong> klicken</li>
          </ul>
          <p className="text-[var(--stone-600)]">
            Viel Spass und gutes Tennis!
          </p>
        </div>

        <button
          onClick={dismiss}
          className="btn-primary w-full mt-5"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
