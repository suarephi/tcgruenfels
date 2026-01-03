import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getBookingsForDateRange,
  getUserBookingsForDate,
  getBookingByDateAndHour,
  createBooking,
  getProfileById,
} from "@/lib/db";

// Swiss timezone
const TIMEZONE = "Europe/Zurich";

function getSwissDate(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

function isDateWithinBookingWindow(date: string): boolean {
  const today = getSwissDate(0);
  const maxDate = getSwissDate(2); // Today + 2 days = 3 days total
  return date >= today && date <= maxDate;
}

function isDateInFuture(date: string): boolean {
  const today = getSwissDate(0);
  return date >= today;
}

const VIEW_DAYS = 14; // Show 2 weeks of calendar
const BOOK_DAYS = 3;  // Can only book 3 days ahead (regular users)

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  const isAdmin = profile?.is_admin || false;

  const startDate = getSwissDate(0);
  const endDate = getSwissDate(VIEW_DAYS - 1);
  const bookings = await getBookingsForDateRange(startDate, endDate);

  // Generate array of dates to display
  const dates = Array.from({ length: VIEW_DAYS }, (_, i) => getSwissDate(i));

  // Admins can book any date, regular users only 3 days
  const maxBookableDate = isAdmin ? getSwissDate(VIEW_DAYS - 1) : getSwissDate(BOOK_DAYS - 1);

  return NextResponse.json({
    bookings,
    dates,
    maxBookableDate,
    currentUserId: user.id,
    isAdmin,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  const isAdmin = profile?.is_admin || false;

  try {
    const { date, hour, partnerId } = await request.json();
    const userId = user.id;

    // Validate hour
    if (hour < 6 || hour > 21) {
      return NextResponse.json(
        { error: "Invalid hour. Must be between 6 and 21" },
        { status: 400 }
      );
    }

    // Check if date is valid (must be in the future)
    if (!isDateInFuture(date)) {
      return NextResponse.json(
        { error: "Cannot book dates in the past" },
        { status: 400 }
      );
    }

    // Check if date is within booking window (admins bypass this)
    if (!isAdmin && !isDateWithinBookingWindow(date)) {
      return NextResponse.json(
        { error: "Can only book within the next 3 days" },
        { status: 400 }
      );
    }

    // Check if slot is already taken
    const existingBooking = await getBookingByDateAndHour(date, hour);
    if (existingBooking) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 400 }
      );
    }

    // Check if user already has a booking on this date (admins bypass this)
    if (!isAdmin) {
      const userBookings = await getUserBookingsForDate(userId, date);
      if (userBookings.length > 0) {
        return NextResponse.json(
          { error: "You can only book once per day" },
          { status: 400 }
        );
      }
    }

    const bookingId = await createBooking(userId, date, hour, partnerId || null);

    return NextResponse.json({ id: bookingId }, { status: 201 });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
