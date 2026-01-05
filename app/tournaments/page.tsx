"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

interface Tournament {
  id: string;
  name: string;
  type: "singles" | "doubles";
  format: "round_robin" | "single_elimination" | "group_knockout";
  status: "draft" | "registration" | "in_progress" | "completed";
  participant_count: number;
  created_at: string;
}

export default function TournamentsPage() {
  const { t } = useLanguage();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch("/api/tournaments");
        const data = await res.json();
        setTournaments(data.tournaments || []);
      } catch (error) {
        console.error("Failed to fetch tournaments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const getTypeLabel = (type: string) => {
    return type === "singles" ? t.tournament.singles : t.tournament.doubles;
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case "round_robin":
        return t.tournament.roundRobin;
      case "single_elimination":
        return t.tournament.singleElimination;
      case "group_knockout":
        return t.tournament.groupKnockout;
      default:
        return format;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-[var(--stone-100)] text-[var(--stone-600)]",
      registration: "bg-blue-100 text-blue-700",
      in_progress: "bg-[var(--forest-100)] text-[var(--forest-700)]",
      completed: "bg-[var(--terracotta-100)] text-[var(--terracotta-700)]",
    };

    const labels: Record<string, string> = {
      draft: t.tournament.draft,
      registration: t.tournament.registration,
      in_progress: t.tournament.inProgress,
      completed: t.tournament.completed,
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: "3px solid var(--forest-100)",
              borderTopColor: "var(--forest-600)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 md:mb-10 animate-fade-in">
        <div className="flex items-start gap-4">
          <div
            className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)",
            }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--stone-900)]">
              {t.tournament.title}
            </h1>
            <p className="text-[var(--stone-500)] mt-2">
              {t.tournament.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Tournament List */}
      {tournaments.length === 0 ? (
        <div className="card-elevated p-12 text-center animate-slide-up">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--cream-200)" }}
          >
            <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
            {t.admin.noTournaments}
          </h3>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament, idx) => (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}`}
              className="block card-elevated p-5 hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-serif text-xl text-[var(--stone-900)]">
                      {tournament.name}
                    </h3>
                    {getStatusBadge(tournament.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--stone-500)]">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {getTypeLabel(tournament.type)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {getFormatLabel(tournament.format)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {tournament.participant_count} {t.tournament.participants}
                    </span>
                  </div>
                </div>
                <div className="text-[var(--forest-600)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
