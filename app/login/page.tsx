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
          <img
            src="/logo.png"
            alt="TC Grünfels"
            className="h-20 w-auto mx-auto mb-5"
          />
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
