import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getAllProfiles, getUserBookingCount, getProfileById } from "@/lib/db";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const profiles = await getAllProfiles();

  // Add booking count for each user
  const usersWithStats = await Promise.all(
    profiles.map(async (p) => ({
      ...p,
      bookingCount: await getUserBookingCount(p.id),
    }))
  );

  return NextResponse.json({ users: usersWithStats });
}
