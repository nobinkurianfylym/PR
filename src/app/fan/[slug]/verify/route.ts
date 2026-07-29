import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { consumeFanToken } from "@/server/fan";

/**
 * Consume a magic-link token: signs the fan in on this device and marks them
 * verified, then bounces to the fan page. Invalid/expired tokens just land on
 * the page unverified.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  const film = await db()
    .prepare("SELECT id FROM films WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<{ id: string }>();

  let ok = false;
  if (film && token) ok = (await consumeFanToken(film.id, token)) !== null;

  return NextResponse.redirect(`${url.origin}/fan/${slug}${ok ? "?verified=1" : ""}`);
}
