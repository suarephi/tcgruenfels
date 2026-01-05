"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  created_at: string;
  bookingCount: number;
}

interface Settings {
  bookingWindowDays: number;
  viewWindowDays: number;
  startHour: number;
  endHour: number;
  maxBookingsPerDay: number;
}

interface Tournament {
  id: string;
  name: string;
  type: "singles" | "doubles";
  format: "round_robin" | "single_elimination" | "group_knockout";
  status: "draft" | "registration" | "in_progress" | "completed";
  participant_count: number;
  settings: {
    groups_count: number;
    advance_per_group: number;
    sets_to_win: number;
  };
}

interface ToastState {
  message: string;
  type: "error" | "success";
}

export default function AdminPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "tournaments">("users");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: "",
    type: "singles" as "singles" | "doubles",
    format: "round_robin" as "round_robin" | "single_elimination" | "group_knockout",
    settings: { groups_count: 2, advance_per_group: 2, sets_to_win: 2 },
  });
  const [settings, setSettings] = useState<Settings>({
    bookingWindowDays: 3,
    viewWindowDays: 14,
    startHour: 6,
    endHour: 22,
    maxBookingsPerDay: 1,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.push("/book");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router, t.toast.somethingWrong]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // Use defaults if settings can't be fetched
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments || []);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const handleCreateTournament = async () => {
    if (!newTournament.name.trim()) return;
    setActionLoading("create-tournament");
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTournament),
      });

      if (res.ok) {
        setToast({ message: language === "de" ? "Turnier erstellt" : "Tournament created", type: "success" });
        setShowCreateTournament(false);
        setNewTournament({
          name: "",
          type: "singles",
          format: "round_robin",
          settings: { groups_count: 2, advance_per_group: 2, sets_to_win: 2 },
        });
        await fetchTournaments();
      } else {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: language === "de" ? "Turnier gelöscht" : "Tournament deleted", type: "success" });
        await fetchTournaments();
      } else {
        setToast({ message: t.toast.somethingWrong, type: "error" });
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || t.admin.settingsFailed, type: "error" });
      } else {
        setToast({ message: t.admin.settingsSaved, type: "success" });
      }
    } catch {
      setToast({ message: t.admin.settingsFailed, type: "error" });
    } finally {
      setSettingsLoading(false);
    }
  };

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

      if (!profile?.is_admin) {
        router.push("/book");
        return;
      }

      setCurrentUserId(user.id);
      fetchUsers();
      fetchSettings();
      fetchTournaments();
    };

    checkAuth();
  }, [supabase, router, fetchUsers, fetchSettings, fetchTournaments]);

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || t.toast.somethingWrong, type: "error" });
      } else {
        setToast({ message: t.toast.adminUpdated, type: "success" });
        await fetchUsers();
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || t.toast.somethingWrong, type: "error" });
      } else {
        setToast({ message: t.toast.userDeleted, type: "success" });
        await fetchUsers();
      }
    } catch {
      setToast({ message: t.toast.somethingWrong, type: "error" });
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const adminCount = users.filter(u => u.is_admin).length;
  const memberCount = users.filter(u => !u.is_admin).length;

  return (
    <div className="py-8 md:py-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--stone-900)]/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-sm card-elevated overflow-hidden animate-scale-in">
            <div className="p-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--terracotta-300)' }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-center text-[var(--stone-900)] mb-2">
                {language === "de" ? "Benutzer löschen?" : "Delete User?"}
              </h3>
              <p className="text-[var(--stone-500)] text-center text-sm">
                {t.admin.confirmDelete}
              </p>
            </div>
            <div className="px-6 py-4 flex gap-3 justify-end border-t border-[var(--stone-100)]" style={{ background: 'var(--cream-50)' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
              >
                {t.booking.cancelDialog}
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={actionLoading === deleteConfirm}
                className="px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--terracotta-500)' }}
              >
                {actionLoading === deleteConfirm ? "..." : t.admin.deleteUser}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8 md:mb-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)',
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-[var(--stone-900)]">
                {t.admin.title}
              </h1>
              <p className="text-[var(--stone-500)] mt-2">
                {t.admin.subtitle}
              </p>
            </div>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all hover:bg-[var(--cream-200)]"
            style={{ color: 'var(--forest-600)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.admin.backToBooking}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 animate-slide-up">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "users"
              ? "bg-[var(--forest-600)] text-white"
              : "bg-[var(--cream-200)] text-[var(--stone-600)] hover:bg-[var(--cream-300)]"
          }`}
        >
          {t.admin.users}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "settings"
              ? "bg-[var(--forest-600)] text-white"
              : "bg-[var(--cream-200)] text-[var(--stone-600)] hover:bg-[var(--cream-300)]"
          }`}
        >
          {t.admin.settings}
        </button>
        <button
          onClick={() => setActiveTab("tournaments")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "tournaments"
              ? "bg-[var(--forest-600)] text-white"
              : "bg-[var(--cream-200)] text-[var(--stone-600)] hover:bg-[var(--cream-300)]"
          }`}
        >
          {t.admin.tournaments}
        </button>
      </div>

      {activeTab === "users" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up stagger-1">
            <div className="card-elevated p-4">
              <div className="text-2xl font-serif text-[var(--stone-900)]">{users.length}</div>
              <div className="text-sm text-[var(--stone-500)]">{t.admin.users}</div>
            </div>
            <div className="card-elevated p-4">
              <div className="text-2xl font-serif text-[var(--terracotta-500)]">{adminCount}</div>
              <div className="text-sm text-[var(--stone-500)]">{language === "de" ? "Admins" : "Admins"}</div>
            </div>
            <div className="card-elevated p-4">
              <div className="text-2xl font-serif text-[var(--forest-600)]">{memberCount}</div>
              <div className="text-sm text-[var(--stone-500)]">{language === "de" ? "Mitglieder" : "Members"}</div>
            </div>
            <div className="card-elevated p-4">
              <div className="text-2xl font-serif text-[var(--stone-900)]">
                {users.reduce((sum, u) => sum + u.bookingCount, 0)}
              </div>
              <div className="text-sm text-[var(--stone-500)]">{t.admin.bookings}</div>
            </div>
          </div>

          {/* Users Table */}
      <div className="card-elevated overflow-hidden animate-slide-up stagger-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, var(--forest-700) 0%, var(--forest-800) 100%)' }}>
                <th className="text-left p-4 font-medium text-white">{t.admin.name}</th>
                <th className="text-left p-4 font-medium text-white">{t.admin.role}</th>
                <th className="text-left p-4 font-medium text-white">{t.admin.bookings}</th>
                <th className="text-left p-4 font-medium text-white hidden sm:table-cell">{t.admin.joined}</th>
                <th className="text-right p-4 font-medium text-white">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--cream-200)' }}>
                      <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-[var(--stone-500)]">{t.admin.noUsers}</p>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const isCurrentUser = user.id === currentUserId;
                  const isLoading = actionLoading === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--stone-100)] last:border-b-0 hover:bg-[var(--cream-50)] transition-colors opacity-0 animate-slide-up"
                      style={{
                        animationDelay: `${(idx + 3) * 50}ms`,
                        animationFillMode: 'forwards',
                      }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              background: user.is_admin
                                ? 'linear-gradient(135deg, var(--terracotta-300) 0%, var(--terracotta-400) 100%)'
                                : 'linear-gradient(135deg, var(--forest-200) 0%, var(--forest-300) 100%)',
                            }}
                          >
                            <span className={`font-semibold text-sm ${user.is_admin ? 'text-white' : 'text-[var(--forest-800)]'}`}>
                              {user.first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-[var(--stone-900)]">
                              {user.first_name} {user.last_name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[var(--stone-400)] text-sm ml-1">{t.admin.you}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.is_admin ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--terracotta-300)', color: 'white' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {t.admin.adminBadge}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--forest-100)', color: 'var(--forest-700)' }}
                          >
                            {t.admin.userBadge}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium"
                          style={{ background: 'var(--cream-200)', color: 'var(--stone-700)' }}
                        >
                          {user.bookingCount}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--stone-500)] text-sm hidden sm:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-4">
                        {!isCurrentUser && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(user.id, !user.is_admin)}
                              disabled={isLoading}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                                user.is_admin
                                  ? "hover:bg-[var(--cream-200)]"
                                  : "hover:bg-[var(--forest-50)]"
                              }`}
                              style={{
                                color: user.is_admin ? 'var(--terracotta-600)' : 'var(--forest-600)',
                              }}
                            >
                              {isLoading ? "..." : user.is_admin ? t.admin.removeAdmin : t.admin.makeAdmin}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              disabled={isLoading}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-red-50"
                              style={{ color: '#dc2626' }}
                            >
                              {t.admin.deleteUser}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === "settings" && (
        <div className="card-elevated p-6 animate-slide-up">
          <div className="mb-6">
            <h2 className="font-serif text-xl text-[var(--stone-900)]">{t.admin.settings}</h2>
            <p className="text-sm text-[var(--stone-500)] mt-1">{t.admin.settingsSubtitle}</p>
          </div>

          <div className="space-y-6">
            {/* Booking Window */}
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
                  {t.admin.bookingWindow}
                </label>
                <p className="text-xs text-[var(--stone-500)]">{t.admin.bookingWindowDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.bookingWindowDays}
                  onChange={(e) => setSettings({ ...settings, bookingWindowDays: parseInt(e.target.value) || 1 })}
                  className="input-field w-20 text-center"
                />
                <span className="text-sm text-[var(--stone-500)]">{t.admin.days}</span>
              </div>
            </div>

            {/* View Window */}
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
                  {t.admin.viewWindow}
                </label>
                <p className="text-xs text-[var(--stone-500)]">{t.admin.viewWindowDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={settings.bookingWindowDays}
                  max="60"
                  value={settings.viewWindowDays}
                  onChange={(e) => setSettings({ ...settings, viewWindowDays: parseInt(e.target.value) || settings.bookingWindowDays })}
                  className="input-field w-20 text-center"
                />
                <span className="text-sm text-[var(--stone-500)]">{t.admin.days}</span>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
                  {t.admin.operatingHours}
                </label>
                <p className="text-xs text-[var(--stone-500)]">{t.admin.operatingHoursDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--stone-500)]">{t.admin.startHour}</span>
                  <select
                    value={settings.startHour}
                    onChange={(e) => setSettings({ ...settings, startHour: parseInt(e.target.value) })}
                    className="select-field select-field-sm w-24"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <span className="text-[var(--stone-400)]">-</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--stone-500)]">{t.admin.endHour}</span>
                  <select
                    value={settings.endHour}
                    onChange={(e) => setSettings({ ...settings, endHour: parseInt(e.target.value) })}
                    className="select-field select-field-sm w-24"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Max Bookings Per Day */}
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-[var(--stone-700)] mb-1">
                  {t.admin.maxBookingsPerDay}
                </label>
                <p className="text-xs text-[var(--stone-500)]">{t.admin.maxBookingsPerDayDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxBookingsPerDay}
                  onChange={(e) => setSettings({ ...settings, maxBookingsPerDay: parseInt(e.target.value) || 1 })}
                  className="input-field w-20 text-center"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--stone-100)] flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className="btn-primary flex items-center gap-2"
            >
              {settingsLoading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  {language === "de" ? "Speichere..." : "Saving..."}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.admin.saveSettings}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === "tournaments" && (
        <div className="animate-slide-up">
          {/* Create Tournament Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-xl text-[var(--stone-800)]">
              {t.admin.tournaments}
            </h2>
            <button
              onClick={() => setShowCreateTournament(true)}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.admin.createTournament}
            </button>
          </div>

          {/* Create Tournament Modal */}
          {showCreateTournament && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowCreateTournament(false)}
              />
              <div className="relative w-full max-w-md card-elevated p-6 animate-scale-in">
                <h3 className="font-serif text-xl text-[var(--stone-900)] mb-4">
                  {t.admin.createTournament}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                      {t.tournament.name}
                    </label>
                    <input
                      type="text"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                      placeholder={t.tournament.namePlaceholder}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                      {t.tournament.type}
                    </label>
                    <select
                      value={newTournament.type}
                      onChange={(e) => setNewTournament({ ...newTournament, type: e.target.value as "singles" | "doubles" })}
                      className="select-field"
                    >
                      <option value="singles">{t.tournament.singles}</option>
                      <option value="doubles">{t.tournament.doubles}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                      {t.tournament.format}
                    </label>
                    <select
                      value={newTournament.format}
                      onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value as "round_robin" | "single_elimination" | "group_knockout" })}
                      className="select-field"
                    >
                      <option value="round_robin">{t.tournament.roundRobin}</option>
                      <option value="single_elimination">{t.tournament.singleElimination}</option>
                      <option value="group_knockout">{t.tournament.groupKnockout}</option>
                    </select>
                  </div>

                  {newTournament.format === "group_knockout" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                          {t.tournament.groupsCount}
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={8}
                          value={newTournament.settings.groups_count}
                          onChange={(e) => setNewTournament({
                            ...newTournament,
                            settings: { ...newTournament.settings, groups_count: parseInt(e.target.value) || 2 }
                          })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--stone-700)] mb-1.5">
                          {t.tournament.advancePerGroup}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={4}
                          value={newTournament.settings.advance_per_group}
                          onChange={(e) => setNewTournament({
                            ...newTournament,
                            settings: { ...newTournament.settings, advance_per_group: parseInt(e.target.value) || 1 }
                          })}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateTournament(false)}
                    className="flex-1 btn-secondary"
                  >
                    {t.booking.cancelDialog}
                  </button>
                  <button
                    onClick={handleCreateTournament}
                    disabled={!newTournament.name.trim() || actionLoading === "create-tournament"}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {actionLoading === "create-tournament" ? t.tournament.creating : t.tournament.create}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tournaments List */}
          {tournaments.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--cream-200)" }}>
                <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-[var(--stone-500)]">{t.admin.noTournaments}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="card-elevated p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-serif text-lg text-[var(--stone-900)]">
                          {tournament.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tournament.status === "draft" ? "bg-[var(--stone-100)] text-[var(--stone-600)]" :
                          tournament.status === "registration" ? "bg-blue-100 text-blue-700" :
                          tournament.status === "in_progress" ? "bg-[var(--forest-100)] text-[var(--forest-700)]" :
                          "bg-[var(--terracotta-100)] text-[var(--terracotta-700)]"
                        }`}>
                          {tournament.status === "draft" ? t.tournament.draft :
                           tournament.status === "registration" ? t.tournament.registration :
                           tournament.status === "in_progress" ? t.tournament.inProgress :
                           t.tournament.completed}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--stone-500)]">
                        <span>{tournament.type === "singles" ? t.tournament.singles : t.tournament.doubles}</span>
                        <span>•</span>
                        <span>
                          {tournament.format === "round_robin" ? t.tournament.roundRobin :
                           tournament.format === "single_elimination" ? t.tournament.singleElimination :
                           t.tournament.groupKnockout}
                        </span>
                        <span>•</span>
                        <span>{tournament.participant_count} {t.tournament.participants}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tournaments/${tournament.id}`}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--forest-50)]"
                        style={{ color: "var(--forest-600)" }}
                      >
                        {language === "de" ? "Ansehen" : "View"}
                      </Link>
                      <button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        disabled={actionLoading === tournament.id}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 hover:bg-red-50"
                        style={{ color: "#dc2626" }}
                      >
                        {actionLoading === tournament.id ? "..." : t.admin.deleteUser}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
