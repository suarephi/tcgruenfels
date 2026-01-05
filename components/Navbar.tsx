"use client";

import { useEffect, useState, useRef } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
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
              <img
                src="https://static.wixstatic.com/media/4a3b62_9c37ebacfa734ca9a8c3f2f66666b015~mv2.png/v1/fill/w_168,h_128,al_c,lg_1,q_85,enc_avif,quality_auto/4a3b62_9c37ebacfa734ca9a8c3f2f66666b015~mv2.png"
                alt="TC Grünfels"
                className="h-10 w-auto transition-transform group-hover:scale-105"
              />
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
                {/* User Dropdown - Desktop */}
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-[var(--cream-200)]"
                  >
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
                    <div className="flex flex-col text-left">
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
                    <svg
                      className={`w-4 h-4 text-[var(--stone-400)] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 card-elevated py-2 animate-scale-in origin-top-right"
                    >
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--stone-700)] hover:bg-[var(--cream-100)] transition-colors"
                      >
                        <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.nav.myProfile}
                      </Link>
                      <Link
                        href="/my-bookings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--stone-700)] hover:bg-[var(--cream-100)] transition-colors"
                      >
                        <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t.nav.myBookings}
                      </Link>
                      <Link
                        href="/tournaments"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--stone-700)] hover:bg-[var(--cream-100)] transition-colors"
                      >
                        <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {t.nav.tournaments}
                      </Link>

                      {profile?.is_admin && (
                        <>
                          <div className="my-2 border-t border-[var(--stone-100)]" />
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-[var(--cream-100)] transition-colors"
                            style={{ color: 'var(--terracotta-600)' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t.nav.admin}
                          </Link>
                        </>
                      )}

                      <div className="my-2 border-t border-[var(--stone-100)]" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--stone-600)] hover:bg-[var(--cream-100)] transition-colors w-full"
                      >
                        <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t.nav.signOut}
                      </button>
                    </div>
                  )}
                </div>

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

            <div className="space-y-1">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 py-2.5 text-[var(--stone-700)]"
              >
                <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t.nav.myProfile}
              </Link>
              <Link
                href="/my-bookings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 py-2.5 text-[var(--stone-700)]"
              >
                <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.nav.myBookings}
              </Link>
              <Link
                href="/tournaments"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 py-2.5 text-[var(--stone-700)]"
              >
                <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t.nav.tournaments}
              </Link>

              {profile?.is_admin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 py-2.5 font-medium"
                  style={{ color: 'var(--terracotta-600)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t.nav.admin}
                </Link>
              )}

              <div className="my-2 border-t border-[var(--stone-200)]" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 py-2.5 text-[var(--stone-600)] w-full"
              >
                <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t.nav.signOut}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
