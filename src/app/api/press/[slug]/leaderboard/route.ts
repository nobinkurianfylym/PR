import { NextResponse } from "next/server";
import { db } from "@/server/db";

/** The film's top fans by points, for the public leaderboard. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ top: [], totalFans: 0 });

  const [top, total] = await Promise.all([
    db()
      .prepare(
        `SELECT name, city, points, shares FROM fans
          WHERE film_id = ? AND points > 0
          ORDER BY points DESC, created_at ASC LIMIT 10`,
      )
      .bind(film.id)
      .all<{ name: string; city: string; points: number; shares: number }>(),
    db().prepare("SELECT COUNT(*) n FROM fans WHERE film_id = ?").bind(film.id).first<{ n: number }>(),
  ]);

  return NextResponse.json({ top: top.results, totalFans: total?.n ?? 0 });
}
