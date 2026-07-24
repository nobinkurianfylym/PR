"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Globe, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/hooks/use-overview";
import { domainOf } from "@/lib/utils";

interface SharedLink {
  id: string;
  url: string;
  kind: string;
  note: string;
  submitted_by: string;
  created_at: string;
  status: "pending" | "approved";
  label: string;
}

/**
 * Links the public sent the production team. Pending ones are private;
 * approving publishes a link into the press kit's "In the press" section,
 * where anyone can amplify it. Approval is reversible.
 */
export function SharedLinksInbox() {
  const router = useRouter();
  const [links, setLinks] = useState<SharedLink[] | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/shared-links", { cache: "no-store" });
    if (!res.ok) return;
    const { links: rows } = (await res.json()) as { links: SharedLink[] };
    setLinks(rows);
    // Prefill each label: whatever the producer set, else the submitter's
    // note, else the domain — so approving is usually one click.
    setLabels((prev) => {
      const next = { ...prev };
      for (const l of rows) {
        if (next[l.id] === undefined) next[l.id] = l.label || l.note || domainOf(l.url);
      }
      return next;
    });
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/shared-links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/shared-links/${id}`, { method: "DELETE" });
    await load();
  }

  // Crawl the web for this film's coverage and drop it into the queue below.
  async function crawl() {
    setCrawling(true);
    setCrawlMsg(null);
    const res = await fetch("/api/shared-links/crawl", { method: "POST" });
    if (res.ok) {
      const { found, added } = (await res.json()) as { found: number; added: number };
      setCrawlMsg(
        added > 0
          ? `Found ${found} results — added ${added} new to review below.`
          : `Found ${found} results — nothing new to add.`,
      );
      await load();
    } else {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      setCrawlMsg(error ?? "Crawl failed.");
    }
    setCrawling(false);
  }

  const pending = (links ?? []).filter((l) => l.status !== "approved");
  const published = (links ?? []).filter((l) => l.status === "approved");
  const empty = links !== null && pending.length === 0 && published.length === 0;

  const meta = (l: SharedLink) => (
    <p className="mt-0.5 text-xs text-faint">
      {domainOf(l.url)} · {l.submitted_by || "anonymous"} ·{" "}
      {formatDate(l.created_at.slice(0, 10))}
    </p>
  );

  const openLink = (l: SharedLink) => (
    <a
      href={l.url}
      target="_blank"
      rel="noopener nofollow"
      className="inline-flex max-w-full items-center gap-1 text-sm font-medium hover:underline"
    >
      <span className="truncate">{l.url}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
    </a>
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Reviews &amp; coverage</h2>
          <p className="mt-1 max-w-md text-[13px] text-faint">
            Reviews, articles and video coverage — sent from your press kit or
            found on the web. Approve one to list it publicly.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={() => void crawl()} disabled={crawling}>
            {crawling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {crawling ? "Crawling the web…" : "Crawl the web for reviews"}
          </Button>
          <span className="text-[11px] text-faint">
            {pending.length} to review · {published.length} published
          </span>
        </div>
      </div>

      {crawlMsg && <p className="mt-2 text-[13px] text-muted">{crawlMsg}</p>}

      {empty && (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-faint">
          No coverage yet — crawl the web for this film&rsquo;s reviews, or wait
          for public submissions.
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {pending.map((l) => (
            <div key={l.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {l.kind}
                </span>
                <div className="min-w-0 flex-1">
                  {openLink(l)}
                  {l.note && <p className="mt-0.5 text-[13px] text-muted">{l.note}</p>}
                  {meta(l)}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  aria-label={`Public title for ${domainOf(l.url)}`}
                  value={labels[l.id] ?? ""}
                  onChange={(e) => setLabels({ ...labels, [l.id]: e.target.value })}
                  placeholder="Title shown on the press kit"
                  className="h-9 max-w-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    void patch(l.id, { status: "approved", label: labels[l.id] ?? "" })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Dismiss link"
                  onClick={() => void remove(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {published.length > 0 && (
        <>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Published on the press kit
          </p>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
            {published.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="shrink-0 rounded-full border border-emerald-900 px-2 py-0.5 text-[11px] text-emerald-400">
                  {l.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.label || domainOf(l.url)}</p>
                  {meta(l)}
                </div>
                {l.kind === "Review" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/reviews?publication=${encodeURIComponent(domainOf(l.url))}&critic=${encodeURIComponent(l.submitted_by)}`,
                      )
                    }
                  >
                    Add to Review Wall
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void patch(l.id, { status: "pending" })}
                >
                  Unpublish
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete link"
                  onClick={() => void remove(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
