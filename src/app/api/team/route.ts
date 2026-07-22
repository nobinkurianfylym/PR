import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, role } = (await req.json()) as { name?: string; role?: string };
  if (!name?.trim() || !role?.trim()) {
    return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
  }
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "Create a film first" }, { status: 400 });
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO team_members (id, film_id, name, role) VALUES (?,?,?,?)")
    .bind(id, filmId, name.trim(), role.trim())
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
