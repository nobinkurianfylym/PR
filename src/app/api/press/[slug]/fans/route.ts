import { NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * Public fan-club sign-up. No account — like the material-submission form,
 * anyone can join with an email. Idempotent per film, so a repeat sign-up is
 * a success, not a duplicate.
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

  await db()
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
