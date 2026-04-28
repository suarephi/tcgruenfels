import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getBookingsForDateRange,
  getUserBookingsForDate,
  getOverlappingBooking,
  createBooking,
  getProfileById,
} from "@/lib/db";
import { getActiveTournamentsForUser } from "@/lib/tournaments";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function notifyPartner(opts: {
  partnerId: string;
  bookerName: string;
  date: string;
  hour: number;
  minute: number;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supabaseUrl || !serviceKey) return;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.admin.getUserById(opts.partnerId);
  if (error || !data?.user?.email) return;
  const partnerEmail = data.user.email;
  // Skip placeholder accounts (training, etc.)
  if (partnerEmail.endsWith("@tcgruenfels.local") || partnerEmail.endsWith("@skedda.test")) return;

  const fromEmail = process.env.CONTACT_FROM_EMAIL || "noreply@tcgf.ch";
  const startMin = opts.hour * 60 + opts.minute;
  const endMin = startMin + 60;
  const fmtTime = (m: number) =>
    `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
  const dateStr = new Date(opts.date + "T12:00:00").toLocaleDateString("de-CH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = `
    <p>${escapeHtml(opts.bookerName)} hat dich als Mitspieler für eine Platzbuchung am TC Grünfels eingetragen.</p>
    <p><strong>${escapeHtml(dateStr)}</strong><br>${fmtTime(startMin)} – ${fmtTime(endMin)}</p>
    <p>Du findest die Buchung in deinem Mitgliederbereich unter „Meine Buchungen".</p>
    <p><a href="https://tcgf.ch/my-bookings">https://tcgf.ch/my-bookings</a></p>
  `;

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "TC Grünfels", email: fromEmail },
      to: [{ email: partnerEmail }],
      subject: `Du wurdest zu einer Platzbuchung hinzugefügt — ${dateStr}, ${fmtTime(startMin)}`,
      htmlContent: html,
    }),
  }).catch((e) => console.error("Brevo notify partner failed:", e));
}

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
    const { date, hour, minute: rawMinute, partnerId, partnerIds, bookTwoHours, bookForUserId, notes } = await request.json();
    const minute = rawMinute === 30 ? 30 : 0;

    // Allow admin to book on behalf of another user
    let userId = user.id;
    if (bookForUserId && isAdmin) {
      userId = bookForUserId;
    }

    // Support both old partnerId and new partnerIds array format
    // For now, only store the first partner (database schema limitation)
    const effectivePartnerId = partnerIds?.length > 0 ? partnerIds[0] : (partnerId || null);

    // Validate slot start. Last bookable :00 start is 21:00 (21:00–22:00).
    // Last bookable :30 start is 20:30 (20:30–21:30) — 21:30 would end past
    // close at 22:30.
    if (hour < 6 || hour > 21 || (minute === 30 && hour > 20)) {
      return NextResponse.json(
        { error: "Invalid time. Slots run 06:00–22:00 in 30-minute steps." },
        { status: 400 }
      );
    }

    // For 2-hour bookings, the second slot starts (hour+1, minute) and
    // covers another 60 minutes. Last allowed first-slot start is 20:00 for
    // :00, 19:30 for :30 (so the second slot doesn't run past 22:00).
    if (bookTwoHours && (hour > 20 || (minute === 30 && hour > 19))) {
      return NextResponse.json(
        { error: "Cannot book 2 hours that close to closing time." },
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

    // Check if slot overlaps any existing booking
    const existingBooking = await getOverlappingBooking(date, hour, minute);
    if (existingBooking) {
      return NextResponse.json(
        { error: "This time slot overlaps with an existing booking" },
        { status: 400 }
      );
    }

    // For 2-hour bookings, check the second slot too
    if (bookTwoHours) {
      const existingSecondBooking = await getOverlappingBooking(date, hour + 1, minute);
      if (existingSecondBooking) {
        return NextResponse.json(
          { error: "The second hour slot overlaps with an existing booking" },
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
    const bookingId = await createBooking(userId, date, hour, minute, effectivePartnerId, notes || null);

    // For 2-hour bookings, create the second booking
    if (bookTwoHours) {
      await createBooking(userId, date, hour + 1, minute, effectivePartnerId, notes || null);
    }

    // Notify all partners in the partnerIds list (for doubles, multiple).
    // Best-effort — failures are logged but don't surface to the client.
    const partnersToNotify = (partnerIds && partnerIds.length > 0)
      ? partnerIds
      : (partnerId ? [partnerId] : []);
    if (partnersToNotify.length > 0) {
      const bookerProfile = await getProfileById(userId);
      const bookerName = bookerProfile
        ? `${bookerProfile.first_name} ${bookerProfile.last_name}`.trim()
        : "Ein Mitglied";
      await Promise.allSettled(
        partnersToNotify.map((pid: string) =>
          notifyPartner({ partnerId: pid, bookerName, date, hour, minute })
        )
      );
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
