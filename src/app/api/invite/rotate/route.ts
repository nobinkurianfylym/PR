import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { isAdmin } from "@/server/membership";

/** Mint or replace the campaign's invite link. Admin only; passing
 *  {disable:true} clears it so the old link stops working. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId || !(await isAdmin(user.id, filmId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { disable } = (await req.json().catch(() => ({}))) as { disable?: boolean };
  const token = disable ? null : crypto.randomUUID().replace(/-/g, "");
  await db().prepare("UPDATE films SET invite_token = ? WHERE id = ?").bind(token, filmId).run();
  return NextResponse.json({ inviteToken: token });
}
