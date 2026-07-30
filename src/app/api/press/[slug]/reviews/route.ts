import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentFan } from "@/server/fan";
import { currentUser } from "@/server/auth";
import { isMember } from "@/server/membership";
import { isMasterAdminEmail } from "@/server/master-admin";

/**
 * Audience reviews on the public fan page. Anyone can read; only a joined fan
 * (by cookie identity) can write; the film's team and the master admin can
 * remove any. One review per fan per film — writing again edits theirs — so the
 * wall stays a genuine roll of distinct fans, not a spammable feed.
 */
const MAX_LEN = 600;

interface ReviewRow {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  name: string;
  city: string;
}

async function filmBySlug(slug: string) {
  return db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
}

async function viewerIsAdmin(filmId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return isMasterAdminEmail(user.email) || (await isMember(user.id, filmId));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await filmBySlug(slug);
  if (!film) return NextResponse.json({ reviews: [], canReview: false, isAdmin: false, mine: null });

  const [{ results }, fan, isAdmin] = await Promise.all([
    db()
      .prepare(
        `SELECT r.id, r.rating, r.body, r.created_at, f.name, f.city
           FROM fan_reviews r JOIN fans f ON f.id = r.fan_id
          WHERE r.film_id = ?
          ORDER BY r.created_at DESC, r.rowid DESC
          LIMIT 200`,
      )
      .bind(film.id)
      .all<ReviewRow>(),
    currentFan(film.id),
    viewerIsAdmin(film.id),
  ]);

  // The current fan's own review, so the form can prefill for editing.
  const mine = fan
    ? await db()
        .prepare("SELECT id, rating, body FROM fan_reviews WHERE film_id = ? AND fan_id = ?")
        .bind(film.id, fan.id)
        .first<{ id: string; rating: number; body: string }>()
    : null;

  return NextResponse.json({ reviews: results, canReview: !!fan, isAdmin, mine: mine ?? null });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await filmBySlug(slug);
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fan = await currentFan(film.id);
  if (!fan) {
    return NextResponse.json({ error: "Join the fan club to write a review." }, { status: 403 });
  }

  const b = (await req.json()) as { rating?: number; body?: string };
  const rating = Number(b.rating);
  const body = String(b.body ?? "").trim();
  if (!(rating >= 0.5 && rating <= 5)) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: "Write a few words first." }, { status: 400 });
  if (body.length > MAX_LEN) {
    return NextResponse.json({ error: `Keep it under ${MAX_LEN} characters.` }, { status: 400 });
  }

  const database = db();
  // One per fan: a second submission edits the first.
  await database
    .prepare(
      `INSERT INTO fan_reviews (id, film_id, fan_id, rating, body)
       VALUES (?,?,?,?,?)
       ON CONFLICT(film_id, fan_id)
       DO UPDATE SET rating = excluded.rating, body = excluded.body, created_at = datetime('now')`,
    )
    .bind(crypto.randomUUID(), film.id, fan.id, rating, body)
    .run();

  const review = await database
    .prepare(
      `SELECT r.id, r.rating, r.body, r.created_at, f.name, f.city
         FROM fan_reviews r JOIN fans f ON f.id = r.fan_id
        WHERE r.film_id = ? AND r.fan_id = ?`,
    )
    .bind(film.id, fan.id)
    .first<ReviewRow>();

  return NextResponse.json({ review }, { status: 201 });
}
