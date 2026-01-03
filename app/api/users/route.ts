import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getAllProfiles } from "@/lib/db";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await getAllProfiles();

  // Return users excluding current user (you can't be your own partner)
  const users = profiles
    .filter((p) => p.id !== user.id)
    .map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
    }));

  return NextResponse.json({ users });
}
