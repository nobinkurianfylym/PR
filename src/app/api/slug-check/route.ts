import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { isReserved, isValidSlug, slugify, subdomainFor } from "@/lib/slug";

/**
 * Live availability check for the create-film form. Normalises the input to a
 * slug, then reports whether it's usable. Gated to signed-in users so the film
 * table can't be enumerated anonymously.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = slugify(new URL(req.url).searchParams.get("slug") ?? "");
  const base = { slug, subdomain: slug ? subdomainFor(slug) : "" };

  if (!slug || !isValidSlug(slug)) return NextResponse.json({ ...base, available: false, reason: "invalid" });
  if (isReserved(slug)) return NextResponse.json({ ...base, available: false, reason: "reserved" });

  const taken = await db().prepare("SELECT id FROM films WHERE slug = ?").bind(slug).first();
  return NextResponse.json({ ...base, available: !taken, reason: taken ? "taken" : null });
}
