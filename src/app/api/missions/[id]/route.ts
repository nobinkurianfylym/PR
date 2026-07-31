import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = (await req.json()) as { done?: boolean; assignee?: string; dueDate?: string };
  const owned = "AND film_id IN (SELECT film_id FROM film_members WHERE user_id = ?)";
  const d = db();

  if (b.done !== undefined) {
    await d.prepare(`UPDATE missions SET done = ? WHERE id = ? ${owned}`).bind(b.done ? 1 : 0, id, user.id).run();
  }
  if (b.assignee !== undefined) {
    await d.prepare(`UPDATE missions SET assignee = ? WHERE id = ? ${owned}`).bind(String(b.assignee).slice(0, 120), id, user.id).run();
  }
  if (b.dueDate !== undefined) {
    const dd = /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? b.dueDate : "";
    await d.prepare(`UPDATE missions SET due_date = ? WHERE id = ? ${owned}`).bind(dd, id, user.id).run();
  }
  return NextResponse.json({ ok: true });
}
