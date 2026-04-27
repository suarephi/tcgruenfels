import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RequestType = "general" | "membership";
type MembershipType = "einzel" | "familie";

interface ContactPayload {
  type: RequestType;
  membership_type: MembershipType | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
}

const MEMBERSHIP_LABEL: Record<MembershipType, string> = {
  einzel: "Einzelmitgliedschaft (CHF 430)",
  familie: "Familienmitgliedschaft (CHF 550)",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function forwardToBrevo(payload: ContactPayload) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const fromEmail = process.env.CONTACT_FROM_EMAIL || "noreply@tcgf.ch";
  const toEmail = process.env.CONTACT_TO_EMAIL || "tcgrunfels@gmail.com";

  const tagPrefix = payload.type === "membership" ? "Mitgliedschaft" : "Webformular";
  const subject = payload.subject
    ? `[${tagPrefix}] ${payload.subject}`
    : `[${tagPrefix}] Anfrage von ${payload.name}`;

  const membershipLabel = payload.membership_type
    ? MEMBERSHIP_LABEL[payload.membership_type]
    : null;

  const htmlContent = `
    <p><strong>Anfrage-Typ:</strong> ${payload.type === "membership" ? "Mitgliedschaftsanfrage" : "Allgemeine Anfrage"}</p>
    ${membershipLabel ? `<p><strong>Mitgliedschaftsart:</strong> ${escapeHtml(membershipLabel)}</p>` : ""}
    <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
    <p><strong>E-Mail:</strong> <a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></p>
    ${payload.phone ? `<p><strong>Telefon:</strong> ${escapeHtml(payload.phone)}</p>` : ""}
    ${payload.subject ? `<p><strong>Betreff:</strong> ${escapeHtml(payload.subject)}</p>` : ""}
    <p><strong>Nachricht:</strong></p>
    <p style="white-space: pre-wrap;">${escapeHtml(payload.message)}</p>
  `;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "TC Grünfels Webformular", email: fromEmail },
      to: [{ email: toEmail }],
      replyTo: { email: payload.email, name: payload.name },
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${body}`);
  }
}

export async function POST(request: Request) {
  try {
    const { type, membershipType, name, email, phone, subject, message } =
      await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, E-Mail und Nachricht sind erforderlich." },
        { status: 400 }
      );
    }

    const requestType: RequestType = type === "membership" ? "membership" : "general";
    const validatedMembership: MembershipType | null =
      requestType === "membership" && (membershipType === "einzel" || membershipType === "familie")
        ? membershipType
        : null;

    const trimmed: ContactPayload = {
      type: requestType,
      membership_type: validatedMembership,
      name: String(name).trim().slice(0, 200),
      email: String(email).trim().slice(0, 320),
      phone: phone ? String(phone).trim().slice(0, 50) : null,
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

    // Best-effort email forwarding. The DB row already exists, so we don't
    // surface a Brevo failure to the user — the admin can still see the
    // message in /admin/messages.
    try {
      await forwardToBrevo(trimmed);
    } catch (e) {
      console.error("Brevo forwarding failed:", e);
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
