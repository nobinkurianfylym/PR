import type { AssetType } from "@/types";

/**
 * How the press kit and the vault are organised — the single source of truth
 * for both the sticky navigation and the section order on each page. Adding a
 * section here adds it to both surfaces.
 */
export interface AssetSection {
  id: string;
  label: string;
  types: AssetType[];
}

export const ASSET_SECTIONS: AssetSection[] = [
  { id: "posters", label: "Posters", types: ["Poster"] },
  { id: "stills", label: "Stills / BTS", types: ["Stills", "BTS"] },
  { id: "trailers", label: "Trailers", types: ["Trailer"] },
  { id: "epk", label: "EPK / Logo", types: ["EPK", "Logo"] },
  { id: "music", label: "Music", types: ["Music"] },
];

/** Every uploadable type, in the order a producer usually reaches for them. */
export const UPLOAD_TYPES: AssetType[] = [
  "Poster", "Stills", "BTS", "Trailer", "EPK", "Logo", "Music",
];

export function groupAssets<T extends { type: AssetType }>(
  assets: T[],
): { section: AssetSection; items: T[] }[] {
  return ASSET_SECTIONS.map((section) => ({
    section,
    items: assets.filter((a) => section.types.includes(a.type)),
  })).filter((g) => g.items.length > 0);
}
