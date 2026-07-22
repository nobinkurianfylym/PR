import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { SHARED_LINK_KINDS } from "@/lib/platforms";

/**
 * A link shared with the production team from the public press kit — a
 * published review, a social post, any coverage. Open to anyone while the
 * campaign accepts submissions; capped so an open kit can't be spammed.
 */
const MAX_PENDING = 200;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const database = db();

  const film = await database
    .prepare("SELECT id, submissions_open FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string; submissions_open: number }>();
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (film.submissions_open !== 1) {
    return NextResponse.json(
      { error: "This press kit is not accepting submissions." },
      { status: 403 },
    );
  }

  const b = (await req.json()) as {
    url?: string; kind?: string; note?: string; submittedBy?: string;
  };
  const url = String(b.url ?? "").trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    return NextResponse.json(
      { error: "Enter a full link starting with https://" },
      { status: 400 },
    );
  }
  const kind = SHARED_LINK_KINDS.includes(b.kind ?? "") ? b.kind! : "Other";

  const count = await database
    .prepare("SELECT COUNT(*) AS n FROM shared_links WHERE film_id = ?")
    .bind(film.id)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_PENDING) {
    return NextResponse.json(
      { error: "The team's inbox is full. Please try again later." },
      { status: 429 },
    );
  }

  await database
    .prepare(
      "INSERT INTO shared_links (id, film_id, url, kind, note, submitted_by) VALUES (?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(), film.id, url, kind,
      String(b.note ?? "").slice(0, 400), String(b.submittedBy ?? "").slice(0, 120),
    )
    .run();

  return NextResponse.json({ ok: true }, { status: 201 });
}
