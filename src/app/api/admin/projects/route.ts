import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";

/** Every campaign on the platform, with who started it and how it's doing. */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await db()
    .prepare(
      `SELECT f.id, f.title, f.slug, f.published, f.created_at, f.release_date,
              u.email AS owner_email, u.name AS owner_name,
              (SELECT COUNT(*) FROM fans fa WHERE fa.film_id = f.id) AS fans,
              (SELECT COUNT(*) FROM assets a WHERE a.film_id = f.id AND a.status = 'approved') AS assets,
              (SELECT COUNT(*) FROM film_members m WHERE m.film_id = f.id) AS team
         FROM films f
         LEFT JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC`,
    )
    .all();

  return NextResponse.json({ projects: results });
}
