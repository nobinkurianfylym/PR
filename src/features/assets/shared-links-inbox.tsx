"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/hooks/use-overview";

interface SharedLink {
  id: string;
  url: string;
  kind: string;
  note: string;
  submitted_by: string;
  created_at: string;
}

/** Links the public sent the production team from the press kit. */
export function SharedLinksInbox() {
  const [links, setLinks] = useState<SharedLink[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/shared-links", { cache: "no-store" });
    if (res.ok) setLinks(((await res.json()) as { links: SharedLink[] }).links);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!links || links.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Links shared with the team</h2>
        <span className="text-xs text-faint">{links.length}</span>
      </div>
      <p className="mt-1 text-[13px] text-faint">
        Reviews, social posts, and coverage sent from your public press kit.
      </p>

      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
        {links.map((l) => (
          <div key={l.id} className="flex items-start gap-4 p-4">
            <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
              {l.kind}
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={l.url}
                target="_blank"
                rel="noopener"
                className="group inline-flex max-w-full items-center gap-1 text-sm font-medium hover:underline"
              >
                <span className="truncate">{l.url}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              </a>
              {l.note && <p className="mt-0.5 text-[13px] text-muted">{l.note}</p>}
              <p className="mt-0.5 text-xs text-faint">
                {l.submitted_by || "anonymous"} · {formatDate(l.created_at.slice(0, 10))}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Dismiss link"
              onClick={async () => {
                await fetch(`/api/shared-links/${l.id}`, { method: "DELETE" });
                await load();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
