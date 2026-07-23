import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { PLATFORM_BY_ID, platformsIn } from "@/lib/platforms";
import { resolvePreviewImage } from "@/server/preview-image";

// Music links get an album-art thumbnail on the press kit, so we resolve
// their og:image on save. Everything else keeps text-only chips.
const MUSIC_PLATFORMS = new Set(platformsIn("music").map((p) => p.id));

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

  // Reuse an existing thumbnail when a music link's URL is unchanged; only
  // fetch og:image for new or changed music links.
  const existing = await database
    .prepare("SELECT platform, url, image FROM film_links WHERE film_id = ?")
    .bind(filmId)
    .all<{ platform: string; url: string; image: string }>();
  const prior = new Map(existing.results.map((r) => [`${r.platform}|${r.url}`, r.image]));

  const withImages = await Promise.all(
    clean.map(async (l) => {
      if (!MUSIC_PLATFORMS.has(l.platform)) return { ...l, image: "" };
      const cached = prior.get(`${l.platform}|${l.url}`);
      return { ...l, image: cached || (await resolvePreviewImage(l.url)) };
    }),
  );

  await database.prepare("DELETE FROM film_links WHERE film_id = ?").bind(filmId).run();
  if (withImages.length > 0) {
    await database.batch(
      withImages.map((l) =>
        database
          .prepare("INSERT INTO film_links (id, film_id, platform, url, image) VALUES (?,?,?,?,?)")
          .bind(crypto.randomUUID(), filmId, l.platform, l.url, l.image),
      ),
    );
  }
  return NextResponse.json({ ok: true, count: withImages.length });
}
