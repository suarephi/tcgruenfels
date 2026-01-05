import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Default settings
const DEFAULT_SETTINGS = {
  bookingWindowDays: 3,
  viewWindowDays: 14,
  startHour: 6,
  endHour: 22,
  maxBookingsPerDay: 1,
};

export async function GET() {
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
