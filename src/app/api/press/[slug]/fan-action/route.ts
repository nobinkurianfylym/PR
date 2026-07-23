import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { award, currentFan, fanRank } from "@/server/fan";

/**
 * Award points when a signed-in fan shares official content. The share itself
 * happens on an external platform we can't observe, so this rewards the act of
 * sharing from the page — deduped per unique item so it can't be farmed.
 * Silently no-ops for a visitor who hasn't joined.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const me = await currentFan(film.id);
  if (!me) return NextResponse.json({ fan: null });

  const { detail } = (await req.json()) as { detail?: string };
  const granted = await award(film.id, me.id, "share", String(detail ?? "share").slice(0, 200));

  const fresh = await currentFan(film.id);
  const rank = fresh ? await fanRank(film.id, fresh.id) : null;
  return NextResponse.json({ fan: fresh, rank, granted });
}
