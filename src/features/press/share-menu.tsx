"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import { recordShare } from "@/lib/fan-share";

/**
 * Compact page-share control: a single icon that expands to the platforms.
 * Each opens that platform's own composer with the page link and caption
 * prefilled, so a fan posts from their own account — and earns points for it.
 */
const INTENTS: { id: string; label: string; href: (url: string, text: string) => string }[] = [
  { id: "x", label: "X", href: (u, t) => `https://x.com/intent/tweet?text=${t}&url=${u}` },
  { id: "reddit", label: "Reddit", href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  { id: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { id: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { id: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
];

export function ShareMenu({ slug, caption }: { slug: string; caption: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const pageUrl = () => (typeof window === "undefined" ? "" : window.location.href);

  function go(i: (typeof INTENTS)[number]) {
    window.open(
      i.href(encodeURIComponent(pageUrl()), encodeURIComponent(caption)),
      "_blank",
      "noopener,width=600,height=640",
    );
    void recordShare(slug, `page:${i.id}`);
    setOpen(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(pageUrl());
    void recordShare(slug, "page:copy-link");
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Share this page"
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold-deep"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" strokeWidth={2} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={1.5} />
        )}
        {copied ? "Copied" : "Share"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
          {INTENTS.map((i) => (
            <button
              key={i.id}
              onClick={() => go(i)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-foreground"
            >
              <PlatformLogo platform={i.id} className="h-3.5 w-3.5" />
              {i.label}
            </button>
          ))}
          <button
            onClick={() => void copy()}
            className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-foreground"
          >
            <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy link
          </button>
        </div>
      )}
    </div>
  );
}
