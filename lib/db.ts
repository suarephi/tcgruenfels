import { supabase } from "./supabase";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  date: string;
  hour: number;
  created_at: string;
  username?: string;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function getUserById(id: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function createUser(
  username: string,
  passwordHash: string,
  isAdmin: boolean = false
): Promise<number> {
  const { data, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash, is_admin: isAdmin })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as User[];
}

export async function deleteUser(id: number): Promise<boolean> {
  // Bookings will be deleted automatically due to ON DELETE CASCADE
  const { error } = await supabase.from("users").delete().eq("id", id);
  return !error;
}

export async function setUserAdmin(id: number, isAdmin: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("users")
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
      users!inner(username)
    `)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("hour");

  if (error) return [];

  // Flatten the username from the joined users table
  return data.map((booking) => ({
    id: booking.id,
    user_id: booking.user_id,
    date: booking.date,
    hour: booking.hour,
    created_at: booking.created_at,
    username: booking.users.username,
  }));
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      users!inner(username)
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
    username: data.users.username,
  };
}

export async function getUserBookingsForDate(
  userId: number,
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
  userId: number,
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

export async function getUserBookingCount(userId: number): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count || 0;
}
