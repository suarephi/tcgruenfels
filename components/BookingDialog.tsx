"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface BookingDialogProps {
  isOpen: boolean;
  date: string;
  hour: number;
  onConfirm: (partnerId: string | null) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function BookingDialog({
  isOpen,
  date,
  hour,
  onConfirm,
  onCancel,
  loading,
}: BookingDialogProps) {
  const { language, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPartner("");
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      // Ignore errors, partner selection is optional
    } finally {
      setLoadingUsers(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const dateObj = new Date(dateStr + "T12:00:00");
    return dateObj.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatHour = (h: number): string => {
    return `${h.toString().padStart(2, "0")}:00 - ${(h + 1).toString().padStart(2, "0")}:00`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--stone-900)]/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md card-elevated overflow-hidden animate-scale-in">
        {/* Header with pattern */}
        <div
          className="relative overflow-hidden p-6"
          style={{
            background: 'linear-gradient(135deg, var(--forest-700) 0%, var(--forest-800) 100%)',
          }}
        >
          {/* Decorative tennis court lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
            <div className="absolute top-4 bottom-4 left-4 right-4 border border-white rounded-sm" />
          </div>

          <div className="relative">
            <h2 className="font-serif text-2xl text-white">{t.booking.confirmTitle}</h2>
            <p className="text-[var(--forest-200)] mt-1">{t.booking.confirmMessage}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Date and Time Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--cream-100)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--forest-100)' }}
                >
                  <svg className="w-5 h-5 text-[var(--forest-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--stone-500)] font-medium">
                    {t.booking.date}
                  </div>
                  <div className="font-medium text-[var(--stone-800)] text-sm">
                    {formatDate(date)}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--cream-100)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--forest-100)' }}
                >
                  <svg className="w-5 h-5 text-[var(--forest-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--stone-500)] font-medium">
                    {t.booking.time}
                  </div>
                  <div className="font-medium text-[var(--stone-800)] text-sm">
                    {formatHour(hour)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--stone-700)] mb-2">
              {t.booking.selectPartner}
            </label>
            <div className="relative">
              <select
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                disabled={loadingUsers}
                className="input-field appearance-none pr-10 cursor-pointer"
              >
                <option value="">{t.booking.noPartner}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-[var(--stone-100)]" style={{ background: 'var(--cream-50)' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            {t.booking.cancelDialog}
          </button>
          <button
            onClick={() => onConfirm(selectedPartner || null)}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                />
                {t.booking.booking}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.booking.confirm}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
