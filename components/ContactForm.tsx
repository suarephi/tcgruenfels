"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Senden fehlgeschlagen.");
      }
      setDone(true);
      setName("");
      setEmail("");
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
          Wir haben deine Nachricht erhalten und melden uns in Kürze.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
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
      <div>
        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
          Nachricht
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="input-field w-full"
          placeholder="Wie können wir helfen?"
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
        {submitting ? "Wird gesendet…" : "Nachricht senden"}
      </button>
    </form>
  );
}
