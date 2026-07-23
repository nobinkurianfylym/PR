"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Globe, Play } from "lucide-react";
import { domainOf } from "@/lib/utils";
import { recordShare } from "@/lib/fan-share";
import { platformFromUrl } from "@/lib/platforms";
import { PlatformLogo } from "@/components/ui/platform-logo";

export interface CoverageLink {
  id: string;
  url: string;
  kind: string;
  label: string;
  image: string;
}

/**
 * "In the press" — coverage the production approved, grouped by kind and
 * built for amplification: every item shares in one click, and each group
 * copies wholesale so a street team can paste a full set of reviews into a
 * WhatsApp broadcast.
 */
export function PressCoverage({
  slug,
  film,
  groups,
}: {
  slug: string;
  film: string;
  groups: { kind: string; links: CoverageLink[] }[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function flash(key: string) {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyAll(kind: string, links: CoverageLink[]) {
    const body = links.map((l) => `${l.label || domainOf(l.url)} — ${l.url}`).join("\n");
    await navigator.clipboard.writeText(`${film} — ${kind}\n\n${body}`);
    flash(`all:${kind}`);
  }

  const shareText = (l: CoverageLink) =>
    encodeURIComponent(`${l.label || domainOf(l.url)} — ${film}`);

  return (
    <section className="mt-14">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        In the press
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        What people are saying
      </h2>
      <p className="mt-1 text-sm text-faint">
        Share any of it — or copy a whole set at once.
      </p>

      <div className="mt-6 space-y-8">
        {groups.map(({ kind, links }) => (
          <div key={kind}>
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
              <h3 className="text-sm font-medium">{kind}</h3>
              <button
                onClick={() => void copyAll(kind, links)}
                className="inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-foreground"
              >
                {copied === `all:${kind}` ? (
                  <><Check className="h-3.5 w-3.5" /> Copied {links.length}</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy all</>
                )}
              </button>
            </div>

            <ul className="divide-y divide-border">
              {links.map((l) => (
                <li key={l.id} className="group flex items-center gap-3 py-3 sm:gap-4">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener nofollow"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="relative block h-[63px] w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-raised"
                  >
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted">
                        {platformFromUrl(l.url) ? (
                          <PlatformLogo platform={platformFromUrl(l.url)!} className="h-5 w-5" />
                        ) : (
                          <Globe className="h-5 w-5" strokeWidth={1.5} />
                        )}
                      </span>
                    )}
                    {l.image && /(youtube\.com|youtu\.be)/i.test(l.url) && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                          <Play className="h-3.5 w-3.5 translate-x-[1px] text-white" fill="currentColor" strokeWidth={0} />
                        </span>
                      </span>
                    )}
                  </a>
                  <div className="min-w-0 flex-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener nofollow"
                      className="inline-flex max-w-full items-center gap-1 text-sm hover:underline"
                    >
                      <span className="truncate">{l.label || domainOf(l.url)}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.5} />
                    </a>
                    {/* Always show where a link goes. */}
                    <p className="mt-0.5 text-xs text-faint">{domainOf(l.url)}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      onClick={() => {
                        window.open(
                          `https://x.com/intent/tweet?text=${shareText(l)}&url=${encodeURIComponent(l.url)}`,
                          "_blank",
                          "noopener,width=600,height=640",
                        );
                        void recordShare(slug, `coverage:${l.id}:x`);
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      X
                    </button>
                    <button
                      onClick={() => {
                        window.open(
                          `https://wa.me/?text=${shareText(l)}%20${encodeURIComponent(l.url)}`,
                          "_blank",
                          "noopener,width=600,height=640",
                        );
                        void recordShare(slug, `coverage:${l.id}:whatsapp`);
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(l.url);
                        void recordShare(slug, `coverage:${l.id}:copy`);
                        flash(l.id);
                      }}
                      aria-label="Copy link"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      {copied === l.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
