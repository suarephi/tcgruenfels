"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";

interface Booking {
  id: number;
  date: string;
  hour: number;
  partner_first_name?: string;
  partner_last_name?: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const supabase = createBrowserSupabaseClient();

  const fetchBookings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("bookings")
      .select(`
        id,
        date,
        hour,
        partner:profiles!bookings_partner_id_fkey(first_name, last_name)
      `)
      .eq("user_id", user.id)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("hour", { ascending: true });

    if (data) {
      setBookings(data.map((b: any) => ({
        id: b.id,
        date: b.date,
        hour: b.hour,
        partner_first_name: b.partner?.first_name,
        partner_last_name: b.partner?.last_name,
      })));
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId: number) => {
    setCancelLoading(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setToast({ message: t.toast.cancelFailed, type: "error" });
      } else {
        setToast({ message: t.toast.bookingCancelled, type: "success" });
        await fetchBookings();
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setCancelLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr === today;
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
            <h1 className="font-serif text-3xl text-[var(--stone-900)]">
              {t.nav.myBookings}
            </h1>
            <p className="text-[var(--stone-500)] mt-1">
              {language === "de" ? "Deine kommenden Buchungen" : "Your upcoming bookings"}
            </p>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="card-elevated p-12 text-center animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--cream-200)' }}>
            <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
            {language === "de" ? "Keine Buchungen" : "No bookings"}
          </h3>
          <p className="text-[var(--stone-500)] mb-6">
            {language === "de" ? "Du hast noch keine kommenden Buchungen." : "You don't have any upcoming bookings."}
          </p>
          <Link href="/book" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {language === "de" ? "Jetzt buchen" : "Book now"}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, idx) => (
            <div
              key={booking.id}
              className="card-elevated p-5 animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{
                      background: isToday(booking.date)
                        ? 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)'
                        : 'var(--cream-200)',
                    }}
                  >
                    <span className={`text-lg font-bold ${isToday(booking.date) ? 'text-white' : 'text-[var(--stone-700)]'}`}>
                      {new Date(booking.date + "T12:00:00").getDate()}
                    </span>
                    <span className={`text-[10px] uppercase ${isToday(booking.date) ? 'text-white/80' : 'text-[var(--stone-500)]'}`}>
                      {new Date(booking.date + "T12:00:00").toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-[var(--stone-900)]">
                      {formatDate(booking.date)}
                    </div>
                    <div className="text-[var(--stone-600)] mt-0.5">
                      {formatHour(booking.hour)}
                    </div>
                    {booking.partner_first_name && (
                      <div className="text-sm text-[var(--stone-500)] mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.booking.with} {booking.partner_first_name} {booking.partner_last_name}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelLoading === booking.id}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-red-50"
                  style={{ color: '#dc2626' }}
                >
                  {cancelLoading === booking.id ? "..." : t.booking.cancel}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link to booking */}
      {bookings.length > 0 && (
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--forest-600)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {language === "de" ? "Neue Buchung erstellen" : "Create new booking"}
          </Link>
        </div>
      )}
    </div>
  );
}
