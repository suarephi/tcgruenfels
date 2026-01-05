"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createBrowserSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError(t.register.passwordsMismatch);
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError(t.register.nameRequired);
      return;
    }

    if (password.length < 6) {
      setError(t.register.passwordMinLength);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        setError(t.register.emailTaken);
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(t.register.checkEmail);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}
      {success && (
        <Toast message={success} type="success" onClose={() => setSuccess("")} />
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
            {/* User plus icon */}
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-[var(--stone-900)]">{t.register.title}</h1>
          <p className="text-[var(--stone-500)] mt-2">{t.register.subtitle}</p>
        </div>

        {/* Form Card */}
        <div className="card-elevated p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.register.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder={t.register.emailPlaceholder}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                  {t.register.firstName}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field"
                  placeholder={t.register.firstNamePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                  {t.register.lastName}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field"
                  placeholder={t.register.lastNamePlaceholder}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.register.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={t.register.passwordPlaceholder}
                required
                minLength={6}
              />
              <p className="text-xs text-[var(--stone-400)] mt-1.5">{t.register.passwordHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.register.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder={t.register.confirmPasswordPlaceholder}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  {t.register.submitting}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {t.register.submit}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-[var(--stone-500)]">
          {t.register.hasAccount}{" "}
          <Link
            href="/login"
            className="font-medium transition-colors"
            style={{ color: 'var(--forest-600)' }}
          >
            {t.register.signIn}
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
