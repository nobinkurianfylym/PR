"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2, Send, Share2, Star, Trash2 } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import { recordShare, withRef } from "@/lib/fan-share";

interface FanReview {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  name: string;
  city: string;
}

interface WallState {
  reviews: FanReview[];
  canReview: boolean;
  isAdmin: boolean;
  mine: { id: string; rating: number; body: string } | null;
}

const MAX_LEN = 600;

const SHARE: { id: string; label: string; href: (url: string, text: string) => string }[] = [
  { id: "x", label: "X", href: (u, t) => `https://x.com/intent/tweet?text=${t}&url=${u}` },
  { id: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { id: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id: "reddit", label: "Reddit", href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  { id: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { id: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
];

function timeAgo(iso: string): string {
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "fill-current" : "text-white/20"}`}
          strokeWidth={i < Math.round(rating) ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

/**
 * "What fans are saying" — the audience half of the review wall. Joined fans
 * rate the film and write a few words (one review each, editable); everyone
 * reads. Each review carries a share menu so a fan can post their own words to
 * social with the fan-page link, and the team or master admin can moderate.
 * When a title logo is uploaded it brands each card.
 */
export function AudienceReviews({
  slug,
  film,
  logoSrc,
}: {
  slug: string;
  film: string;
  logoSrc: string | null;
}) {
  const [state, setState] = useState<WallState>({ reviews: [], canReview: false, isAdmin: false, mine: null });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/press/${slug}/reviews`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as WallState;
    setState(data);
    if (data.mine) {
      setRating(data.mine.rating);
      setBody(data.mine.body);
    }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!shareId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShareId(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [shareId]);

  const pageUrl = () =>
    typeof window === "undefined" ? "" : withRef(window.location.origin + window.location.pathname);
  const captionFor = (r: FanReview) => {
    const who = [r.name || "A fan", r.city].filter(Boolean).join(", ");
    return `“${r.body}” — ${who} · ${film}`;
  };

  function share(r: FanReview, t: (typeof SHARE)[number]) {
    window.open(
      t.href(encodeURIComponent(pageUrl()), encodeURIComponent(captionFor(r))),
      "_blank",
      "noopener,width=600,height=640",
    );
    void recordShare(slug, `fanreview:${r.id}:${t.id}`);
    setShareId(null);
  }
  async function copy(r: FanReview) {
    await navigator.clipboard.writeText(`${captionFor(r)}\n${pageUrl()}`);
    void recordShare(slug, `fanreview:${r.id}:copy`);
    setCopiedId(r.id);
    setShareId(null);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/press/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, body: body.trim() }),
    });
    if (res.ok) {
      await load();
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Couldn't post that.");
    }
    setSending(false);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/press/${slug}/reviews/${id}`, { method: "DELETE" });
    if (res.status === 204) await load();
  }

  const shown = hover || rating;

  return (
    <section id="audience-reviews" className="mt-6 scroll-mt-20 rounded-3xl bg-[#0d0b09] p-5 text-white sm:p-7">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-soft">
          What fans are saying
        </p>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {state.reviews.length} review{state.reviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Write a review */}
      {state.canReview ? (
        <form onSubmit={submit} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[13px] font-medium text-white/80">
            {state.mine ? "Update your review" : "Write your review"}
          </p>
          <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} star${i ? "s" : ""}`}
                onMouseEnter={() => setHover(i + 1)}
                onClick={() => setRating(i + 1)}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 transition-colors ${i < shown ? "fill-gold text-gold" : "text-white/25"}`}
                  strokeWidth={i < shown ? 0 : 1.5}
                />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            placeholder="What did you think of the film?"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-gold/50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/40">{body.length}/{MAX_LEN}</span>
            <button
              type="submit"
              disabled={sending || !rating || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold-soft disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              {sending ? "Posting…" : state.mine ? "Update review" : "Post review"}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </form>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/50">
          Join the fan club above to write a review — reading is open to everyone.
        </p>
      )}

      {/* The wall */}
      {state.reviews.length > 0 ? (
        <div className="mt-6 columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
          {state.reviews.map((r) => {
            const open = shareId === r.id;
            return (
              <figure key={r.id} className="group break-inside-avoid rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <StarRow rating={r.rating} />
                  {logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoSrc} alt={film} className="h-5 max-w-[7rem] object-contain opacity-80" />
                  ) : null}
                </div>
                <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                  {r.body}
                </blockquote>
                <figcaption className="mt-3 text-[13px] text-white/55">
                  {r.name || "A fan"}
                  {r.city ? ` · ${r.city}` : ""}
                  <span className="text-white/30"> · {timeAgo(r.created_at)}</span>
                </figcaption>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  {state.isAdmin ? (
                    <button
                      onClick={() => void remove(r.id)}
                      aria-label="Remove review"
                      className="rounded-md p-1 text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
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
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
          No fan reviews yet — be the first to review {film}.
        </p>
      )}
    </section>
  );
}
