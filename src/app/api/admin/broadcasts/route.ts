import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";
import { emailConfigured, sendEmail } from "@/server/email";

export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { results } = await db()
    .prepare("SELECT id, scope, subject, recipient_count, sent_count, status, created_at FROM broadcasts ORDER BY created_at DESC LIMIT 50")
    .all();
  return NextResponse.json({ broadcasts: results, emailConfigured: emailConfigured() });
}

/**
 * Compose a message to fans. Always stored. Delivered too when a provider is
 * configured — deduplicated by email, capped per request so one call can't run
 * unbounded. Without a provider it is saved and the admin exports recipients.
 */
const SEND_CAP = 200;

export async function POST(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = (await req.json()) as { scope?: string; subject?: string; body?: string };
  const subject = String(b.subject ?? "").trim();
  const body = String(b.body ?? "").trim();
  const scope = String(b.scope ?? "all");
  if (!subject || !body) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const d = db();
  const recipients = (
    scope === "all"
      ? await d.prepare("SELECT DISTINCT email FROM fans").all<{ email: string }>()
      : await d.prepare("SELECT DISTINCT email FROM fans WHERE film_id = ?").bind(scope).all<{ email: string }>()
  ).results.map((r) => r.email);

  let sent = 0;
  let status: "saved" | "sent" | "partial" = "saved";
  if (emailConfigured() && recipients.length > 0) {
    for (const email of recipients.slice(0, SEND_CAP)) {
      const res = await sendEmail(email, subject, body);
      if (res.ok) sent += 1;
    }
    status = sent === recipients.length ? "sent" : "partial";
  }

  const id = crypto.randomUUID();
  await d
    .prepare(
      "INSERT INTO broadcasts (id, scope, subject, body, recipient_count, sent_count, status, created_by) VALUES (?,?,?,?,?,?,?,?)",
    )
    .bind(id, scope, subject.slice(0, 200), body.slice(0, 5000), recipients.length, sent, status, admin.email)
    .run();

  return NextResponse.json({
    ok: true,
    recipients: recipients.length,
    sent,
    delivered: emailConfigured(),
  });
}
