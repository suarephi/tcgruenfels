"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "tcgf-invoice-2026-seen-";

export default function InvoiceAnnouncement({ userId }: { userId: string | null }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;
    try {
      setDismissed(Boolean(window.localStorage.getItem(STORAGE_KEY_PREFIX + userId)));
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  const dismiss = () => {
    if (userId) {
      try {
        window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, "1");
      } catch {}
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="mb-6 p-4 rounded-xl animate-fade-in flex items-start justify-between gap-3"
      style={{
        background: "linear-gradient(135deg, var(--terracotta-500) 0%, var(--terracotta-400) 100%)",
        border: "1px solid var(--terracotta-600)",
        color: "white",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.95)" }}>
          <div className="font-semibold mb-0.5" style={{ color: "white" }}>
            Mitgliederbeiträge 2026 versandt
          </div>
          <div>
            Die Rechnung für die Saison 2026 wurde per E-Mail verschickt. Bitte prüfe dein Postfach. Fragen an{" "}
            <a href="mailto:info@tcgf.ch" className="underline" style={{ color: "white" }}>
              info@tcgf.ch
            </a>
            .
          </div>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Schliessen"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
