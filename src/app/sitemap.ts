import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { subdomainFor } from "@/lib/slug";

// Reflects the vault immediately — a newly published film appears at once.
export const dynamic = "force-dynamic";

/** One entry per published film, at its own subdomain, each carrying its poster
 *  as an image-sitemap entry so posters are eligible for Google Images. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { results } = await db()
    .prepare(
      `SELECT f.slug, f.created_at, f.poster_url,
              (SELECT a.id FROM assets a
                 WHERE a.film_id = f.id AND a.status = 'approved' AND a.content_type LIKE 'image/%'
                 ORDER BY CASE a.type WHEN 'Poster' THEN 0 WHEN 'Stills' THEN 1 ELSE 2 END, a.created_at DESC
                 LIMIT 1) AS poster_id
         FROM films f
        WHERE f.published = 1 AND f.slug IS NOT NULL AND f.slug != ''`,
    )
    .all<{ slug: string; created_at: string; poster_url: string; poster_id: string | null }>();

  return [
    { url: "https://pr.fylym.com", changeFrequency: "weekly", priority: 1 },
    ...results.map((f) => {
      const base = `https://${subdomainFor(f.slug)}`;
      const image = f.poster_id ? `${base}/api/assets/${f.poster_id}` : f.poster_url || undefined;
      return {
        url: base,
        lastModified: f.created_at ? new Date(`${f.created_at.replace(" ", "T")}Z`) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.8,
        ...(image && { images: [image] }),
      };
    }),
  ];
}
