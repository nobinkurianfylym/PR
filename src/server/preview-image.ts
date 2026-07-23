/**
 * Resolves a small preview thumbnail for a shared coverage link.
 *
 * YouTube thumbnails come straight from the video id — no network at all. For
 * anything else we fetch the page once and read its og:image / twitter:image,
 * with a tight timeout and a size cap so a slow or hostile page can never
 * stall the caller. Returns "" when there is no usable image.
 *
 * Only ever called from admin-gated paths (approving a link) or our own
 * backfill — never from a public request — so fetching the submitted URL is a
 * deliberate, authorised action, not an open SSRF surface.
 */
const YT_HOSTS = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;

export function youtubeId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!YT_HOSTS.test(u.hostname)) return null;
  if (u.hostname.includes("youtu.be")) return cleanId(u.pathname.slice(1));
  const v = u.searchParams.get("v");
  if (v) return cleanId(v);
  const m = u.pathname.match(/\/(?:shorts|embed|live|v)\/([^/?#]+)/);
  return m ? cleanId(m[1]!) : null;
}

function cleanId(id: string): string | null {
  const s = id.split(/[?&#/]/)[0] ?? "";
  return /^[\w-]{6,20}$/.test(s) ? s : null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function meta(html: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${esc}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x2F;/gi, "/");
}

async function fetchOgImage(pageUrl: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PRFYLYMBot/1.0; +https://pr.fylym.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "";
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return "";
    const html = (await res.text()).slice(0, 200_000);
    const img =
      meta(html, "og:image:secure_url") ??
      meta(html, "og:image") ??
      meta(html, "twitter:image") ??
      meta(html, "twitter:image:src");
    if (!img) return "";
    try {
      return new URL(img, res.url || pageUrl).toString();
    } catch {
      return "";
    }
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function resolvePreviewImage(url: string): Promise<string> {
  const id = youtubeId(url);
  if (id) return youtubeThumb(id);
  return fetchOgImage(url);
}
