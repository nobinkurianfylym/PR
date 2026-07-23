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

export interface FanState {
  fan: { name: string; points: number; shares: number } | null;
  rank: number | null;
}
