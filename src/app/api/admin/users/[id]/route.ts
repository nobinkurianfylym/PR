import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { deleteFilmCascade } from "@/server/film";
import { isMasterAdminEmail, requireMasterAdmin } from "@/server/master-admin";

/**
 * Delete a login and everything it solely owns. Master admins and your own
 * account are protected. Every campaign the user created is torn down with it —
 * D1 rows and the R2 files behind its assets — so no orphans are left. Their
 * membership of other people's campaigns is simply removed.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const target = await db()
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string; email: string }>();
  if (!target) return new NextResponse(null, { status: 204 });
  if (target.id === admin.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }
  if (isMasterAdminEmail(target.email)) {
    return NextResponse.json({ error: "Admin accounts can't be deleted here." }, { status: 400 });
  }

  const d = db();
  const { results: films } = await d
    .prepare("SELECT id FROM films WHERE user_id = ?")
    .bind(id)
    .all<{ id: string }>();

  for (const { id: filmId } of films) {
    await deleteFilmCascade(filmId);
  }

  await d.prepare("DELETE FROM film_members WHERE user_id = ?").bind(id).run();
  await d.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  await d.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

  return new NextResponse(null, { status: 204 });
}
