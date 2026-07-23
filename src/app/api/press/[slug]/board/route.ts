import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentFan } from "@/server/fan";
import { currentUser } from "@/server/auth";
import { isMember } from "@/server/membership";
import { isMasterAdminEmail } from "@/server/master-admin";

/**
 * The fan-club discussion board. Anyone can read; only a joined fan (by
 * cookie identity) can post; the film's team and the master admin can delete.
 * A comment wall, newest first — deliberately simple, refreshed by light
 * polling from the client rather than sockets.
 */
const MAX_LEN = 500;
const COOLDOWN_MS = 8000;

interface PostRow {
  id: string;
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

/** Is the current signed-in team user allowed to moderate this film's board? */
async function viewerIsAdmin(filmId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return isMasterAdminEmail(user.email) || (await isMember(user.id, filmId));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await filmBySlug(slug);
  if (!film) return NextResponse.json({ posts: [], canPost: false, isAdmin: false });

  const [{ results }, fan, isAdmin] = await Promise.all([
    db()
      .prepare(
        `SELECT p.id, p.body, p.created_at, f.name, f.city
           FROM fan_posts p JOIN fans f ON f.id = p.fan_id
          WHERE p.film_id = ?
          ORDER BY p.created_at DESC, p.rowid DESC
          LIMIT 200`,
      )
      .bind(film.id)
      .all<PostRow>(),
    currentFan(film.id),
    viewerIsAdmin(film.id),
  ]);

  return NextResponse.json({ posts: results, canPost: !!fan, isAdmin });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = await filmBySlug(slug);
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fan = await currentFan(film.id);
  if (!fan) {
    return NextResponse.json({ error: "Join the fan club to post." }, { status: 403 });
  }

  const body = String(((await req.json()) as { body?: string }).body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  if (body.length > MAX_LEN) {
    return NextResponse.json({ error: `Keep it under ${MAX_LEN} characters.` }, { status: 400 });
  }

  const database = db();
  // Light anti-flood: one post per fan per cooldown window.
  const last = await database
    .prepare("SELECT created_at FROM fan_posts WHERE fan_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(fan.id)
    .first<{ created_at: string }>();
  if (last && Date.now() - new Date(last.created_at.replace(" ", "T") + "Z").getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: "Slow down a moment before posting again." }, { status: 429 });
  }

  const id = crypto.randomUUID();
  await database
    .prepare("INSERT INTO fan_posts (id, film_id, fan_id, body) VALUES (?,?,?,?)")
    .bind(id, film.id, fan.id, body)
    .run();

  const post = await database
    .prepare(
      `SELECT p.id, p.body, p.created_at, f.name, f.city
         FROM fan_posts p JOIN fans f ON f.id = p.fan_id WHERE p.id = ?`,
    )
    .bind(id)
    .first<PostRow>();

  return NextResponse.json({ post }, { status: 201 });
}
