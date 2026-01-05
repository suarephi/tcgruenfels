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
  // Get bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("hour");

  if (error || !bookings) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  // Get all profiles to map names
  const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name");
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return bookings.map((booking) => {
    const user = profileMap.get(booking.user_id);
    const partner = booking.partner_id ? profileMap.get(booking.partner_id) : null;
    return {
      id: booking.id,
      user_id: booking.user_id,
      partner_id: booking.partner_id,
      date: booking.date,
      hour: booking.hour,
      created_at: booking.created_at,
      first_name: user?.first_name || "User",
      last_name: user?.last_name || "",
      partner_first_name: partner?.first_name,
      partner_last_name: partner?.last_name,
    };
  });
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Get profile names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", [data.user_id, data.partner_id].filter(Boolean));

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const user = profileMap.get(data.user_id);
  const partner = data.partner_id ? profileMap.get(data.partner_id) : null;

  return {
    id: data.id,
    user_id: data.user_id,
    partner_id: data.partner_id,
    date: data.date,
    hour: data.hour,
    created_at: data.created_at,
    first_name: user?.first_name,
    last_name: user?.last_name,
    partner_first_name: partner?.first_name,
    partner_last_name: partner?.last_name,
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
