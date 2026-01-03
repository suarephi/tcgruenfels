"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BookingGrid from "@/components/BookingGrid";
import { useLanguage } from "@/lib/LanguageContext";

export default function BookPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.booking.title}</h1>
        <p className="text-gray-500 mt-1">
          {session.user.isAdmin ? t.booking.subtitleAdmin : t.booking.subtitle}
        </p>
      </div>
      <BookingGrid />
    </div>
  );
}
