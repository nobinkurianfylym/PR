import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { planCampaign } from "@/server/brain";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const film = await db()
    .prepare("SELECT f.id, f.release_date FROM films f JOIN film_members m ON m.film_id = f.id WHERE f.id = ? AND m.user_id = ?")
    .bind(id, user.id)
    .first<{ id: string; release_date: string }>();
  if (!film) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = (await req.json()) as Record<string, unknown>;
  const title = String(b.title ?? "").trim();
  const releaseDate = String(b.releaseDate ?? "");
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return NextResponse.json({ error: "Title and release date are required" }, { status: 400 });
  }

  await db()
    .prepare(
      `UPDATE films SET title=?, genre=?, language=?, budget=?, marketing_budget=?,
       release_date=?, poster_url=?, trailer_url=?, cast=?, crew=? WHERE id=?`,
    )
    .bind(
      title, String(b.genre ?? ""), String(b.language ?? ""),
      Number(b.budget ?? 0), Number(b.marketingBudget ?? 0),
      releaseDate, String(b.posterUrl ?? ""), String(b.trailerUrl ?? ""),
      String(b.cast ?? ""), String(b.crew ?? ""), id,
    )
    .run();

  // A moved release date re-paces the whole publicity arc.
  if (releaseDate !== film.release_date) {
    const database = db();
    await database.prepare("DELETE FROM phases WHERE film_id = ?").bind(id).run();
    await database.batch(
      planCampaign(releaseDate).map((p) =>
        database
          .prepare("INSERT INTO phases (id, film_id, phase, date, summary, sort) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, p.phase, p.date, p.summary, p.sort),
      ),
    );
  }
  return NextResponse.json({ ok: true, replanned: releaseDate !== film.release_date });
}
