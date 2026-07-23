import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";

const owned = "AND film_id IN (SELECT film_id FROM film_members WHERE user_id = ?)";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { done } = (await req.json()) as { done?: boolean };
  await db()
    .prepare(`UPDATE opportunities SET done = ? WHERE id = ? ${owned}`)
    .bind(done ? 1 : 0, id, user.id)
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db().prepare(`DELETE FROM opportunities WHERE id = ? ${owned}`).bind(id, user.id).run();
  return new NextResponse(null, { status: 204 });
}
