"use client";

/**
 * Records that a fan shared official content, and broadcasts the fresh fan
 * state so any mounted fan UI (status chip, leaderboard) updates. Safe to call
 * for a non-fan — the server no-ops and nothing happens on screen.
 */
export async function recordShare(slug: string, detail: string): Promise<void> {
  try {
    const res = await fetch(`/api/press/${slug}/fan-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detail }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { fan: unknown; rank: number | null; granted?: number };
    if (data.fan) {
      window.dispatchEvent(new CustomEvent("fan:update", { detail: data }));
    }
  } catch {
    /* sharing must never break on a points hiccup */
  }
}

export interface FanRecord {
  id: string;
  name: string;
  points: number;
  shares: number;
  verified: number;
  ref_joins: number;
  ref_visits: number;
}

export interface FanState {
  fan: FanRecord | null;
  rank: number | null;
}

/**
 * The current fan's id, cached so share links can carry `?ref=<id>` for
 * referral attribution. Set by the join bar once the fan is known.
 */
let fanId: string | null = null;
export function setFanId(id: string | null): void {
  fanId = id;
}
export function withRef(url: string): string {
  if (!fanId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ref=${encodeURIComponent(fanId)}`;
}
