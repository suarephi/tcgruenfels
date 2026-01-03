import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { deleteProfile, setProfileAdmin, getProfileById } from "@/lib/db";

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
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const userId = params.id;

  // Prevent self-deletion
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const targetProfile = await getProfileById(userId);
  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const deleted = await deleteProfile(userId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const userId = params.id;

  // Prevent changing own admin status
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot change your own admin status" },
      { status: 400 }
    );
  }

  const targetProfile = await getProfileById(userId);
  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { isAdmin } = await request.json();
    const updated = await setProfileAdmin(userId, isAdmin);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
