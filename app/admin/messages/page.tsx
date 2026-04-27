"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  type: "general" | "membership" | null;
  membership_type: "einzel" | "familie" | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  created_at: string;
}

const MEMBERSHIP_LABEL: Record<"einzel" | "familie", string> = {
  einzel: "Einzelmitgliedschaft (CHF 430)",
  familie: "Familienmitgliedschaft (CHF 550)",
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages");
      if (res.status === 401 || res.status === 403) {
        router.push("/book");
        return;
      }
      if (!res.ok) throw new Error("Laden fehlgeschlagen.");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const deleteMessage = async (id: string) => {
    if (!confirm("Diese Nachricht wirklich löschen?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen.");
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("de-CH", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="py-12">
        <div className="card-elevated p-8 text-center">
          <p className="text-[var(--stone-500)]">Lade Nachrichten…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--stone-800)]">
            Kontaktnachrichten
          </h1>
          <p className="text-sm text-[var(--stone-500)] mt-1">
            {messages.length}{" "}
            {messages.length === 1 ? "Nachricht" : "Nachrichten"} insgesamt
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-sm">
          Zurück zum Admin
        </Link>
      </div>

      {error && (
        <div
          className="card-elevated p-4 text-sm"
          style={{ color: "var(--terracotta-700)" }}
        >
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <p className="text-[var(--stone-500)]">
            Noch keine Nachrichten eingegangen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="card-elevated p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {m.type === "membership" && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--terracotta-100)",
                          color: "var(--terracotta-700)",
                        }}
                      >
                        Mitgliedschaft
                      </span>
                    )}
                    <span className="font-medium text-[var(--stone-800)]">
                      {m.name}
                    </span>
                  </div>
                  <a
                    href={`mailto:${m.email}`}
                    className="text-sm text-[var(--stone-500)] hover:underline block"
                  >
                    {m.email}
                  </a>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      className="text-sm text-[var(--stone-500)] hover:underline"
                    >
                      {m.phone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--stone-400)]">
                    {formatDate(m.created_at)}
                  </div>
                  <button
                    onClick={() => deleteMessage(m.id)}
                    disabled={actionLoading === m.id}
                    className="text-xs font-medium mt-2 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                    style={{ color: "#dc2626" }}
                  >
                    {actionLoading === m.id ? "…" : "Löschen"}
                  </button>
                </div>
              </div>
              {m.membership_type && (
                <div className="text-sm font-medium text-[var(--stone-700)] mb-2">
                  Gewünscht: {MEMBERSHIP_LABEL[m.membership_type]}
                </div>
              )}
              {m.subject && (
                <div className="text-sm font-medium text-[var(--stone-700)] mb-2">
                  Betreff: {m.subject}
                </div>
              )}
              <p className="text-sm text-[var(--stone-700)] whitespace-pre-wrap leading-relaxed">
                {m.message}
              </p>
              <div className="mt-3">
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Anfrage TC Grünfels")}`}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "var(--forest-600)" }}
                >
                  Antworten →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
