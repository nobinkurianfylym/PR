import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";

/** Fan overview across the whole platform (master admin only). */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const d = db();
  const [total, unique, perFilm, recent] = await Promise.all([
    d.prepare("SELECT COUNT(*) n FROM fans").first<{ n: number }>(),
    d.prepare("SELECT COUNT(DISTINCT email) n FROM fans").first<{ n: number }>(),
    d.prepare(
      `SELECT f.id AS film_id, f.title, COUNT(fa.id) AS fans
         FROM films f LEFT JOIN fans fa ON fa.film_id = f.id
        GROUP BY f.id HAVING fans > 0 ORDER BY fans DESC`,
    ).all(),
    d.prepare(
      `SELECT fa.name, fa.email, fa.city, fa.created_at, f.title AS film
         FROM fans fa JOIN films f ON f.id = fa.film_id
        ORDER BY fa.created_at DESC LIMIT 50`,
    ).all(),
  ]);

  return NextResponse.json({
    totalSignups: total?.n ?? 0,
    uniqueFans: unique?.n ?? 0,
    perFilm: perFilm.results,
    recent: recent.results,
  });
}
