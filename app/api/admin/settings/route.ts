import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProfileById } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// Default settings
const DEFAULT_SETTINGS = {
  bookingWindowDays: 3,
  viewWindowDays: 14,
  startHour: 6,
  endHour: 22,
  maxBookingsPerDay: 1,
};

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try to get settings from database, fall back to defaults
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .single();

  if (settings) {
    return NextResponse.json({
      bookingWindowDays: settings.booking_window_days,
      viewWindowDays: settings.view_window_days,
      startHour: settings.start_hour,
      endHour: settings.end_hour,
      maxBookingsPerDay: settings.max_bookings_per_day,
    });
  }

  return NextResponse.json(DEFAULT_SETTINGS);
}

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    bookingWindowDays,
    viewWindowDays,
    startHour,
    endHour,
    maxBookingsPerDay,
  } = body;

  // Validate inputs
  if (bookingWindowDays < 1 || bookingWindowDays > 30) {
    return NextResponse.json({ error: "Booking window must be 1-30 days" }, { status: 400 });
  }
  if (viewWindowDays < bookingWindowDays || viewWindowDays > 60) {
    return NextResponse.json({ error: "View window must be between booking window and 60 days" }, { status: 400 });
  }
  if (startHour < 0 || startHour > 23) {
    return NextResponse.json({ error: "Start hour must be 0-23" }, { status: 400 });
  }
  if (endHour < 1 || endHour > 24 || endHour <= startHour) {
    return NextResponse.json({ error: "End hour must be after start hour and max 24" }, { status: 400 });
  }
  if (maxBookingsPerDay < 1 || maxBookingsPerDay > 10) {
    return NextResponse.json({ error: "Max bookings per day must be 1-10" }, { status: 400 });
  }

  // Upsert settings (insert or update)
  const { error } = await supabase
    .from("settings")
    .upsert({
      id: 1,
      booking_window_days: bookingWindowDays,
      view_window_days: viewWindowDays,
      start_hour: startHour,
      end_hour: endHour,
      max_bookings_per_day: maxBookingsPerDay,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
