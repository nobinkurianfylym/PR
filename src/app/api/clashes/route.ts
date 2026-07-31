import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { firecrawlSearch } from "@/server/firecrawl";
import { rateLimit } from "@/server/rate-limit";

/**
 * Release-date clash radar — the highest-value real intel for an Indian
 * release. Searches the web for other films landing around your date in your
 * market and returns candidates for the producer to confirm. Nothing is saved
 * or asserted automatically: a clash only becomes real once the team logs it.
 */
function monthYear(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { market?: string };
  const film = await db()
    .prepare('SELECT title, language, release_date, market FROM films WHERE id = ?')
    .bind(filmId)
    .first<{ title: string; language: string; release_date: string; market: string }>();
  if (!film) return NextResponse.json({ error: "Film not found" }, { status: 404 });

  // Persist the market when the producer sets it, so it's remembered.
  const market = (body.market ?? film.market ?? "").trim().slice(0, 80);
  if (market && market !== film.market) {
    await db().prepare("UPDATE films SET market = ? WHERE id = ?").bind(market, filmId).run();
  }

  if (!(await rateLimit(`clash:${filmId}`, 10, 3600))) {
    return NextResponse.json({ error: "Scan limit reached. Try again later." }, { status: 429 });
  }

  const my = monthYear(film.release_date);
  const region = market || film.language || "India";
  const query = [region, "movies releasing", my, "cinema release date"].filter(Boolean).join(" ");

  let results;
  try {
    results = await firecrawlSearch(query, 15);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the web crawler. Check the Firecrawl key.", configured: false }, { status: 502 });
  }

  // Drop results that obviously point back at this film.
  const t = film.title.toLowerCase();
  const candidates = results
    .filter((r) => !(r.title.toLowerCase().includes(t)))
    .slice(0, 12);

  return NextResponse.json({ market: region, releaseMonth: my, candidates });
}
