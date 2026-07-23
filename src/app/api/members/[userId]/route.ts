import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { isAdmin } from "@/server/membership";

export async function DELETE(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId || !(await isAdmin(user.id, filmId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await ctx.params;

  // Never leave a campaign with no admin.
  const target = await db()
    .prepare("SELECT role FROM film_members WHERE film_id = ? AND user_id = ?")
    .bind(filmId, userId)
    .first<{ role: string }>();
  if (target?.role === "admin") {
    const admins = await db()
      .prepare("SELECT COUNT(*) n FROM film_members WHERE film_id = ? AND role = 'admin'")
      .bind(filmId)
      .first<{ n: number }>();
    if ((admins?.n ?? 0) <= 1) {
      return NextResponse.json({ error: "Can't remove the only admin" }, { status: 400 });
    }
  }

  await db()
    .prepare("DELETE FROM film_members WHERE film_id = ? AND user_id = ?")
    .bind(filmId, userId)
    .run();
  return new NextResponse(null, { status: 204 });
}
