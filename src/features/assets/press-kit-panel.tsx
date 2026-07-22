"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, useOverview } from "@/hooks/use-overview";

/**
 * The campaign's public press kit: a URL at the film's own name that press
 * and partners can open — and download from — without an account. Producers
 * can take it offline at any time.
 */
export function PressKitPanel() {
  const { data, refresh } = useOverview();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!data?.film) return null;

  const { slug, published } = data.film;
  const isLive = published === 1;
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/press/${slug}`;

  async function toggle() {
    setBusy(true);
    await api.setPublished(!isLive);
    await refresh();
    setBusy(false);
  }

  return (
    <Card className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted" strokeWidth={1.5} />
            <p className="text-sm font-medium">Public press kit</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                isLive ? "border-emerald-900 text-emerald-400" : "border-border text-faint"
              }`}
            >
              {isLive ? "Live" : "Offline"}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {isLive
              ? "Anyone with this link can view and download these materials — no account needed."
              : "The page is offline. Only you and people holding a share link can reach these files."}
          </p>
          <code className="mt-3 block truncate rounded-lg border border-border bg-raised px-3 py-2 text-[13px] text-foreground">
            /press/{slug}
          </code>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/press/${slug}`, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> Open
          </Button>
          <Button size="sm" onClick={() => void toggle()} disabled={busy}>
            {isLive ? "Take offline" : "Publish"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
