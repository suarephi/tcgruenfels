import { supabase } from "./supabase";

export interface Profile {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: string;
  date: string;
  hour: number;
  created_at: string;
  username?: string;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Profile[];
}

export async function deleteProfile(id: string): Promise<boolean> {
  // This will cascade delete bookings due to FK constraint
  // We need to delete the auth user which will cascade to profile
  const { error } = await supabase.auth.admin.deleteUser(id);
  return !error;
}

export async function setProfileAdmin(id: string, isAdmin: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", id);

  return !error;
}

export async function getBookingsForDateRange(
  startDate: string,
  endDate: string
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles!inner(username)
    `)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("hour");

  if (error) return [];

  return data.map((booking) => ({
    id: booking.id,
    user_id: booking.user_id,
    date: booking.date,
    hour: booking.hour,
    created_at: booking.created_at,
    username: booking.profiles.username,
  }));
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles!inner(username)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    date: data.date,
    hour: data.hour,
    created_at: data.created_at,
    username: data.profiles.username,
  };
}

export async function getUserBookingsForDate(
  userId: string,
  date: string
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date);

  if (error) return [];
  return data as Booking[];
}

export async function getBookingByDateAndHour(
  date: string,
  hour: number
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .eq("hour", hour)
    .single();

  if (error || !data) return null;
  return data as Booking;
}

export async function createBooking(
  userId: string,
  date: string,
  hour: number
): Promise<number> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({ user_id: userId, date, hour })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteBooking(id: number): Promise<boolean> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  return !error;
}

export async function getUserBookingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count || 0;
}
