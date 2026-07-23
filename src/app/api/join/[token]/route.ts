import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { addMember, isMember } from "@/server/membership";
import { setActiveFilm } from "@/server/film";

/**
 * Redeem an invite. The invite page only calls this once the visitor is
 * signed in, so a valid token adds them to the campaign, makes it their
 * active one, and hands back where to land.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await ctx.params;

  const film = await db()
    .prepare("SELECT id, title FROM films WHERE invite_token = ?")
    .bind(token)
    .first<{ id: string; title: string }>();
  if (!film) return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });

  if (!(await isMember(user.id, film.id))) {
    await addMember(film.id, user.id, "member");
  }
  await setActiveFilm(film.id);
  return NextResponse.json({ ok: true, title: film.title });
}
