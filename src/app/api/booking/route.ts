import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/** Producer-set advance-booking status for the war-room (a real fact they log). */
const OPTIONS = ["", "Not open", "Open", "Fast filling", "Houseful"];

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const { status } = (await req.json()) as { status?: string };
  const value = OPTIONS.includes(status ?? "") ? status! : "";
  await db().prepare("UPDATE films SET booking_status = ? WHERE id = ?").bind(value, filmId).run();
  return NextResponse.json({ ok: true, status: value });
}
