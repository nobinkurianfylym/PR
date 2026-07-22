import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db()
    .prepare(
      `DELETE FROM shared_links WHERE id = ?
        AND film_id IN (SELECT id FROM films WHERE user_id = ?)`,
    )
    .bind(id, user.id)
    .run();
  return new NextResponse(null, { status: 204 });
}
