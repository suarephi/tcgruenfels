import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getBookingsForDateRange,
  getUserBookingsForDate,
  getBookingByDateAndHour,
  createBooking,
  getProfileById,
} from "@/lib/db";
import { getActiveTournamentsForUser } from "@/lib/tournaments";

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

  // Check if user is a tournament participant
  const activeTournaments = await getActiveTournamentsForUser(user.id);
  const isTournamentPlayer = activeTournaments.length > 0;

  const startDate = getSwissDate(0);
  const endDate = getSwissDate(VIEW_DAYS - 1);
  console.log("Fetching bookings from", startDate, "to", endDate);
  const bookings = await getBookingsForDateRange(startDate, endDate);
  console.log("Found", bookings.length, "bookings");

  // Generate array of dates to display
  const dates = Array.from({ length: VIEW_DAYS }, (_, i) => getSwissDate(i));

  // Admins and tournament players can book any date, regular users only 3 days
  const maxBookableDate = (isAdmin || isTournamentPlayer) ? getSwissDate(VIEW_DAYS - 1) : getSwissDate(BOOK_DAYS - 1);

  return NextResponse.json({
    bookings,
    dates,
    maxBookableDate,
    currentUserId: user.id,
    isAdmin,
    isTournamentPlayer,
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

  // Check if user is a tournament participant
  const activeTournaments = await getActiveTournamentsForUser(user.id);
  const isTournamentPlayer = activeTournaments.length > 0;

  try {
    const { date, hour, partnerId, partnerIds, bookTwoHours, bookForUserId } = await request.json();

    // Allow admin to book on behalf of another user
    let userId = user.id;
    if (bookForUserId && isAdmin) {
      userId = bookForUserId;
    }

    // Support both old partnerId and new partnerIds array format
    // For now, only store the first partner (database schema limitation)
    const effectivePartnerId = partnerIds?.length > 0 ? partnerIds[0] : (partnerId || null);

    // Validate hour
    if (hour < 6 || hour > 21) {
      return NextResponse.json(
        { error: "Invalid hour. Must be between 6 and 21" },
        { status: 400 }
      );
    }

    // For 2-hour bookings, validate second hour too
    if (bookTwoHours && hour > 20) {
      return NextResponse.json(
        { error: "Cannot book 2 hours starting after 20:00" },
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

    // Check if date is within booking window (admins and tournament players bypass this)
    if (!isAdmin && !isTournamentPlayer && !isDateWithinBookingWindow(date)) {
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

    // For 2-hour bookings, check the second slot too
    if (bookTwoHours) {
      const existingSecondBooking = await getBookingByDateAndHour(date, hour + 1);
      if (existingSecondBooking) {
        return NextResponse.json(
          { error: "The second hour slot is already booked" },
          { status: 400 }
        );
      }
    }

    // Check if user already has a booking on this date (admins bypass this)
    // Tournament players can book 2 hours, so we allow up to 2 bookings
    if (!isAdmin) {
      const userBookings = await getUserBookingsForDate(userId, date);
      const maxBookingsAllowed = isTournamentPlayer ? 2 : 1;
      const bookingsToCreate = (bookTwoHours && isTournamentPlayer) ? 2 : 1;

      if (userBookings.length + bookingsToCreate > maxBookingsAllowed) {
        return NextResponse.json(
          { error: isTournamentPlayer ? "You can only book 2 hours per day as a tournament player" : "You can only book once per day" },
          { status: 400 }
        );
      }
    }

    // Create the first booking
    const bookingId = await createBooking(userId, date, hour, effectivePartnerId);

    // For 2-hour bookings, create the second booking
    if (bookTwoHours) {
      await createBooking(userId, date, hour + 1, effectivePartnerId);
    }

    return NextResponse.json({ id: bookingId }, { status: 201 });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
