import { supabase } from "./supabase";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: string;
  partner_id: string | null;
  date: string;
  hour: number;
  created_at: string;
  first_name?: string;
  last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
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
  // First try simple query to debug
  const { data: simpleData, error: simpleError } = await supabase
    .from("bookings")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);

  console.log("Simple bookings query:", { count: simpleData?.length, error: simpleError });

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles!bookings_user_id_fkey(first_name, last_name),
      partner:profiles!bookings_partner_id_fkey(first_name, last_name)
    `)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("hour");

  if (error) {
    console.error("Error fetching bookings with joins:", error);
    // Fall back to simple data without profile names
    if (simpleData) {
      return simpleData.map((booking) => ({
        id: booking.id,
        user_id: booking.user_id,
        partner_id: booking.partner_id,
        date: booking.date,
        hour: booking.hour,
        created_at: booking.created_at,
        first_name: "User",
        last_name: "",
        partner_first_name: undefined,
        partner_last_name: undefined,
      }));
    }
    return [];
  }

  return data.map((booking) => ({
    id: booking.id,
    user_id: booking.user_id,
    partner_id: booking.partner_id,
    date: booking.date,
    hour: booking.hour,
    created_at: booking.created_at,
    first_name: booking.profiles?.first_name || "User",
    last_name: booking.profiles?.last_name || "",
    partner_first_name: booking.partner?.first_name,
    partner_last_name: booking.partner?.last_name,
  }));
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles!bookings_user_id_fkey(first_name, last_name),
      partner:profiles!bookings_partner_id_fkey(first_name, last_name)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    partner_id: data.partner_id,
    date: data.date,
    hour: data.hour,
    created_at: data.created_at,
    first_name: data.profiles?.first_name,
    last_name: data.profiles?.last_name,
    partner_first_name: data.partner?.first_name,
    partner_last_name: data.partner?.last_name,
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
  hour: number,
  partnerId: string | null = null
): Promise<number> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({ user_id: userId, date, hour, partner_id: partnerId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteBooking(id: number): Promise<boolean> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  return !error;
}

export async function updateBooking(
  id: number,
  partnerId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from("bookings")
    .update({ partner_id: partnerId })
    .eq("id", id);
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
