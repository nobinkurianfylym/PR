import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { currentFan, mintFanToken } from "@/server/fan";
import { sendEmail } from "@/server/email";
import { clientIp, rateLimit } from "@/server/rate-limit";

/**
 * Email a magic sign-in link. Used to verify a fan's email (prize eligibility)
 * and to log in on another device. Identifies the fan by their cookie, or by
 * the email they type. Always returns ok so it never reveals who's a fan.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id, title FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string; title: string }>();
  if (!film) return NextResponse.json({ ok: true });

  if (!(await rateLimit(`fanverify:ip:${await clientIp()}`, 8, 3600))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const me = await currentFan(film.id);
  let fan: { id: string; email: string } | null = me ? { id: me.id, email: me.email } : null;
  if (!fan) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (email) {
      fan = await db()
        .prepare("SELECT id, email FROM fans WHERE film_id = ? AND email = ?")
        .bind(film.id, email)
        .first<{ id: string; email: string }>();
    }
  }

  if (fan) {
    const token = await mintFanToken(film.id, fan.id);
    const host = (await headers()).get("host") ?? "";
    const base = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
    const link = `${base}/fan/${slug}/verify?token=${token}`;
    await sendEmail(
      fan.email,
      `Your ${film.title} fan club sign-in link`,
      `Tap to sign in to the ${film.title} fan club and verify your email:\n\n${link}\n\nThe link expires in 30 minutes. If you didn't request it, you can ignore this email.`,
    );
  }

  return NextResponse.json({ ok: true });
}
