import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";
import { slugify } from "@/lib/slug";

/**
 * Free a fan-page address the company needs (master admin only). Releases the
 * name from whatever film holds it by clearing that film's slug and taking its
 * fan page offline (published = 0). The campaign and all its data survive — the
 * owner just has to choose a new address to go live again. Non-destructive on
 * purpose: this frees a name, it does not delete a project.
 */
export async function POST(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = slugify(body.slug ?? "");
  if (!slug) return NextResponse.json({ error: "Which name?" }, { status: 400 });

  const film = await db()
    .prepare("SELECT id, title FROM films WHERE slug = ?")
    .bind(slug)
    .first<{ id: string; title: string }>();
  if (!film) return NextResponse.json({ ok: true, freed: false, message: "That name isn't held by any film." });

  await db()
    .prepare("UPDATE films SET slug = '', published = 0 WHERE id = ?")
    .bind(film.id)
    .run();

  return NextResponse.json({ ok: true, freed: true, film: { id: film.id, title: film.title } });
}
