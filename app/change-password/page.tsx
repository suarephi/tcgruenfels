"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createBrowserSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t.changePassword.passwordsMismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.changePassword.passwordMinLength);
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/book");
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}

      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, var(--forest-600) 0%, var(--forest-700) 100%)",
              boxShadow: "0 4px 20px rgba(45, 74, 56, 0.25)",
            }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3zm-6 0h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-[var(--stone-900)]">{t.changePassword.title}</h1>
          <p className="text-[var(--stone-500)] mt-2">{t.changePassword.subtitle}</p>
        </div>

        <div className="card-elevated p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.changePassword.newPassword}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={t.changePassword.newPasswordPlaceholder}
                required
                minLength={6}
              />
              <p className="text-xs text-[var(--stone-400)] mt-1.5">{t.changePassword.passwordHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.changePassword.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder={t.changePassword.confirmPasswordPlaceholder}
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
                    style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }}
                  />
                  {t.changePassword.submitting}
                </>
              ) : (
                t.changePassword.submit
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="tennis-ball opacity-50" />
        </div>
      </div>
    </div>
  );
}
