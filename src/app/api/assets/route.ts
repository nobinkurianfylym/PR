import { NextResponse } from "next/server";
import { db, bucket } from "@/server/db";
import { currentUser } from "@/server/auth";

async function userFilm(userId: string): Promise<string | null> {
  const f = await db()
    .prepare("SELECT id FROM films WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<{ id: string }>();
  return f?.id ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await userFilm(user.id);
  if (!filmId) return NextResponse.json({ assets: [] });
  const { results } = await db()
    .prepare("SELECT id, name, type, content_type, size, share_token, created_at FROM assets WHERE film_id = ? ORDER BY created_at DESC")
    .bind(filmId)
    .all();
  return NextResponse.json({ assets: results });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await userFilm(user.id);
  if (!filmId) return NextResponse.json({ error: "Create a film first" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  const type = String(form.get("type") ?? "Stills");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 50MB per file" }, { status: 413 });
  }

  const id = crypto.randomUUID();
  const key = `${filmId}/${id}/${file.name}`;
  await bucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  const shareToken = crypto.randomUUID().replace(/-/g, "");
  await db()
    .prepare("INSERT INTO assets (id, film_id, name, type, content_type, size, r2_key, share_token) VALUES (?,?,?,?,?,?,?,?)")
    .bind(id, filmId, file.name, type, file.type || "application/octet-stream", file.size, key, shareToken)
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
