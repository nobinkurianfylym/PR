import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { firecrawlSearch } from "@/server/firecrawl";
import { platformFromUrl } from "@/lib/platforms";

/**
 * Crawl the web for real coverage of the active film and drop it into the
 * team's review inbox as pending links. Nothing goes public here — the team
 * approves what's genuine, exactly like a public submission. Deduped against
 * links already on file so re-running only adds what's new.
 */
const SOCIAL = new Set(["instagram", "x", "facebook", "reddit", "linkedin", "pinterest"]);
const MAX_ADD = 24;

/** Rough kind from the domain — the team can still relabel on approval. */
function classify(url: string): string {
  const p = platformFromUrl(url);
  if (p && SOCIAL.has(p)) return "Social post";
  return "Review";
}

/** Normalised URL for dedup — protocol / www / trailing slash / hash removed. */
function norm(u: string): string {
  return u
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("#")[0]!
    .replace(/\/+$/, "");
}

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign selected" }, { status: 400 });

  const film = await db()
    .prepare("SELECT title, language, release_date FROM films WHERE id = ?")
    .bind(filmId)
    .first<{ title: string; language: string; release_date: string }>();
  if (!film) return NextResponse.json({ error: "Film not found" }, { status: 404 });

  // Film-specific query: title, year and language keep results on this film.
  const year = (film.release_date ?? "").slice(0, 4);
  const query = [film.title, year, film.language, "movie review rating"]
    .filter(Boolean)
    .join(" ");

  let results;
  try {
    results = await firecrawlSearch(query, 20);
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the web crawler. Check the Firecrawl key." },
      { status: 502 },
    );
  }

  const { results: existing } = await db()
    .prepare("SELECT url FROM shared_links WHERE film_id = ?")
    .bind(filmId)
    .all<{ url: string }>();
  const seen = new Set(existing.map((r) => norm(r.url)));

  const database = db();
  const inserts = [];
  for (const r of results) {
    const key = norm(r.url);
    if (seen.has(key)) continue;
    seen.add(key);
    inserts.push(
      database
        .prepare(
          `INSERT INTO shared_links (id, film_id, url, kind, note, submitted_by, status, label)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .bind(
          crypto.randomUUID(),
          filmId,
          r.url,
          classify(r.url),
          r.description.slice(0, 400),
          "Web crawler",
          "pending",
          r.title.slice(0, 160),
        ),
    );
    if (inserts.length >= MAX_ADD) break;
  }
  if (inserts.length > 0) await database.batch(inserts);

  return NextResponse.json({ found: results.length, added: inserts.length });
}
