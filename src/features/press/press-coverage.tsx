"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Link2, Play, Share2 } from "lucide-react";
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
  note: string;
}

const SHARE: { id: string; label: string; href: (url: string, text: string) => string }[] = [
  { id: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { id: "x", label: "X", href: (u, t) => `https://x.com/intent/tweet?text=${t}&url=${u}` },
  { id: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { id: "reddit", label: "Reddit", href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  { id: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
];

// Kinds → the tab label shown (plural, magazine-style).
const KIND_LABEL: Record<string, string> = {
  Review: "Reviews", Article: "Articles", Interview: "Interviews",
  "Social post": "Social", Other: "More",
};
const KIND_ORDER = ["Review", "Article", "Interview", "Social post", "Other"];

/**
 * "In the press" — approved coverage laid out like a film-press page: filter
 * by kind, a few featured cards up top, the rest in a tighter list. Every item
 * reads the source off its own domain and carries a full share menu, so fans
 * and press can amplify any review or article in a click.
 */
export function PressCoverage({
  slug,
  film,
  links,
}: {
  slug: string;
  film: string;
  links: CoverageLink[];
}) {
  const [tab, setTab] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShareId(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [shareId]);

  const kinds = KIND_ORDER.filter((k) => links.some((l) => l.kind === k));
  const filtered = tab === "all" ? links : links.filter((l) => l.kind === tab);
  // Links arrive newest-first; show only the latest 20 until expanded.
  const LIMIT = 20;
  const shown = expanded ? filtered : filtered.slice(0, LIMIT);
  const featured = shown.slice(0, 3);
  const rest = shown.slice(3);
  const isVideo = (url: string) => /(youtube\.com|youtu\.be)/i.test(url);

  function share(l: CoverageLink, t: (typeof SHARE)[number]) {
    const url = encodeURIComponent(l.url);
    const text = encodeURIComponent(`${l.label || domainOf(l.url)} — ${film}`);
    window.open(t.href(url, text), "_blank", "noopener,width=600,height=640");
    void recordShare(slug, `coverage:${l.id}:${t.id}`);
    setShareId(null);
  }

  async function copy(l: CoverageLink) {
    await navigator.clipboard.writeText(l.url);
    void recordShare(slug, `coverage:${l.id}:copy`);
    setCopiedId(l.id);
    setShareId(null);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const source = (l: CoverageLink) => domainOf(l.url).toUpperCase();

  function ShareMenu({ l, dark }: { l: CoverageLink; dark?: boolean }) {
    const open = shareId === l.id;
    const btn = dark
      ? "text-white/60 hover:text-white"
      : "text-muted hover:text-gold-deep";
    return (
      <div className="relative" ref={open ? menuRef : undefined}>
        <button
          onClick={() => setShareId(open ? null : l.id)}
          aria-label={`Share ${l.label || domainOf(l.url)}`}
          className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${btn}`}
        >
          {copiedId === l.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" strokeWidth={1.5} />}
          Share
        </button>
        {open && (
          <div className="absolute bottom-full right-0 z-30 mb-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#161310] shadow-2xl">
            {SHARE.map((t) => (
              <button
                key={t.id}
                onClick={() => share(l, t)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <PlatformLogo platform={t.id} className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
            <button
              onClick={() => void copy(l)}
              className="flex w-full items-center gap-2.5 border-t border-white/10 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy link
            </button>
          </div>
        )}
      </div>
    );
  }

  function Thumb({ l, className }: { l: CoverageLink; className: string }) {
    return (
      <a href={l.url} target="_blank" rel="noopener nofollow" className={`relative block shrink-0 overflow-hidden rounded-lg bg-white/5 ${className}`}>
        {l.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/30">
            {platformFromUrl(l.url) ? <PlatformLogo platform={platformFromUrl(l.url)!} className="h-6 w-6" /> : null}
          </span>
        )}
        {isVideo(l.url) && l.image && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 translate-x-[1px] text-white" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )}
      </a>
    );
  }

  const readLink = (l: CoverageLink) => (
    <a href={l.url} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-soft transition-colors hover:text-gold">
      Read {l.kind === "Interview" ? "interview" : isVideo(l.url) ? "video" : "article"} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
    </a>
  );

  return (
    <section id="reviews" className="mt-14 scroll-mt-20 rounded-3xl bg-[#0d0b09] p-5 text-white sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-soft">In the press</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-4 text-[13px] font-semibold uppercase tracking-wide">
        {(["all", ...kinds]).map((k) => (
          <button
            key={k}
            onClick={() => { setTab(k); setExpanded(false); }}
            className={tab === k ? "border-b-2 border-gold pb-1 text-white" : "border-b-2 border-transparent pb-1 text-white/45 transition-colors hover:text-white/80"}
          >
            {k === "all" ? "All" : KIND_LABEL[k] ?? k}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => (
            <article key={l.id} className="flex flex-col">
              <Thumb l={l} className="aspect-[16/10] w-full" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                {source(l)} <span className="text-white/30">· {l.kind}</span>
              </p>
              <h3 className="mt-1.5 font-serif text-xl leading-snug">{l.label || domainOf(l.url)}</h3>
              {l.note && <p className="mt-1.5 text-sm leading-relaxed text-white/55">{l.note}</p>}
              <div className="mt-3 flex items-center justify-between">
                {readLink(l)}
                <ShareMenu l={l} dark />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="mt-8 grid gap-x-8 gap-y-6 border-t border-white/10 pt-8 sm:grid-cols-2">
          {rest.map((l) => (
            <article key={l.id} className="flex gap-4">
              <Thumb l={l} className="h-16 w-28 sm:h-20 sm:w-32" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                  {source(l)} <span className="text-white/30">· {l.kind}</span>
                </p>
                <h4 className="mt-1 font-serif text-base leading-snug">{l.label || domainOf(l.url)}</h4>
                {l.note && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/50">{l.note}</p>}
                <div className="mt-2 flex items-center justify-between">
                  {readLink(l)}
                  <ShareMenu l={l} dark />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Expand / collapse — only the latest 20 show until opened. */}
      {filtered.length > LIMIT && (
        <div className="mt-8 flex justify-center border-t border-white/10 pt-7">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-gold/40 hover:text-white"
          >
            {expanded ? "Show less" : `Show all ${filtered.length}`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>
      )}
    </section>
  );
}
