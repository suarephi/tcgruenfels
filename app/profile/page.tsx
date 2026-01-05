"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";

interface Profile {
  first_name: string;
  last_name: string;
  is_admin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setToast({ message: language === "de" ? "Fehler beim Speichern" : "Error saving", type: "error" });
    } else {
      setToast({ message: language === "de" ? "Profil gespeichert" : "Profile saved", type: "success" });
      setProfile(prev => prev ? { ...prev, first_name: firstName, last_name: lastName } : null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: '3px solid var(--forest-100)',
              borderTopColor: 'var(--forest-600)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 max-w-2xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)',
            }}
          >
            <span className="text-white font-bold text-2xl">
              {firstName?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <h1 className="font-serif text-3xl text-[var(--stone-900)]">
              {t.nav.myProfile}
            </h1>
            <p className="text-[var(--stone-500)] mt-1">
              {language === "de" ? "Verwalte deine Kontodaten" : "Manage your account details"}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card-elevated p-6 animate-slide-up">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
              {language === "de" ? "E-Mail" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="input-field bg-[var(--cream-100)] text-[var(--stone-500)] cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
                {t.register.firstName}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
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
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
              {language === "de" ? "Mitglied seit" : "Member since"}
            </label>
            <div className="text-[var(--stone-600)]">
              {profile?.created_at ? formatDate(profile.created_at) : "—"}
            </div>
          </div>

          {profile?.is_admin && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: 'var(--terracotta-300)', color: 'white' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">
                {language === "de" ? "Administrator" : "Administrator"}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--stone-100)] flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                />
                {language === "de" ? "Speichern..." : "Saving..."}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {language === "de" ? "Speichern" : "Save"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
