import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Firecrawl web search — used to find real coverage of a film (reviews,
 * articles, video reviews, rating pages) rather than inventing any. The API
 * key is a Worker secret (FIRECRAWL_API_KEY), never in the repo.
 */
export interface WebResult {
  url: string;
  title: string;
  description: string;
}

export async function firecrawlSearch(query: string, limit = 15): Promise<WebResult[]> {
  const key = (getCloudflareContext().env as unknown as { FIRECRAWL_API_KEY?: string })
    .FIRECRAWL_API_KEY;
  if (!key) throw new Error("Firecrawl is not configured");

  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(`Firecrawl responded ${res.status}`);

  const data = (await res.json()) as { success?: boolean; data?: WebResult[] };
  return (data.data ?? [])
    .filter((r) => typeof r.url === "string" && /^https?:\/\//i.test(r.url))
    .map((r) => ({
      url: r.url,
      title: String(r.title ?? "").trim(),
      description: String(r.description ?? "").trim(),
    }));
}
