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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
          <h2 className="text-xl font-semibold">{t.booking.confirmTitle}</h2>
          <p className="text-emerald-100 mt-1">{t.booking.confirmMessage}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{t.booking.date}</div>
                <div className="font-medium text-gray-900">{formatDate(date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{t.booking.time}</div>
                <div className="font-medium text-gray-900">{formatHour(hour)}</div>
              </div>
            </div>
          </div>

          {/* Partner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.booking.selectPartner}
            </label>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              disabled={loadingUsers}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-900 bg-white"
            >
              <option value="">{t.booking.noPartner}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition disabled:opacity-50"
          >
            {t.booking.cancelDialog}
          </button>
          <button
            onClick={() => onConfirm(selectedPartner || null)}
            disabled={loading}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t.booking.booking}
              </>
            ) : (
              t.booking.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
