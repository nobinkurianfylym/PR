import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";
import { RESERVED, isReserved, isValidSlug, slugify } from "@/lib/slug";

/**
 * The Control Centre's name registry (master admin only). Reserve or release
 * fan-page addresses (subdomains) across the whole platform. The hard-coded
 * platform list stays read-only here; this manages the admin-added ones on top.
 */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await db()
    .prepare(
      `SELECT r.slug, r.note, r.created_at,
              f.id AS film_id, f.title AS film_title, f.published,
              u.email AS owner_email
         FROM reserved_slugs r
         LEFT JOIN films f ON f.slug = r.slug
         LEFT JOIN users u ON u.id = f.user_id
        ORDER BY r.slug`,
    )
    .all();

  return NextResponse.json({
    reserved: results,
    system: [...RESERVED].sort(),
  });
}

export async function POST(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = (await req.json()) as { slug?: string; note?: string };
  const slug = slugify(String(b.slug ?? ""));
  if (!slug || !isValidSlug(slug)) {
    return NextResponse.json({ error: "Use a–z, 0–9 and hyphens (max 60)." }, { status: 400 });
  }
  if (isReserved(slug)) {
    return NextResponse.json({ error: `"${slug}" is already a system-reserved name.` }, { status: 400 });
  }

  await db()
    .prepare(
      `INSERT INTO reserved_slugs (slug, note, created_by) VALUES (?,?,?)
       ON CONFLICT(slug) DO UPDATE SET note = excluded.note`,
    )
    .bind(slug, String(b.note ?? "").slice(0, 200), admin.email)
    .run();

  // Report whether a live film currently holds this name, so the admin knows
  // to free it.
  const holder = await db()
    .prepare("SELECT id, title, published FROM films WHERE slug = ?")
    .bind(slug)
    .first<{ id: string; title: string; published: number }>();

  return NextResponse.json({ ok: true, slug, holder: holder ?? null }, { status: 201 });
}

export async function DELETE(req: Request) {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const slug = slugify(new URL(req.url).searchParams.get("slug") ?? "");
  await db().prepare("DELETE FROM reserved_slugs WHERE slug = ?").bind(slug).run();
  return new NextResponse(null, { status: 204 });
}
