import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db, bucket } from "@/server/db";

/**
 * The social share card for an asset: the full poster letterboxed into a
 * 1200×630 (1.91:1) frame so platforms show it uncropped. The padding is done
 * by Cloudflare Images (off the Worker CPU); if that isn't available we fall
 * back to streaming the raw file, so a share preview always resolves.
 *
 * Public — only serves assets whose campaign is published and approved.
 */
interface CfImages {
  input(data: ReadableStream | ArrayBuffer): {
    transform(opts: Record<string, unknown>): {
      output(opts: Record<string, unknown>): Promise<{ response(): Response }>;
    };
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await db()
    .prepare(
      `SELECT a.r2_key, a.content_type, f.published, a.status
         FROM assets a JOIN films f ON f.id = a.film_id WHERE a.id = ?`,
    )
    .bind(id)
    .first<{ r2_key: string; content_type: string; published: number; status: string }>();
  if (!row || row.published !== 1 || row.status !== "approved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const obj = await bucket().get(row.r2_key);
  if (!obj) return NextResponse.json({ error: "File missing" }, { status: 404 });

  const cache = "public, max-age=86400";

  // Non-images can't be padded — just stream them.
  if (!row.content_type.startsWith("image/")) {
    return new Response(obj.body, {
      headers: { "Content-Type": row.content_type, "Cache-Control": cache },
    });
  }

  try {
    const images = (getCloudflareContext().env as unknown as { IMAGES?: CfImages }).IMAGES;
    if (!images) throw new Error("no images binding");
    const result = await images
      .input(obj.body)
      .transform({ width: 1200, height: 630, fit: "pad", background: "#080808" })
      .output({ format: "image/jpeg", quality: 90 });
    const res = result.response();
    return new Response(res.body, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": cache },
    });
  } catch {
    // Transformations unavailable — serve the untouched poster. Some platforms
    // will crop it, but the preview still resolves to the real image.
    const raw = await bucket().get(row.r2_key);
    return new Response(raw?.body, {
      headers: { "Content-Type": row.content_type, "Cache-Control": cache },
    });
  }
}
