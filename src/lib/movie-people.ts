/**
 * Turn the producer's free-text cast/crew fields into structured people, so the
 * fan page can render a proper cast list and emit schema.org Person entities.
 * Nothing is invented — we only parse what the team actually entered. Supported
 * forms (comma- or newline-separated):
 *   Cast:  "Vijay as Jana", "Pooja Hegde"        → name (+ character)
 *   Crew:  "Director: H Vinoth", "Anirudh"        → role (+ name)
 */

export interface CastMember {
  name: string;
  character?: string;
}

export interface CrewMember {
  name: string;
  role?: string;
}

const SPLIT = /[,\n;]+/;

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function parseCast(raw: string | null | undefined): CastMember[] {
  if (!raw) return [];
  return raw
    .split(SPLIT)
    .map(clean)
    .filter(Boolean)
    .map((entry) => {
      // "Actor as Character"
      const m = entry.match(/^(.+?)\s+as\s+(.+)$/i);
      if (m) return { name: clean(m[1]!), character: clean(m[2]!) };
      return { name: entry };
    })
    .filter((c) => c.name.length > 0 && c.name.length <= 120);
}

export function parseCrew(raw: string | null | undefined): CrewMember[] {
  if (!raw) return [];
  return raw
    .split(SPLIT)
    .map(clean)
    .filter(Boolean)
    .map((entry) => {
      // "Role: Name"  or  "Name (Role)"
      const colon = entry.match(/^(.+?)\s*:\s*(.+)$/);
      if (colon) return { role: clean(colon[1]!), name: clean(colon[2]!) };
      const paren = entry.match(/^(.+?)\s*\((.+?)\)\s*$/);
      if (paren) return { name: clean(paren[1]!), role: clean(paren[2]!) };
      return { name: entry };
    })
    .filter((c) => c.name.length > 0 && c.name.length <= 120);
}

/** Find a crew member whose role matches any of the given keywords. */
export function crewByRole(crew: CrewMember[], keywords: readonly string[]): CrewMember[] {
  return crew.filter((c) => c.role && keywords.some((k) => c.role!.toLowerCase().includes(k)));
}

export const ROLE_KEYWORDS = {
  director: ["director"],
  writer: ["writer", "screenplay", "story", "written"],
  producer: ["producer"],
  music: ["music", "composer", "score"],
  cinematographer: ["cinematograph", "dop", "camera", "director of photography"],
  editor: ["editor", "editing"],
} as const;
