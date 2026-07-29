"use client";

import { useEffect } from "react";

/**
 * Reads a `?ref=<fanId>` off the URL (from a fan's share link), tells the
 * server to credit that fan for the visit, then strips it from the address bar
 * so a refresh or reshare can't re-carry it.
 */
export function ReferralCapture({ slug }: { slug: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    void fetch(`/api/press/${slug}/referral`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    });
    params.delete("ref");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, [slug]);
  return null;
}
