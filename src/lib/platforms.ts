/**
 * The official pages a film can link from its press kit. Adding a platform
 * here is the only change needed — the editor, the press kit, and the API
 * all read this list.
 */
export type LinkGroup = "official" | "social" | "tickets" | "music" | "community";

export interface Platform {
  id: string;
  label: string;
  group: LinkGroup;
  placeholder: string;
}

export const PLATFORMS: Platform[] = [
  { id: "website", label: "Official site", group: "official", placeholder: "https://…" },
  { id: "imdb", label: "IMDb", group: "official", placeholder: "https://www.imdb.com/title/…" },
  { id: "letterboxd", label: "Letterboxd", group: "official", placeholder: "https://letterboxd.com/film/…" },
  { id: "instagram", label: "Instagram", group: "social", placeholder: "https://instagram.com/…" },
  { id: "x", label: "X", group: "social", placeholder: "https://x.com/…" },
  { id: "facebook", label: "Facebook", group: "social", placeholder: "https://facebook.com/…" },
  { id: "youtube", label: "YouTube", group: "social", placeholder: "https://youtube.com/@…" },
  { id: "bookmyshow", label: "BookMyShow", group: "tickets", placeholder: "https://in.bookmyshow.com/…" },
  { id: "tickets", label: "Other ticketing", group: "tickets", placeholder: "https://…" },
  { id: "spotify", label: "Spotify", group: "music", placeholder: "https://open.spotify.com/album/…" },
  { id: "applemusic", label: "Apple Music", group: "music", placeholder: "https://music.apple.com/…" },
  { id: "youtubemusic", label: "YouTube Music", group: "music", placeholder: "https://music.youtube.com/…" },
  { id: "whatsapp", label: "WhatsApp community", group: "community", placeholder: "https://chat.whatsapp.com/…" },
  { id: "telegram", label: "Telegram community", group: "community", placeholder: "https://t.me/…" },
];

export const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function platformsIn(group: LinkGroup): Platform[] {
  return PLATFORMS.filter((p) => p.group === group);
}

export interface FilmLink {
  platform: string;
  url: string;
  image?: string;
}

/** What a link shared with the production team is. */
export const SHARED_LINK_KINDS = [
  "Review",
  "Social post",
  "Article",
  "Interview",
  "Other",
];

export interface ResolvedLink {
  id: string;
  label: string;
  url: string;
  image: string;
}

/** Links of one or more groups, in catalogue order, ready to render. */
export function linksIn(links: FilmLink[], ...groups: LinkGroup[]): ResolvedLink[] {
  return PLATFORMS.filter((p) => groups.includes(p.group))
    .map((p) => {
      const hit = links.find((l) => l.platform === p.id);
      return hit ? { id: p.id, label: p.label, url: hit.url, image: hit.image ?? "" } : null;
    })
    .filter((x): x is ResolvedLink => x !== null);
}

/**
 * Which platform a shared link came from, read off its domain — so coverage
 * from Instagram, X, or YouTube is identifiable at a glance in the press kit
 * rather than being an anonymous URL.
 */
const DOMAIN_PLATFORM: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(x|twitter)\.com$/, "x"],
  [/(^|\.)(facebook|fb)\.com$/, "facebook"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)pinterest\.(com|co\.uk|in)$/, "pinterest"],
  [/(^|\.)(t\.me|telegram\.me)$/, "telegram"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)letterboxd\.com$/, "letterboxd"],
  [/(^|\.)imdb\.com$/, "imdb"],
  [/(^|\.)open\.spotify\.com$/, "spotify"],
  [/(^|\.)threads\.(net|com)$/, "instagram"],
];

export function platformFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_PLATFORM.find(([re]) => re.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}
