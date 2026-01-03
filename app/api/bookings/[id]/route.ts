import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getBookingById, deleteBooking, getProfileById } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  const isAdmin = profile?.is_admin || false;

  const bookingId = parseInt(params.id);
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Allow users to delete their own bookings, or admins to delete any booking
  if (!isAdmin && booking.user_id !== user.id) {
    return NextResponse.json(
      { error: "You can only cancel your own bookings" },
      { status: 403 }
    );
  }

  const deleted = await deleteBooking(bookingId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
