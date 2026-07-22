import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/** Opens or closes public submissions on the active campaign. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { open } = (await req.json()) as { open?: boolean };
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });
  await db()
    .prepare("UPDATE films SET submissions_open = ? WHERE id = ?")
    .bind(open ? 1 : 0, filmId)
    .run();
  return NextResponse.json({ ok: true, open: !!open });
}
