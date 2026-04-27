"use client";

import { useState } from "react";

type RequestType = "general" | "membership";
type MembershipType = "einzel" | "familie";

export default function ContactForm() {
  const [type, setType] = useState<RequestType>("general");
  const [membershipType, setMembershipType] = useState<MembershipType>("einzel");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isMembership = type === "membership";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          email,
          phone,
          subject,
          message,
          membershipType: type === "membership" ? membershipType : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Senden fehlgeschlagen.");
      }
      setDone(true);
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card-elevated p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
          Danke!
        </h3>
        <p className="text-[var(--stone-500)] text-sm">
          {isMembership
            ? "Deine Mitgliedschaftsanfrage ist eingegangen. Der Vorstand meldet sich in Kürze."
            : "Wir haben deine Nachricht erhalten und melden uns in Kürze."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[var(--cream-100)]">
        <button
          type="button"
          onClick={() => setType("general")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            type === "general"
              ? "bg-white text-[var(--stone-800)] shadow-sm"
              : "text-[var(--stone-500)] hover:text-[var(--stone-700)]"
          }`}
        >
          Allgemeine Anfrage
        </button>
        <button
          type="button"
          onClick={() => setType("membership")}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
            type === "membership"
              ? "bg-white text-[var(--stone-800)] shadow-sm"
              : "text-[var(--stone-500)] hover:text-[var(--stone-700)]"
          }`}
        >
          Mitgliedschaft
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full"
          placeholder="Vor- und Nachname"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
          E-Mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field w-full"
          placeholder="dein@example.com"
        />
      </div>

      {isMembership && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
              Mitgliedschaftsart
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMembershipType("einzel")}
                className={`px-3 py-3 text-sm rounded-lg border transition-all text-left ${
                  membershipType === "einzel"
                    ? "border-[var(--forest-600)] bg-[var(--forest-50)]"
                    : "border-[var(--stone-200)] hover:border-[var(--stone-300)]"
                }`}
              >
                <div className="font-medium text-[var(--stone-800)]">Einzel</div>
                <div className="text-xs text-[var(--stone-500)]">CHF 430</div>
              </button>
              <button
                type="button"
                onClick={() => setMembershipType("familie")}
                className={`px-3 py-3 text-sm rounded-lg border transition-all text-left ${
                  membershipType === "familie"
                    ? "border-[var(--forest-600)] bg-[var(--forest-50)]"
                    : "border-[var(--stone-200)] hover:border-[var(--stone-300)]"
                }`}
              >
                <div className="font-medium text-[var(--stone-800)]">Familie</div>
                <div className="text-xs text-[var(--stone-500)]">CHF 550</div>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field w-full"
              placeholder="Optional"
            />
          </div>
        </>
      )}

      {!isMembership && (
        <div>
          <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
            Betreff
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field w-full"
            placeholder="Optional"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
          {isMembership ? "Über mich" : "Nachricht"}
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="input-field w-full"
          placeholder={
            isMembership
              ? "Geburtsjahr, Spielstärke, gewünschte Mitgliedschaftsart, kurze Vorstellung…"
              : "Wie können wir helfen?"
          }
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--terracotta-700)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full disabled:opacity-50"
      >
        {submitting
          ? "Wird gesendet…"
          : isMembership
          ? "Mitgliedschaft anfragen"
          : "Nachricht senden"}
      </button>
    </form>
  );
}
