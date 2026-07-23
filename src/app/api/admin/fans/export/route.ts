import { db } from "@/server/db";
import { requireMasterAdmin } from "@/server/master-admin";

/** The full fan list as CSV — for the admin's own mail tool or records. */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { results } = await db()
    .prepare(
      `SELECT fa.name, fa.email, fa.city, fa.created_at, f.title AS film
         FROM fans fa JOIN films f ON f.id = fa.film_id
        ORDER BY fa.created_at DESC`,
    )
    .all<{ name: string; email: string; city: string; created_at: string; film: string }>();

  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    "name,email,city,film,joined",
    ...results.map((r) => [r.name, r.email, r.city, r.film, r.created_at].map(esc).join(",")),
  ].join("\n");

  return new Response(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prfylym-fans.csv"`,
    },
  });
}
