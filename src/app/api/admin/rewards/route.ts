import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";

/** Fan-club prizes per film, managed by the master admin, shown to fans. */
export async function GET(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const filmId = new URL(req.url).searchParams.get("film") ?? "";
  const { results } = await db()
    .prepare("SELECT id, title, detail, sort FROM fan_rewards WHERE film_id = ? ORDER BY sort, created_at")
    .bind(filmId)
    .all();
  return NextResponse.json({ rewards: results });
}

export async function POST(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as { filmId?: string; title?: string; detail?: string; sort?: number };
  const filmId = String(b.filmId ?? "");
  const title = String(b.title ?? "").trim();
  if (!filmId || !title) return NextResponse.json({ error: "Film and title required" }, { status: 400 });

  await db()
    .prepare("INSERT INTO fan_rewards (id, film_id, title, detail, sort) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(), filmId, title.slice(0, 120), String(b.detail ?? "").slice(0, 300), Number(b.sort ?? 0))
    .run();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await db().prepare("DELETE FROM fan_rewards WHERE id = ?").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
