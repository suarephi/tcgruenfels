import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUsers, getUserBookingCount } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const users = await getAllUsers();

  // Add booking count for each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => ({
      ...user,
      bookingCount: await getUserBookingCount(user.id),
    }))
  );

  return NextResponse.json({ users: usersWithStats });
}
