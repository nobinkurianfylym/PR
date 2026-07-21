import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, role } = (await req.json()) as { name?: string; role?: string };
  if (!name?.trim() || !role?.trim()) {
    return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
  }
  const film = await db()
    .prepare("SELECT id FROM films WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!film) return NextResponse.json({ error: "Create a film first" }, { status: 400 });
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO team_members (id, film_id, name, role) VALUES (?,?,?,?)")
    .bind(id, film.id, name.trim(), role.trim())
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
