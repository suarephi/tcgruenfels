"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  username: string;
  is_admin: boolean;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, is_admin")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/book" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">{t.nav.title}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setLanguage("de")}
                className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                  language === "de"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                DE
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                  language === "en"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                EN
              </button>
            </div>

            {!loading && user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-700 font-medium">
                      {profile?.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <span>{profile?.username || user.email}</span>
                  {profile?.is_admin && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                      Admin
                    </span>
                  )}
                </div>
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium px-3 py-1.5 rounded-lg hover:bg-amber-50 transition"
                  >
                    {t.nav.admin}
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  {t.nav.signOut}
                </button>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  {t.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-1.5 rounded-lg transition shadow-sm hidden sm:block"
                >
                  {t.nav.getStarted}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
