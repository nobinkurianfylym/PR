import { NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * Public leaderboards: fans by points ("Biggest fans") and by referrals
 * ("Top sharers" — who actually brought new fans in), plus the fan count.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ top: [], sharers: [], totalFans: 0 });

  const [top, sharers, total] = await Promise.all([
    db()
      .prepare(
        `SELECT name, city, points, shares, verified FROM fans
          WHERE film_id = ? AND points > 0
          ORDER BY points DESC, created_at ASC LIMIT 10`,
      )
      .bind(film.id)
      .all<{ name: string; city: string; points: number; shares: number; verified: number }>(),
    db()
      .prepare(
        `SELECT name, city, ref_joins, ref_visits, verified FROM fans
          WHERE film_id = ? AND (ref_joins > 0 OR ref_visits > 0)
          ORDER BY ref_joins DESC, ref_visits DESC, created_at ASC LIMIT 10`,
      )
      .bind(film.id)
      .all<{ name: string; city: string; ref_joins: number; ref_visits: number; verified: number }>(),
    db().prepare("SELECT COUNT(*) n FROM fans WHERE film_id = ?").bind(film.id).first<{ n: number }>(),
  ]);

  return NextResponse.json({
    top: top.results,
    sharers: sharers.results,
    totalFans: total?.n ?? 0,
  });
}
