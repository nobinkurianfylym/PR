import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { subdomainFor } from "@/lib/slug";

// Reflects the vault immediately — a newly published film appears at once.
export const dynamic = "force-dynamic";

/** One entry per published film, at its own subdomain. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { results } = await db()
    .prepare(
      "SELECT slug, created_at FROM films WHERE published = 1 AND slug IS NOT NULL AND slug != ''",
    )
    .all<{ slug: string; created_at: string }>();

  return [
    { url: "https://pr.fylym.com", changeFrequency: "weekly", priority: 1 },
    ...results.map((f) => ({
      url: `https://${subdomainFor(f.slug)}`,
      lastModified: f.created_at ? new Date(`${f.created_at.replace(" ", "T")}Z`) : undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
