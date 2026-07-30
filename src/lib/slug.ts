/**
 * Slug + subdomain rules, shared by the server (creation, routing) and the
 * client (live availability in the create form). Pure functions only — safe to
 * import into edge middleware and React components alike.
 */

export const ROOT_DOMAIN = "fylym.com";

/**
 * Subdomains the platform keeps for itself — a film can never claim one, so
 * routing can safely serve the app (not a film) from these hosts.
 */
export const RESERVED = new Set([
  "admin", "api", "www", "mail", "cdn", "dashboard", "support", "help",
  "login", "signup", "auth", "root", "system", "assets", "media", "app",
  "pr", "static", "email", "ftp", "ns", "ns1", "ns2", "blog", "status",
  "docs", "fan", "press", "cname", "smtp", "webmail", "test", "staging",
  // Other FYLYM products — each has its own site on its own subdomain, so a
  // film can never claim one and the wildcard router leaves them untouched.
  "scheduler", "pitch", "writer", "academy", "studio", "fylym",
]);

/**
 * SEO-friendly slug from any title:
 *  - transliterate accents (José → jose), strip diacritics
 *  - lowercase, drop emojis / punctuation / non-latin
 *  - remove spaces (Jana Nayagan → jananayagan), keep in-word hyphens
 *  - collapse duplicate hyphens, trim edge hyphens, cap at 60 chars
 * Result contains only a-z, 0-9 and hyphen.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD") // José → Jose + combining accent; filter drops the accent
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** A slug the platform reserves for its own subdomains. */
export function isReserved(slug: string): boolean {
  return RESERVED.has(slug);
}

/** Structural validity of a subdomain label (RFC-ish, our charset). */
export function isValidSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 60 &&
    /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(slug);
}

export type SlugStatus = "ok" | "invalid" | "reserved";

/** Local (no-DB) verdict — DB uniqueness is checked separately. */
export function slugStatus(slug: string): SlugStatus {
  if (!isValidSlug(slug)) return "invalid";
  if (isReserved(slug)) return "reserved";
  return "ok";
}

export function subdomainFor(slug: string): string {
  return `${slug}.${ROOT_DOMAIN}`;
}
