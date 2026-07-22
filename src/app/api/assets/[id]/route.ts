import { NextResponse } from "next/server";
import { db, bucket } from "@/server/db";
import { currentUser } from "@/server/auth";

interface AssetRow {
  id: string; film_id: string; name: string; content_type: string; r2_key: string; share_token: string;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const asset = await db()
    .prepare(
      "SELECT a.*, f.user_id, f.published FROM assets a JOIN films f ON f.id = a.film_id WHERE a.id = ?",
    )
    .bind(id)
    .first<AssetRow & { user_id: string; published: number }>();
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner, anyone holding the share token, or anyone at all when the
  // campaign's press kit is published.
  const user = await currentUser();
  const token = url.searchParams.get("token");
  const allowed =
    user?.id === asset.user_id || token === asset.share_token || asset.published === 1;
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const obj = await bucket().get(asset.r2_key);
  if (!obj) return NextResponse.json({ error: "File missing" }, { status: 404 });
  const download = url.searchParams.has("download");
  return new Response(obj.body, {
    headers: {
      "Content-Type": asset.content_type,
      ...(download && {
        "Content-Disposition": `attachment; filename="${asset.name.replace(/"/g, "")}"`,
      }),
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const asset = await db()
    .prepare("SELECT a.r2_key FROM assets a JOIN films f ON f.id = a.film_id WHERE a.id = ? AND f.user_id = ?")
    .bind(id, user.id)
    .first<{ r2_key: string }>();
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await bucket().delete(asset.r2_key);
  await db().prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
