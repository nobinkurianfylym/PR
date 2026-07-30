"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2, Star, StarHalf } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import { recordShare, withRef } from "@/lib/fan-share";
import type { Review } from "@/types";

/**
 * The Review Wall on the public fan page: every critic quote the campaign is
 * tracking, laid out under the press-coverage section. Each card carries its
 * own share menu — a fan opens their own social composer with the quote (and
 * the fan-page link) prefilled, so they can add a line and post it, earning
 * points for the share. When a title logo has been uploaded it brands each card.
 */
const SHARE: { id: string; label: string; href: (url: string, text: string) => string }[] = [
  { id: "x", label: "X", href: (u, t) => `https://x.com/intent/tweet?text=${t}&url=${u}` },
  { id: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { id: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id: "reddit", label: "Reddit", href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  { id: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { id: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
];

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-gold">
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
      ))}
      {half && <StarHalf className="h-4 w-4 fill-current" strokeWidth={0} />}
    </span>
  );
}

export function FanReviews({
  slug,
  film,
  reviews,
  logoSrc,
}: {
  slug: string;
  film: string;
  reviews: Review[];
  logoSrc: string | null;
}) {
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

  // The shared URL points back at this fan page and carries ?ref=<fanId> so
  // the referral is credited to whoever posted it.
  const pageUrl = () =>
    typeof window === "undefined" ? "" : withRef(window.location.origin + window.location.pathname);

  const captionFor = (r: Review) => {
    const by = [r.publication, r.critic].filter(Boolean).join(", ");
    return `“${r.quote}”${by ? ` — ${by}` : ""} · ${film}`;
  };

  function share(r: Review, t: (typeof SHARE)[number]) {
    window.open(
      t.href(encodeURIComponent(pageUrl()), encodeURIComponent(captionFor(r))),
      "_blank",
      "noopener,width=600,height=640",
    );
    void recordShare(slug, `review:${r.id}:${t.id}`);
    setShareId(null);
  }

  async function copy(r: Review) {
    await navigator.clipboard.writeText(`${captionFor(r)}\n${pageUrl()}`);
    void recordShare(slug, `review:${r.id}:copy`);
    setCopiedId(r.id);
    setShareId(null);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section id="review-wall" className="mt-6 scroll-mt-20 rounded-3xl bg-[#0d0b09] p-5 text-white sm:p-7">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-soft">
          What the critics say
        </p>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
        {reviews.map((r) => {
          const open = shareId === r.id;
          return (
            <figure
              key={r.id}
              className="break-inside-avoid rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt={film} className="h-5 max-w-[7rem] object-contain opacity-80" />
                ) : null}
              </div>
              <blockquote className="mt-3 font-serif text-lg leading-snug text-white">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-[13px] text-white/55">
                {r.publication}
                {r.critic ? ` · ${r.critic}` : ""}
              </figcaption>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                {logoSrc ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    {film}
                  </span>
                ) : (
                  <span />
                )}
                <div className="relative" ref={open ? menuRef : undefined}>
                  <button
                    onClick={() => setShareId(open ? null : r.id)}
                    aria-label="Share this review"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                  >
                    {copiedId === r.id ? (
                      <Check className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                    ) : (
                      <Share2 className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    {copiedId === r.id ? "Copied" : "Share"}
                  </button>
                  {open && (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#161310] shadow-2xl">
                      {SHARE.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => share(r, t)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <PlatformLogo platform={t.id} className="h-3.5 w-3.5" /> {t.label}
                        </button>
                      ))}
                      <button
                        onClick={() => void copy(r)}
                        className="flex w-full items-center gap-2.5 border-t border-white/10 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy text
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
