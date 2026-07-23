import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { resolvePreviewImage } from "@/server/preview-image";

/** Publish a shared link to the press kit, pull it back, or retitle it. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { status, label } = (await req.json()) as { status?: string; label?: string };

  if (status !== undefined && status !== "approved" && status !== "pending") {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }

  const owned = `AND film_id IN (SELECT film_id FROM film_members WHERE user_id = ?)`;
  const database = db();
  if (status !== undefined && label !== undefined) {
    await database
      .prepare(`UPDATE shared_links SET status = ?, label = ? WHERE id = ? ${owned}`)
      .bind(status, label.slice(0, 160), id, user.id)
      .run();
  } else if (status !== undefined) {
    await database
      .prepare(`UPDATE shared_links SET status = ? WHERE id = ? ${owned}`)
      .bind(status, id, user.id)
      .run();
  } else if (label !== undefined) {
    await database
      .prepare(`UPDATE shared_links SET label = ? WHERE id = ? ${owned}`)
      .bind(label.slice(0, 160), id, user.id)
      .run();
  }

  // On publish, resolve a preview thumbnail once (YouTube frame or og:image)
  // if we don't have one yet. Best-effort — a link never fails to publish
  // because a thumbnail couldn't be fetched.
  if (status === "approved") {
    const row = await database
      .prepare(`SELECT url, image FROM shared_links WHERE id = ? ${owned}`)
      .bind(id, user.id)
      .first<{ url: string; image: string }>();
    if (row && !row.image) {
      const image = await resolvePreviewImage(row.url);
      if (image) {
        await database
          .prepare("UPDATE shared_links SET image = ? WHERE id = ?")
          .bind(image, id)
          .run();
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db()
    .prepare(
      `DELETE FROM shared_links WHERE id = ?
        AND film_id IN (SELECT film_id FROM film_members WHERE user_id = ?)`,
    )
    .bind(id, user.id)
    .run();
  return new NextResponse(null, { status: 204 });
}
