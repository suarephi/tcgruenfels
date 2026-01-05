"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookingGrid from "@/components/BookingGrid";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function BookPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createBrowserSupabaseClient();

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

      setIsAdmin(profile?.is_admin || false);
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

  return (
    <div className="py-8 md:py-12">
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

        {/* Admin Badge */}
        {isAdmin && (
          <div
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg text-sm font-medium"
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
        )}
      </div>

      <BookingGrid />
    </div>
  );
}
