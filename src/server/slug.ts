import { db } from "./db";

/** URL-safe slug from a film title: "Neelakasham: Part 2" → "neelakasham-part-2". */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return base || "film";
}

/**
 * A slug no other campaign is using — press-kit URLs are global, so two
 * films of the same name get `thira` and `thira-2`. Slugs never change after
 * creation, so links shared with press keep working through a retitle.
 */
export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  const database = db();
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await database
      .prepare("SELECT id FROM films WHERE slug = ?")
      .bind(candidate)
      .first();
    if (!taken) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}
