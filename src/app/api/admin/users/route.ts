import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { isMasterAdminEmail, requireMasterAdmin } from "@/server/master-admin";

/** Every login on the platform, with how many campaigns each is on. */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.created_at,
              (SELECT COUNT(*) FROM film_members m WHERE m.user_id = u.id) AS films,
              (SELECT COUNT(*) FROM films f WHERE f.user_id = u.id) AS owned
         FROM users u
        ORDER BY u.created_at DESC`,
    )
    .all<{ id: string; email: string; name: string; created_at: string; films: number; owned: number }>();

  return NextResponse.json({
    users: results.map((u) => ({ ...u, isAdmin: isMasterAdminEmail(u.email) })),
    self: admin.id,
  });
}
