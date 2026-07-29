import { db } from "./db";
import { isReserved, slugify } from "@/lib/slug";

export { slugify };

/**
 * A slug no other film is using and that isn't a reserved subdomain. Two films
 * of the same name get `thira` and `thira-2`; a title that slugs to a reserved
 * word (e.g. "Admin") rolls to `admin-2`. A UNIQUE index on films.slug is the
 * real guard against a concurrent duplicate — this just finds a free candidate.
 */
export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "film";
  const database = db();
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (isReserved(candidate)) continue;
    const taken = await database
      .prepare("SELECT id FROM films WHERE slug = ?")
      .bind(candidate)
      .first();
    if (!taken) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}
