import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { PLATFORM_BY_ID } from "@/lib/platforms";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ links: [] });
  const { results } = await db()
    .prepare("SELECT platform, url FROM film_links WHERE film_id = ?")
    .bind(filmId)
    .all();
  return NextResponse.json({ links: results });
}

/**
 * Replaces the active campaign's official pages wholesale — the editor sends
 * the full set, blanks removed. Only known platforms and http(s) URLs land.
 */
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const { links } = (await req.json()) as { links?: { platform: string; url: string }[] };
  const clean = (links ?? [])
    .map((l) => ({ platform: String(l.platform), url: String(l.url ?? "").trim() }))
    .filter((l) => PLATFORM_BY_ID.has(l.platform) && /^https?:\/\/\S+$/i.test(l.url));

  const invalid = (links ?? []).filter(
    (l) => String(l.url ?? "").trim() !== "" && !clean.some((c) => c.platform === l.platform),
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Enter a full URL starting with https:// for ${invalid.map((i) => i.platform).join(", ")}` },
      { status: 400 },
    );
  }

  const database = db();
  await database.prepare("DELETE FROM film_links WHERE film_id = ?").bind(filmId).run();
  if (clean.length > 0) {
    await database.batch(
      clean.map((l) =>
        database
          .prepare("INSERT INTO film_links (id, film_id, platform, url) VALUES (?,?,?,?)")
          .bind(crypto.randomUUID(), filmId, l.platform, l.url),
      ),
    );
  }
  return NextResponse.json({ ok: true, count: clean.length });
}
