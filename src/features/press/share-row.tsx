"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { recordShare } from "@/lib/fan-share";

/**
 * Share intents — each opens the platform's own composer with the kit link
 * and copy prefilled, so a journalist or fan posts from their own account
 * with no login here. Instagram has no web intent at all (and its API only
 * posts for accounts you own), so "Copy caption" is the path there: paste it
 * alongside a downloaded still.
 */
const INTENTS: { id: string; label: string; href: (url: string, text: string) => string }[] = [
  {
    id: "x",
    label: "X",
    href: (url, text) => `https://x.com/intent/tweet?text=${text}&url=${url}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (url, text) => `https://wa.me/?text=${text}%20${url}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: (url, text) => `https://t.me/share/url?url=${url}&text=${text}`,
  },
];

export function ShareRow({ slug, title, caption }: { slug: string; title: string; caption: string }) {
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);

  function shareUrl(): string {
    return typeof window === "undefined" ? "" : window.location.href;
  }

  async function copy(what: "link" | "caption") {
    await navigator.clipboard.writeText(what === "link" ? shareUrl() : caption);
    void recordShare(slug, `page:copy-${what}`);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }

  const base =
    "rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground";

  return (
    <section className="mt-12">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Share {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTENTS.map((i) => (
          <button
            key={i.id}
            onClick={() => {
              window.open(
                i.href(encodeURIComponent(shareUrl()), encodeURIComponent(caption)),
                "_blank",
                "noopener,width=600,height=640",
              );
              void recordShare(slug, `page:${i.id}`);
            }}
            className={base}
          >
            {i.label}
          </button>
        ))}
        <button onClick={() => void copy("link")} className={base}>
          <span className="inline-flex items-center gap-1.5">
            {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {copied === "link" ? "Copied" : "Copy link"}
          </span>
        </button>
        <button onClick={() => void copy("caption")} className={base}>
          {copied === "caption" ? "Caption copied" : "Copy caption"}
        </button>
      </div>
    </section>
  );
}
