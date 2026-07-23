import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { isMember } from "@/server/membership";
import { isMasterAdminEmail } from "@/server/master-admin";

/**
 * Remove a fan post. Moderation only — the film's own team or a master admin.
 * Fans cannot delete (their identity is a cookie, not an account); they report
 * to the team instead.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId } = await ctx.params;

  const post = await db()
    .prepare("SELECT film_id FROM fan_posts WHERE id = ?")
    .bind(postId)
    .first<{ film_id: string }>();
  if (!post) return new NextResponse(null, { status: 204 });

  const allowed = isMasterAdminEmail(user.email) || (await isMember(user.id, post.film_id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db().prepare("DELETE FROM fan_posts WHERE id = ?").bind(postId).run();
  return new NextResponse(null, { status: 204 });
}
