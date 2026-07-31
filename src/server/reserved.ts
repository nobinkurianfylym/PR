import { db } from "./db";
import { isReserved } from "@/lib/slug";

/**
 * The authoritative "is this name reserved" check: the hard-coded platform list
 * (src/lib/slug.ts) plus any names the master admin has reserved in the console
 * (reserved_slugs table). Used everywhere a slug is validated — slug-check,
 * film creation, and film edits — so a reservation actually takes effect.
 */
export async function isNameReserved(slug: string): Promise<boolean> {
  const s = slug.trim().toLowerCase();
  if (!s) return false;
  if (isReserved(s)) return true;
  const row = await db()
    .prepare("SELECT slug FROM reserved_slugs WHERE slug = ?")
    .bind(s)
    .first();
  return !!row;
}
