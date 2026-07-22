import type { ReactNode } from "react";
import { Globe, Ticket, Music4, Star } from "lucide-react";

/**
 * Brand marks drawn inline as SVG paths — never fetched from a CDN or the
 * platform itself, so a press kit can't end up with broken logo images and
 * loads no third-party requests. Everything inherits `currentColor`, so the
 * marks sit in the page's monochrome palette.
 */
const BRAND: Record<string, ReactNode> = {
  x: (
    <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.25 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z" />
  ),
  facebook: (
    <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.02 24 18.06 24 12.07z" />
  ),
  youtube: (
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
  ),
  spotify: (
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.32-1.32 9.72-.66 13.44 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
  ),
  // Instagram's rounded-square camera.
  instagram: (
    <>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.3" />
    </>
  ),
  // Letterboxd's three overlapping dots.
  letterboxd: (
    <>
      <circle cx="6.1" cy="12" r="4.7" opacity="0.95" />
      <circle cx="12" cy="12" r="4.7" opacity="0.55" />
      <circle cx="17.9" cy="12" r="4.7" opacity="0.95" />
    </>
  ),
  // IMDb: its rating box, with the star it is known for.
  imdb: (
    <>
      <rect x="1.4" y="4.4" width="21.2" height="15.2" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.7l1.36 2.93 3.08.4-2.27 2.12.61 3.08L12 14.75l-2.78 1.48.61-3.08-2.27-2.12 3.08-.4z" />
    </>
  ),
  // Apple Music: the note in its rounded tile.
  applemusic: (
    <>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 6.6l-6.1 1.3v7.2a2 2 0 1 0 1.3 1.87V10.1l4.8-1v4.2a2 2 0 1 0 1.3 1.87V6.6z" />
    </>
  ),
  youtubemusic: (
    <>
      <circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.9 8.4l6 3.6-6 3.6z" />
    </>
  ),
};

/** Platforms with no distinctive mark fall back to a plain, honest glyph. */
const FALLBACK: Record<string, typeof Globe> = {
  website: Globe,
  bookmyshow: Ticket,
  tickets: Ticket,
  music: Music4,
};

export function PlatformLogo({
  platform,
  className = "h-4 w-4",
}: {
  platform: string;
  className?: string;
}) {
  const brand = BRAND[platform];
  if (brand) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={className}
      >
        {brand}
      </svg>
    );
  }
  const Icon = FALLBACK[platform] ?? Star;
  return <Icon className={className} strokeWidth={1.6} aria-hidden="true" />;
}
