import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { fanCookieName, refCookieName, visitorCookieName } from "@/server/fan";

/**
 * Records that a fan's share link (`?ref=<fanId>`) brought this visitor. Counts
 * one visit per unique visitor per referrer, and drops a ref cookie so a later
 * sign-up is credited to the same referrer. Ignores a fan referring themselves.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ ok: false });

  const ref = String(((await req.json()) as { ref?: string }).ref ?? "").trim();
  if (!ref) return NextResponse.json({ ok: false });

  const store = await cookies();
  // Self-referral: the visitor is already this fan.
  if (store.get(fanCookieName(film.id))?.value === ref) return NextResponse.json({ ok: true });

  const referrer = await db()
    .prepare("SELECT id FROM fans WHERE id = ? AND film_id = ?")
    .bind(ref, film.id)
    .first<{ id: string }>();
  if (!referrer) return NextResponse.json({ ok: false });

  // Stable per-browser visitor key so refreshes don't inflate the count.
  let visitorKey = store.get(visitorCookieName(film.id))?.value;
  if (!visitorKey) {
    visitorKey = crypto.randomUUID();
    store.set(visitorCookieName(film.id), visitorKey, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }

  const res = (await db()
    .prepare(
      "INSERT OR IGNORE INTO fan_referrals (id, film_id, referrer_id, visitor_key) VALUES (?,?,?,?)",
    )
    .bind(crypto.randomUUID(), film.id, ref, visitorKey)
    .run()) as { meta?: { changes?: number } };
  if (res.meta?.changes) {
    await db().prepare("UPDATE fans SET ref_visits = ref_visits + 1 WHERE id = ?").bind(ref).run();
  }

  // Remember the referrer for an eventual sign-up.
  store.set(refCookieName(film.id), ref, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
