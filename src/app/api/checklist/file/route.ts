import { NextResponse } from "next/server";
import { db, bucket } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { CHECKLIST_KEYS } from "@/lib/checklist";

const MAX = 50 * 1024 * 1024;

async function context() {
  const user = await currentUser();
  if (!user) return null;
  const filmId = await activeFilmId(user.id);
  return filmId ? { filmId } : null;
}

/** Attach a file to a checklist item (replacing any previous attachment). */
export async function POST(req: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const key = String(form.get("key") ?? "");
  const file = form.get("file");
  if (!CHECKLIST_KEYS.has(key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Max 50MB per file" }, { status: 413 });

  const database = db();
  // Remove the previous attachment for this item, if any, before replacing.
  const prev = await database
    .prepare("SELECT r2_key FROM checklist_state WHERE film_id = ? AND item_key = ?")
    .bind(ctx.filmId, key)
    .first<{ r2_key: string }>();
  if (prev?.r2_key) await bucket().delete(prev.r2_key);

  const r2Key = `${ctx.filmId}/checklist/${key}/${crypto.randomUUID()}/${file.name}`;
  await bucket().put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  await database
    .prepare(
      `INSERT INTO checklist_state (film_id, item_key, file_name, r2_key, content_type, size)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(film_id, item_key) DO UPDATE SET
         file_name = excluded.file_name, r2_key = excluded.r2_key,
         content_type = excluded.content_type, size = excluded.size,
         updated_at = datetime('now')`,
    )
    .bind(ctx.filmId, key, file.name, r2Key, file.type || "application/octet-stream", file.size)
    .run();

  return NextResponse.json({ ok: true, file: file.name }, { status: 201 });
}

/** Download the file attached to a checklist item. */
export async function GET(req: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") ?? "";

  const row = await db()
    .prepare("SELECT file_name, r2_key, content_type FROM checklist_state WHERE film_id = ? AND item_key = ?")
    .bind(ctx.filmId, key)
    .first<{ file_name: string; r2_key: string; content_type: string }>();
  if (!row?.r2_key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const obj = await bucket().get(row.r2_key);
  if (!obj) return NextResponse.json({ error: "File missing" }, { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": row.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${row.file_name.replace(/"/g, "")}"`,
    },
  });
}

/** Remove the file attached to a checklist item (keeps the tick). */
export async function DELETE(req: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") ?? "";

  const database = db();
  const row = await database
    .prepare("SELECT r2_key FROM checklist_state WHERE film_id = ? AND item_key = ?")
    .bind(ctx.filmId, key)
    .first<{ r2_key: string }>();
  if (row?.r2_key) await bucket().delete(row.r2_key);

  await database
    .prepare(
      `UPDATE checklist_state SET file_name = '', r2_key = '', content_type = '', size = 0,
         updated_at = datetime('now') WHERE film_id = ? AND item_key = ?`,
    )
    .bind(ctx.filmId, key)
    .run();

  return new NextResponse(null, { status: 204 });
}
