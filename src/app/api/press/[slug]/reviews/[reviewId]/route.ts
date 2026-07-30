import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentFan } from "@/server/fan";
import { currentUser } from "@/server/auth";
import { isMember } from "@/server/membership";
import { isMasterAdminEmail } from "@/server/master-admin";

/**
 * Remove an audience review. The film's team or a master admin can remove any
 * (moderation); a fan can remove their own (by cookie identity), so they can
 * retract what they wrote.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string; reviewId: string }> },
) {
  const { slug, reviewId } = await ctx.params;

  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();
  if (!film) return new NextResponse(null, { status: 204 });

  const review = await db()
    .prepare("SELECT fan_id FROM fan_reviews WHERE id = ? AND film_id = ?")
    .bind(reviewId, film.id)
    .first<{ fan_id: string }>();
  if (!review) return new NextResponse(null, { status: 204 });

  const user = await currentUser();
  const isAdmin = user && (isMasterAdminEmail(user.email) || (await isMember(user.id, film.id)));
  const fan = await currentFan(film.id);
  const isOwner = fan?.id === review.fan_id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db().prepare("DELETE FROM fan_reviews WHERE id = ?").bind(reviewId).run();
  return new NextResponse(null, { status: 204 });
}
