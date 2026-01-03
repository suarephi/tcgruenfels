"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Toast from "@/components/Toast";

interface User {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  bookingCount: number;
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
    };

    checkAuth();
  }, [supabase, router, fetchUsers]);

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
    if (!confirm(t.admin.confirmDelete)) return;

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
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.admin.title}</h1>
          <p className="text-gray-500 mt-1">{t.admin.subtitle}</p>
        </div>
        <Link
          href="/book"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.admin.backToBooking}
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-700">{t.admin.username}</th>
                <th className="text-left p-4 font-semibold text-gray-700">{t.admin.role}</th>
                <th className="text-left p-4 font-semibold text-gray-700">{t.admin.bookings}</th>
                <th className="text-left p-4 font-semibold text-gray-700 hidden sm:table-cell">{t.admin.joined}</th>
                <th className="text-right p-4 font-semibold text-gray-700">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {t.admin.noUsers}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  const isLoading = actionLoading === user.id;

                  return (
                    <tr key={user.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-700 font-medium text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {user.username}
                            {isCurrentUser && (
                              <span className="text-gray-400 text-sm ml-1">{t.admin.you}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.is_admin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {t.admin.adminBadge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {t.admin.userBadge}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {user.bookingCount}
                      </td>
                      <td className="p-4 text-gray-500 text-sm hidden sm:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-4">
                        {!isCurrentUser && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(user.id, !user.is_admin)}
                              disabled={isLoading}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                                user.is_admin
                                  ? "text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {user.is_admin ? t.admin.removeAdmin : t.admin.makeAdmin}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={isLoading}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition disabled:opacity-50"
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
    </div>
  );
}
