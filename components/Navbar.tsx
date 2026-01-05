"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  first_name: string;
  last_name: string;
  is_admin: boolean;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
          .select("first_name, last_name, is_admin")
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
    <nav className="sticky top-0 z-40 backdrop-blur-nav border-b border-[var(--stone-200)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/book" className="flex items-center gap-3 group">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--forest-700) 100%)',
                  boxShadow: '0 2px 8px rgba(45, 74, 56, 0.25)',
                }}
              >
                {/* Tennis racket icon */}
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="10" cy="8" rx="6" ry="7" />
                  <line x1="10" y1="1" x2="10" y2="15" />
                  <line x1="4" y1="8" x2="16" y2="8" />
                  <line x1="5.5" y1="4" x2="14.5" y2="12" />
                  <line x1="5.5" y1="12" x2="14.5" y2="4" />
                  <line x1="10" y1="15" x2="18" y2="23" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-serif text-xl text-[var(--stone-900)] tracking-tight">
                {t.nav.title}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher */}
            <div
              className="flex items-center p-1 rounded-lg"
              style={{ background: 'var(--cream-200)' }}
            >
              <button
                onClick={() => setLanguage("de")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === "de"
                    ? "bg-white text-[var(--stone-900)] shadow-sm"
                    : "text-[var(--stone-500)] hover:text-[var(--stone-700)]"
                }`}
              >
                DE
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === "en"
                    ? "bg-white text-[var(--stone-900)] shadow-sm"
                    : "text-[var(--stone-500)] hover:text-[var(--stone-700)]"
                }`}
              >
                EN
              </button>
            </div>

            {!loading && user ? (
              <>
                {/* User info - Desktop */}
                <div className="hidden md:flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)',
                    }}
                  >
                    <span className="text-white font-semibold text-sm">
                      {profile?.first_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--stone-800)]">
                      {profile ? `${profile.first_name} ${profile.last_name}` : user.email}
                    </span>
                    {profile?.is_admin && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--terracotta-600)' }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin Link */}
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--cream-200)]"
                    style={{ color: 'var(--terracotta-600)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t.nav.admin}
                  </Link>
                )}

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all text-[var(--stone-600)] hover:text-[var(--stone-900)] hover:bg-[var(--cream-200)]"
                >
                  {t.nav.signOut}
                </button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-[var(--cream-200)] transition"
                >
                  <svg className="w-5 h-5 text-[var(--stone-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {menuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            ) : !loading ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all text-[var(--stone-600)] hover:text-[var(--stone-900)] hover:bg-[var(--cream-200)]"
                >
                  {t.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="btn-primary text-sm hidden sm:block"
                >
                  {t.nav.getStarted}
                </Link>
              </div>
            ) : (
              <div className="skeleton w-24 h-8" />
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && user && (
          <div
            className="md:hidden py-4 border-t border-[var(--stone-200)] animate-slide-down"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)',
                }}
              >
                <span className="text-white font-semibold">
                  {profile?.first_name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <div className="font-medium text-[var(--stone-800)]">
                  {profile ? `${profile.first_name} ${profile.last_name}` : user.email}
                </div>
                {profile?.is_admin && (
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--terracotta-600)' }}
                  >
                    Admin
                  </span>
                )}
              </div>
            </div>

            {profile?.is_admin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-[var(--terracotta-600)] font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t.nav.admin}
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
