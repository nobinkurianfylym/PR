/**
 * The official pages a film can link from its press kit. Adding a platform
 * here is the only change needed — the editor, the press kit, and the API
 * all read this list.
 */
export type LinkGroup = "official" | "social" | "tickets" | "music";

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
];

export const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function platformsIn(group: LinkGroup): Platform[] {
  return PLATFORMS.filter((p) => p.group === group);
}

export interface FilmLink {
  platform: string;
  url: string;
}

export interface ResolvedLink {
  id: string;
  label: string;
  url: string;
}

/** Links of one or more groups, in catalogue order, ready to render. */
export function linksIn(links: FilmLink[], ...groups: LinkGroup[]): ResolvedLink[] {
  return PLATFORMS.filter((p) => groups.includes(p.group))
    .map((p) => {
      const hit = links.find((l) => l.platform === p.id);
      return hit ? { id: p.id, label: p.label, url: hit.url } : null;
    })
    .filter((x): x is ResolvedLink => x !== null);
}
