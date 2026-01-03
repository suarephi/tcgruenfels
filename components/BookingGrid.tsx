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
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        {t.booking.unableToLoad}
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

  // Mobile: Single day view
  const MobileView = () => (
    <div className="md:hidden">
      {/* Day Navigation */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
            disabled={selectedDayIndex === 0}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-lg font-semibold">{formatDateLong(selectedDate)}</div>
            <div className={`text-xs mt-0.5 ${canBookSelectedDate ? "text-emerald-200" : "text-amber-200"}`}>
              {canBookSelectedDate ? t.booking.availableForBooking : t.booking.viewOnly}
            </div>
          </div>

          <button
            onClick={() => setSelectedDayIndex(Math.min(data.dates.length - 1, selectedDayIndex + 1))}
            disabled={selectedDayIndex === data.dates.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Pills */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {data.dates.slice(0, 7).map((date, idx) => (
            <button
              key={date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                idx === selectedDayIndex
                  ? "bg-white text-emerald-700"
                  : isBookable(date)
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {formatDateShort(date)}
            </button>
          ))}
          {data.dates.length > 7 && (
            <button
              onClick={() => setSelectedDayIndex(7)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/60"
            >
              +{data.dates.length - 7} {t.booking.moredays}
            </button>
          )}
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 divide-y divide-gray-100">
        {HOURS.map((hour) => {
          const booking = getBooking(selectedDate, hour);
          const isMyBooking = booking && booking.user_id === data.currentUserId;
          const key = `${selectedDate}-${hour}`;
          const isLoading = actionLoading === key || actionLoading === `cancel-${booking?.id}`;

          return (
            <div key={hour} className="flex items-center p-4 gap-4">
              <div className="w-20 text-sm font-medium text-gray-500">
                {formatHour(hour)}
              </div>

              <div className="flex-1">
                {booking ? (
                  <div
                    className={`rounded-lg px-4 py-2.5 flex items-center justify-between ${
                      isMyBooking
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isMyBooking ? "bg-emerald-500" : "bg-gray-400"}`}></div>
                      <span className={`font-medium text-sm ${isMyBooking ? "text-emerald-700" : "text-gray-600"}`}>
                        {isMyBooking ? t.booking.yourBooking : `${booking.first_name} ${booking.last_name}`}
                        {booking.partner_first_name && (
                          <span className="text-gray-400 font-normal"> {t.booking.with} {booking.partner_first_name}</span>
                        )}
                      </span>
                    </div>
                    {(isMyBooking || data?.isAdmin) && canBookSelectedDate && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isLoading}
                        className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                      >
                        {isLoading ? "..." : t.booking.cancel}
                      </button>
                    )}
                  </div>
                ) : canBookSelectedDate ? (
                  <button
                    onClick={() => openBookingDialog(selectedDate, hour)}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-50 text-sm font-medium shadow-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t.booking.booking}
                      </span>
                    ) : (
                      t.booking.bookThisSlot
                    )}
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-gray-50 text-gray-400 rounded-lg text-center text-sm border border-dashed border-gray-200">
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

  // Desktop: Table view
  const DesktopView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
              <th className="p-4 text-left font-semibold sticky left-0 bg-gradient-to-r from-emerald-600 to-emerald-600 z-10 min-w-[100px]">
                {language === "de" ? "Zeit" : "Time"}
              </th>
              {data.dates.map((date) => (
                <th
                  key={date}
                  className={`p-4 font-semibold text-center min-w-[130px] ${
                    !isBookable(date) ? "bg-emerald-800/30" : ""
                  }`}
                >
                  <div>{formatDate(date)}</div>
                  {!isBookable(date) && (
                    <div className="text-xs font-normal text-emerald-200 mt-0.5">{t.booking.viewOnly}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, idx) => (
              <tr key={hour} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="p-3 font-medium text-gray-600 border-r border-gray-100 sticky left-0 bg-inherit z-10">
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
                      className={`p-2 border-r border-gray-100 last:border-r-0 ${
                        !canBook ? "bg-gray-50" : ""
                      }`}
                    >
                      {booking ? (
                        <div
                          className={`rounded-lg p-2.5 text-sm ${
                            isMyBooking
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-gray-100 border border-gray-200"
                          }`}
                        >
                          <div className={`font-medium ${isMyBooking ? "text-emerald-700" : "text-gray-600"}`}>
                            {isMyBooking ? t.booking.yourBooking : `${booking.first_name} ${booking.last_name}`}
                            {booking.partner_first_name && (
                              <span className="text-xs text-gray-400 font-normal block"> {t.booking.with} {booking.partner_first_name}</span>
                            )}
                          </div>
                          {(isMyBooking || data?.isAdmin) && canBook && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={isLoading}
                              className="mt-1 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                            >
                              {isLoading ? t.booking.canceling : t.booking.cancel}
                            </button>
                          )}
                        </div>
                      ) : canBook ? (
                        <button
                          onClick={() => openBookingDialog(date, hour)}
                          disabled={isLoading}
                          className="w-full h-full min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg transition disabled:opacity-50 text-sm font-medium border border-emerald-200 hover:border-emerald-300"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mx-auto"></div>
                          ) : (
                            t.booking.book
                          )}
                        </button>
                      ) : (
                        <div className="w-full h-full min-h-[44px] bg-gray-50 text-gray-300 rounded-lg flex items-center justify-center text-sm border border-dashed border-gray-200">
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
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>{t.legend.yourBooking}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>{t.legend.booked}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-emerald-300 bg-emerald-50"></div>
          <span>{t.legend.available}</span>
        </div>
      </div>
    </div>
  );
}
