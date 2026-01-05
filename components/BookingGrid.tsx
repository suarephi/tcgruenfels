"use client";

import { useState, useEffect, useCallback } from "react";
import Toast from "./Toast";
import BookingDialog from "./BookingDialog";
import { useLanguage } from "@/lib/LanguageContext";

interface Booking {
  id: number;
  user_id: string;
  date: string;
  hour: number;
  first_name: string;
  last_name: string;
  partner_first_name?: string;
  partner_last_name?: string;
}

interface BookingDialogState {
  isOpen: boolean;
  date: string;
  hour: number;
}

interface BookingData {
  bookings: Booking[];
  dates: string[];
  maxBookableDate: string;
  currentUserId: string;
  isAdmin: boolean;
}

interface ToastState {
  message: string;
  type: "error" | "success";
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export default function BookingGrid() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dialog, setDialog] = useState<BookingDialogState>({
    isOpen: false,
    date: "",
    hour: 0,
  });

  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [language]);

  const formatDateLong = useCallback((dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [language]);

  const formatDateShort = useCallback((dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      weekday: "short",
      day: "numeric",
    });
  }, [language]);

  const showToast = useCallback((message: string, type: "error" | "success") => {
    setToast({ message, type });
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      showToast(t.toast.failedToLoad, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t.toast.failedToLoad]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const translateError = useCallback((error: string): string => {
    if (error.includes("once per day")) return t.toast.oncePerDay;
    if (error.includes("already booked")) return t.toast.slotTaken;
    if (error.includes("3 days")) return t.toast.only3Days;
    return error;
  }, [t.toast]);

  const openBookingDialog = (date: string, hour: number) => {
    setDialog({ isOpen: true, date, hour });
  };

  const closeBookingDialog = () => {
    setDialog({ isOpen: false, date: "", hour: 0 });
  };

  const handleBook = async (partnerId: string | null) => {
    const { date, hour } = dialog;
    const key = `${date}-${hour}`;
    setActionLoading(key);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hour, partnerId }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(translateError(json.error) || t.toast.bookingFailed, "error");
      } else {
        showToast(t.toast.bookingSuccess, "success");
        await fetchBookings();
      }
    } catch {
      showToast(t.toast.somethingWrong, "error");
    } finally {
      setActionLoading(null);
      closeBookingDialog();
    }
  };

  const handleCancel = async (bookingId: number) => {
    setActionLoading(`cancel-${bookingId}`);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || t.toast.cancelFailed, "error");
      } else {
        showToast(t.toast.bookingCancelled, "success");
        await fetchBookings();
      }
    } catch {
      showToast(t.toast.somethingWrong, "error");
    } finally {
      setActionLoading(null);
    }
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
        <span className="text-[var(--stone-500)] text-sm">{t.booking.loading}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--cream-200)' }}>
          <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-[var(--stone-600)]">{t.booking.unableToLoad}</p>
      </div>
    );
  }

  const getBooking = (date: string, hour: number): Booking | undefined => {
    return data.bookings.find((b) => b.date === date && b.hour === hour);
  };

  const isBookable = (date: string): boolean => {
    return date <= data.maxBookableDate;
  };

  const selectedDate = data.dates[selectedDayIndex];
  const canBookSelectedDate = isBookable(selectedDate);

  // Mobile: Single day view with elegant cards
  const MobileView = () => (
    <div className="md:hidden animate-fade-in">
      {/* Day Navigation Header */}
      <div
        className="relative overflow-hidden rounded-t-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, var(--forest-700) 0%, var(--forest-800) 100%)',
        }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
          }} />
        </div>

        <div className="relative flex items-center justify-between">
          <button
            onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
            disabled={selectedDayIndex === 0}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <div className="font-serif text-xl text-white">{formatDateLong(selectedDate)}</div>
            <div className={`text-xs mt-1 font-medium ${canBookSelectedDate ? "text-[var(--forest-200)]" : "text-[var(--terracotta-300)]"}`}>
              {canBookSelectedDate ? t.booking.availableForBooking : t.booking.viewOnly}
            </div>
          </div>

          <button
            onClick={() => setSelectedDayIndex(Math.min(data.dates.length - 1, selectedDayIndex + 1))}
            disabled={selectedDayIndex === data.dates.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Pills */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {data.dates.slice(0, 7).map((date, idx) => {
            const dayDate = new Date(date + "T12:00:00");
            const dayName = dayDate.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { weekday: 'short' });
            const dayNum = dayDate.getDate();

            return (
              <button
                key={date}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all ${
                  idx === selectedDayIndex
                    ? "bg-white text-[var(--forest-700)]"
                    : isBookable(date)
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white/5 text-white/50"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide font-medium opacity-70">{dayName}</span>
                <span className="text-lg font-semibold">{dayNum}</span>
              </button>
            );
          })}
          {data.dates.length > 7 && (
            <button
              onClick={() => setSelectedDayIndex(7)}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 text-white/50 text-xs"
            >
              +{data.dates.length - 7}
            </button>
          )}
        </div>
      </div>

      {/* Time Slots */}
      <div className="card-elevated rounded-t-none divide-y divide-[var(--stone-100)]">
        {HOURS.map((hour, index) => {
          const booking = getBooking(selectedDate, hour);
          const isMyBooking = booking && booking.user_id === data.currentUserId;
          const key = `${selectedDate}-${hour}`;
          const isLoading = actionLoading === key || actionLoading === `cancel-${booking?.id}`;

          return (
            <div
              key={hour}
              className="flex items-center p-4 gap-4 opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
            >
              <div className="w-16 text-center">
                <span className="text-sm font-semibold text-[var(--stone-700)]">
                  {formatHour(hour)}
                </span>
              </div>

              <div className="flex-1">
                {booking ? (
                  <div
                    className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                      isMyBooking ? "slot-mine" : "slot-booked"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isMyBooking ? "bg-white/80" : "bg-[var(--stone-400)]"}`} />
                      <span className={`font-medium text-sm ${isMyBooking ? "text-white" : "text-[var(--stone-600)]"}`}>
                        {isMyBooking ? t.booking.yourBooking : `${booking.first_name} ${booking.last_name}`}
                        {booking.partner_first_name && (
                          <span className={`font-normal ${isMyBooking ? "text-white/70" : "text-[var(--stone-400)]"}`}>
                            {" "}{t.booking.with} {booking.partner_first_name}
                          </span>
                        )}
                      </span>
                    </div>
                    {(isMyBooking || data?.isAdmin) && canBookSelectedDate && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isLoading}
                        className={`text-xs font-medium px-2 py-1 rounded-lg transition-all disabled:opacity-50 ${
                          isMyBooking
                            ? "text-white/80 hover:bg-white/10"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                      >
                        {isLoading ? "..." : t.booking.cancel}
                      </button>
                    )}
                  </div>
                ) : canBookSelectedDate ? (
                  <button
                    onClick={() => openBookingDialog(selectedDate, hour)}
                    disabled={isLoading}
                    className="w-full py-3 slot-available rounded-xl font-medium text-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full animate-spin"
                          style={{ border: '2px solid var(--forest-200)', borderTopColor: 'var(--forest-600)' }}
                        />
                        {t.booking.booking}
                      </span>
                    ) : (
                      t.booking.bookThisSlot
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 slot-unavailable rounded-xl text-center text-sm">
                    {t.booking.notAvailableYet}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Desktop: Elegant table view
  const DesktopView = () => (
    <div className="hidden md:block card-elevated overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr
              style={{
                background: 'linear-gradient(135deg, var(--forest-700) 0%, var(--forest-800) 100%)',
              }}
            >
              <th className="p-4 text-left font-semibold text-white sticky left-0 z-10 min-w-[100px]" style={{ background: 'var(--forest-700)' }}>
                <span className="font-serif">{language === "de" ? "Zeit" : "Time"}</span>
              </th>
              {data.dates.map((date, idx) => (
                <th
                  key={date}
                  className={`p-4 font-medium text-center min-w-[140px] text-white ${
                    !isBookable(date) ? "bg-black/10" : ""
                  }`}
                >
                  <div className="font-serif">{formatDate(date)}</div>
                  {!isBookable(date) && (
                    <div className="text-[10px] font-normal text-[var(--terracotta-300)] mt-1 uppercase tracking-wide">
                      {t.booking.viewOnly}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, hourIdx) => (
              <tr
                key={hour}
                className="border-b border-[var(--stone-100)] last:border-b-0 opacity-0 animate-slide-up"
                style={{
                  animationDelay: `${hourIdx * 20}ms`,
                  animationFillMode: 'forwards',
                  background: hourIdx % 2 === 0 ? 'white' : 'var(--cream-50)',
                }}
              >
                <td
                  className="p-3 font-semibold text-[var(--stone-700)] border-r border-[var(--stone-100)] sticky left-0 z-10"
                  style={{ background: hourIdx % 2 === 0 ? 'white' : 'var(--cream-50)' }}
                >
                  {formatHour(hour)}
                </td>

                {data.dates.map((date) => {
                  const booking = getBooking(date, hour);
                  const isMyBooking = booking && booking.user_id === data.currentUserId;
                  const key = `${date}-${hour}`;
                  const isLoading = actionLoading === key || actionLoading === `cancel-${booking?.id}`;
                  const canBook = isBookable(date);

                  return (
                    <td
                      key={key}
                      className={`p-2 border-r border-[var(--stone-100)] last:border-r-0 ${
                        !canBook ? "bg-[var(--cream-100)]" : ""
                      }`}
                    >
                      {booking ? (
                        <div className={`rounded-lg p-3 text-sm ${isMyBooking ? "slot-mine" : "slot-booked"}`}>
                          <div className={`font-medium ${isMyBooking ? "text-white" : "text-[var(--stone-600)]"}`}>
                            {isMyBooking ? t.booking.yourBooking : `${booking.first_name} ${booking.last_name}`}
                            {booking.partner_first_name && (
                              <span className={`text-xs block mt-0.5 font-normal ${isMyBooking ? "text-white/70" : "text-[var(--stone-400)]"}`}>
                                {t.booking.with} {booking.partner_first_name}
                              </span>
                            )}
                          </div>
                          {(isMyBooking || data?.isAdmin) && canBook && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={isLoading}
                              className={`mt-2 text-xs font-medium px-2 py-1 rounded-md transition-all disabled:opacity-50 ${
                                isMyBooking
                                  ? "text-white/80 hover:bg-white/10"
                                  : "text-red-500 hover:bg-red-50"
                              }`}
                            >
                              {isLoading ? t.booking.canceling : t.booking.cancel}
                            </button>
                          )}
                        </div>
                      ) : canBook ? (
                        <button
                          onClick={() => openBookingDialog(date, hour)}
                          disabled={isLoading}
                          className="w-full h-full min-h-[52px] slot-available rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div
                              className="w-4 h-4 rounded-full animate-spin mx-auto"
                              style={{ border: '2px solid var(--forest-200)', borderTopColor: 'var(--forest-600)' }}
                            />
                          ) : (
                            t.booking.book
                          )}
                        </button>
                      ) : (
                        <div className="w-full h-full min-h-[52px] slot-unavailable rounded-lg flex items-center justify-center text-sm">
                          —
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <BookingDialog
        isOpen={dialog.isOpen}
        date={dialog.date}
        hour={dialog.hour}
        onConfirm={handleBook}
        onCancel={closeBookingDialog}
        loading={actionLoading === `${dialog.date}-${dialog.hour}`}
      />

      <MobileView />
      <DesktopView />

      {/* Legend */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-md"
            style={{ background: 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)' }}
          />
          <span className="text-[var(--stone-600)]">{t.legend.yourBooking}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-[var(--stone-200)]" />
          <span className="text-[var(--stone-600)]">{t.legend.booked}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-md"
            style={{ background: 'var(--forest-100)', border: '1.5px solid var(--forest-200)' }}
          />
          <span className="text-[var(--stone-600)]">{t.legend.available}</span>
        </div>
      </div>
    </div>
  );
}
