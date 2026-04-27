import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, E-Mail und Nachricht sind erforderlich." },
        { status: 400 }
      );
    }

    const trimmed = {
      name: String(name).trim().slice(0, 200),
      email: String(email).trim().slice(0, 320),
      subject: subject ? String(subject).trim().slice(0, 200) : null,
      message: String(message).trim().slice(0, 5000),
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("Missing Supabase service credentials");
      return NextResponse.json(
        { error: "Serverkonfiguration unvollständig." },
        { status: 500 }
      );
    }

    const sb = createClient(url, serviceKey);
    const { error } = await sb.from("contact_messages").insert(trimmed);
    if (error) {
      console.error("Failed to insert contact message:", error);
      return NextResponse.json(
        { error: "Speichern fehlgeschlagen." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { error: "Senden fehlgeschlagen." },
      { status: 500 }
    );
  }
}
