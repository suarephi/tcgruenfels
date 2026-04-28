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

  // Return users excluding current user (you can't be your own partner).
  // Sorted alphabetically by last name (then first name) for the partner
  // dropdown.
  const users = profiles
    .filter((p) => p.id !== user.id)
    .map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
    }))
    .sort((a, b) => {
      const lastCmp = (a.last_name || "").localeCompare(b.last_name || "", "de");
      if (lastCmp !== 0) return lastCmp;
      return (a.first_name || "").localeCompare(b.first_name || "", "de");
    });

  return NextResponse.json({ users });
}
