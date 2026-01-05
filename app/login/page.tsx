"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createBrowserSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(t.login.invalidCredentials);
    } else {
      router.push("/book");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--forest-700) 100%)',
              boxShadow: '0 4px 20px rgba(45, 74, 56, 0.25)',
            }}
          >
            {/* Tennis racket icon */}
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="10" cy="8" rx="6" ry="7" />
              <line x1="10" y1="1" x2="10" y2="15" />
              <line x1="4" y1="8" x2="16" y2="8" />
              <line x1="5.5" y1="4" x2="14.5" y2="12" />
              <line x1="5.5" y1="12" x2="14.5" y2="4" />
              <line x1="10" y1="15" x2="18" y2="23" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-[var(--stone-900)]">{t.login.title}</h1>
          <p className="text-[var(--stone-500)] mt-2">{t.login.subtitle}</p>
        </div>

        {/* Form Card */}
        <div className="card-elevated p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.login.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder={t.login.emailPlaceholder}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.login.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={t.login.passwordPlaceholder}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  {t.login.submitting}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  {t.login.submit}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-[var(--stone-500)]">
          {t.login.noAccount}{" "}
          <Link
            href="/register"
            className="font-medium transition-colors"
            style={{ color: 'var(--forest-600)' }}
          >
            {t.login.createOne}
          </Link>
        </p>

        {/* Decorative element */}
        <div className="mt-12 flex justify-center">
          <div className="tennis-ball opacity-50" />
        </div>
      </div>
    </div>
  );
}
