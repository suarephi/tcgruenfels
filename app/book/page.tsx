"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookingGrid from "@/components/BookingGrid";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface TournamentMatchContext {
  tournamentId: string;
  matchId: string;
  matchInfo: string;
}

function BookPageContent() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [tournamentMatch, setTournamentMatch] = useState<TournamentMatchContext | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Check for tournament match context in URL
    const tournamentId = searchParams.get("tournamentId");
    const matchId = searchParams.get("matchId");
    const matchInfo = searchParams.get("matchInfo");

    if (tournamentId && matchId && matchInfo) {
      setTournamentMatch({ tournamentId, matchId, matchInfo });
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      const admin = profile?.is_admin || false;
      setIsAdmin(admin);

      // Fetch all users for "View As" dropdown if admin
      if (admin) {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data.users || []);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

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

  const cancelTournamentBooking = () => {
    if (tournamentMatch) {
      router.push(`/tournaments/${tournamentMatch.tournamentId}`);
    }
  };

  return (
    <div className="py-8 md:py-12">
      {/* Tournament Match Banner */}
      {tournamentMatch && (
        <div
          className="mb-6 p-4 rounded-xl animate-fade-in flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, var(--terracotta-100) 0%, var(--terracotta-50) 100%)',
            border: '1px solid var(--terracotta-200)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--terracotta-200)' }}
            >
              <svg className="w-5 h-5 text-[var(--terracotta-700)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--terracotta-700)]">
                {language === "de" ? "Turnierspiel planen" : "Schedule Tournament Match"}
              </div>
              <div className="text-[var(--terracotta-900)] font-semibold">
                {tournamentMatch.matchInfo}
              </div>
              <div className="text-xs text-[var(--terracotta-600)] mt-0.5">
                {language === "de" ? "Wählen Sie einen 2-Stunden-Slot für das Spiel" : "Select a 2-hour slot for the match"}
              </div>
            </div>
          </div>
          <button
            onClick={cancelTournamentBooking}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--terracotta-200)]"
            style={{ color: 'var(--terracotta-700)' }}
          >
            {language === "de" ? "Abbrechen" : "Cancel"}
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8 md:mb-10 animate-fade-in">
        <div className="flex items-start gap-4">
          <div
            className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--forest-100) 0%, var(--forest-200) 100%)',
            }}
          >
            <svg className="w-6 h-6 text-[var(--forest-700)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--stone-900)]">
              {t.booking.title}
            </h1>
            <p className="text-[var(--stone-500)] mt-2 max-w-xl">
              {isAdmin ? t.booking.subtitleAdmin : t.booking.subtitle}
            </p>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--terracotta-300)',
                color: 'white',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Mode
            </div>

            {/* View As dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--stone-500)]">
                {t.tournament.viewAs}:
              </label>
              <select
                value={viewAsUserId || ""}
                onChange={(e) => setViewAsUserId(e.target.value || null)}
                className="select-field select-field-sm min-w-[200px]"
              >
                <option value="">{t.tournament.viewAsAll}</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <BookingGrid
        viewAsUserId={viewAsUserId}
        tournamentMatch={tournamentMatch}
        onTournamentBookingComplete={() => {
          if (tournamentMatch) {
            router.push(`/tournaments/${tournamentMatch.tournamentId}`);
          }
        }}
      />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
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
    }>
      <BookPageContent />
    </Suspense>
  );
}
