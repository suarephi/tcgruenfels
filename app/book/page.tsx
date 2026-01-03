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
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.booking.title}</h1>
        <p className="text-gray-500 mt-1">
          {isAdmin ? t.booking.subtitleAdmin : t.booking.subtitle}
        </p>
      </div>
      <BookingGrid />
    </div>
  );
}
