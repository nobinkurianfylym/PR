import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { deleteFilmCascade } from "@/server/film";
import { requireMasterAdmin } from "@/server/master-admin";

/**
 * Permanently delete a campaign, whoever owns it — every asset (D1 + R2),
 * fan, message and team membership tied to it. Master admin only. The film's
 * owner keeps their login; only this project is torn down.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const film = await db()
    .prepare("SELECT id FROM films WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();
  if (!film) return new NextResponse(null, { status: 204 });

  await deleteFilmCascade(id);
  return new NextResponse(null, { status: 204 });
}
