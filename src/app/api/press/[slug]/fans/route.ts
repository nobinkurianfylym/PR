import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { award, currentFan, fanRank, setFanCookie } from "@/server/fan";

/**
 * Public fan-club sign-up. No account — anyone joins with an email. Idempotent
 * per film. On join we set the fan-identity cookie and grant the welcome
 * points, so the very first thing a new fan sees is a score and a rank.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = (await req.json()) as { name?: string; email?: string; city?: string };
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const database = db();
  await database
    .prepare(
      `INSERT INTO fans (id, film_id, name, email, city) VALUES (?,?,?,?,?)
       ON CONFLICT(film_id, email) DO UPDATE SET
         name = CASE WHEN excluded.name != '' THEN excluded.name ELSE fans.name END,
         city = CASE WHEN excluded.city != '' THEN excluded.city ELSE fans.city END`,
    )
    .bind(
      crypto.randomUUID(), film.id,
      String(b.name ?? "").trim().slice(0, 120),
      email,
      String(b.city ?? "").trim().slice(0, 80),
    )
    .run();

  const fan = await database
    .prepare("SELECT id FROM fans WHERE film_id = ? AND email = ?")
    .bind(film.id, email)
    .first<{ id: string }>();
  if (fan) {
    await setFanCookie(film.id, fan.id);
    await award(film.id, fan.id, "join", "welcome");
  }

  const me = await currentFan(film.id);
  const rank = me ? await fanRank(film.id, me.id) : null;
  return NextResponse.json({ ok: true, fan: me, rank }, { status: 201 });
}

/** The current fan for this film (from the cookie), with their rank. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ fan: null });

  const me = await currentFan(film.id);
  const rank = me ? await fanRank(film.id, me.id) : null;
  return NextResponse.json({ fan: me, rank });
}
