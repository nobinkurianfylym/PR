"use client";

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, Clapperboard, Archive, Camera, Shapes, Music4,
  Download, Eye, Share2, Link2, Play, X as Close, type LucideIcon,
} from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import type { AssetType } from "@/types";

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  Poster: ImageIcon, Trailer: Clapperboard, Stills: Camera, BTS: Camera,
  EPK: Archive, Logo: Shapes, Music: Music4,
};

export interface PressAsset {
  id: string;
  name: string;
  type: AssetType;
  content_type: string;
  size: number;
}

function fmtSize(bytes: number): string {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

/**
 * Share targets. Every one takes a *page* URL, not the file itself — each
 * asset has its own page carrying Open Graph tags, so a shared poster
 * unfurls as a real card and lands the reader back on the press kit.
 * Pinterest is the exception that also wants the raw image, which is why it
 * gets `media`.
 */
const TARGETS: {
  id: string;
  label: string;
  href: (p: { page: string; image: string; text: string }) => string;
}[] = [
  { id: "whatsapp", label: "WhatsApp", href: ({ page, text }) => `https://wa.me/?text=${text}%20${page}` },
  { id: "x", label: "X", href: ({ page, text }) => `https://x.com/intent/tweet?text=${text}&url=${page}` },
  { id: "facebook", label: "Facebook", href: ({ page }) => `https://www.facebook.com/sharer/sharer.php?u=${page}` },
  { id: "linkedin", label: "LinkedIn", href: ({ page }) => `https://www.linkedin.com/sharing/share-offsite/?url=${page}` },
  { id: "reddit", label: "Reddit", href: ({ page, text }) => `https://www.reddit.com/submit?url=${page}&title=${text}` },
  { id: "pinterest", label: "Pinterest", href: ({ page, image, text }) => `https://pinterest.com/pin/create/button/?url=${page}&media=${image}&description=${text}` },
  { id: "telegram", label: "Telegram", href: ({ page, text }) => `https://t.me/share/url?url=${page}&text=${text}` },
];

export function AssetCard({
  asset,
  slug,
  filmTitle,
}: {
  asset: PressAsset;
  slug: string;
  filmTitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isImage = asset.content_type.startsWith("image/");
  const isVideo = asset.content_type.startsWith("video/");
  const Icon = TYPE_ICON[asset.type] ?? Camera;
  const fileUrl = `/api/assets/${asset.id}`;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Esc closes the lightbox, and the page must not scroll behind it.
  useEffect(() => {
    if (!previewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreviewing(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [previewing]);

  function openPreview() {
    // Images and video open in the lightbox; documents and archives are
    // better handled by the browser's own viewer.
    if (isImage || isVideo) setPreviewing(true);
    else window.open(fileUrl, "_blank", "noopener");
  }

  function share(target: (typeof TARGETS)[number]) {
    const origin = window.location.origin;
    const page = encodeURIComponent(`${origin}/press/${slug}/a/${asset.id}`);
    const image = encodeURIComponent(`${origin}${fileUrl}`);
    const text = encodeURIComponent(`${filmTitle} — ${asset.type.toLowerCase()}`);
    window.open(target.href({ page, image, text }), "_blank", "noopener,width=600,height=640");
    setMenuOpen(false);
  }

  const action =
    "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground";

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-foreground/25">
        <button
          onClick={openPreview}
          aria-label={`Preview ${asset.name}`}
          className="flex h-64 items-center justify-center overflow-hidden bg-raised p-3"
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={asset.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.12]"
            />
          ) : isVideo ? (
            // The #t fragment makes the browser render that frame as the
            // poster, so a trailer shows itself rather than a generic icon.
            <span className="relative flex h-full w-full items-center justify-center">
              <video
                src={`${fileUrl}#t=0.5`}
                preload="metadata"
                muted
                playsInline
                className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.12]"
              />
              <span className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                <Play className="h-4 w-4 translate-x-[1px] text-white" fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          ) : (
            <Icon className="h-8 w-8 text-faint" strokeWidth={1.25} />
          )}
        </button>

        <div className="px-4 py-3">
          <p className="truncate text-xs text-faint" title={asset.name}>
            {asset.name} · {fmtSize(asset.size)}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button onClick={openPreview} className={action}>
              <Eye className="h-3 w-3" strokeWidth={1.5} /> Preview
            </button>

            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className={action}>
                <Share2 className="h-3 w-3" strokeWidth={1.5} /> Share
              </button>

              {menuOpen && (
                <div className="absolute bottom-full left-0 z-30 mb-1.5 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
                  {TARGETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => share(t)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-foreground"
                    >
                      <PlatformLogo platform={t.id} className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/press/${slug}/a/${asset.id}`,
                      );
                      setCopied(true);
                      setMenuOpen(false);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy link
                  </button>
                </div>
              )}
            </div>

            <a href={`${fileUrl}?download`} className={action} aria-label={`Download ${asset.name}`}>
              <Download className="h-3 w-3" strokeWidth={1.5} /> Download
            </a>

            {copied && <span className="text-[11px] text-emerald-400">Link copied</span>}
          </div>
        </div>
      </article>

      {previewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${asset.name} preview`}
          onClick={() => setPreviewing(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <button
            onClick={() => setPreviewing(false)}
            aria-label="Close preview"
            className="absolute right-5 top-5 rounded-lg border border-border p-2 text-muted transition-colors hover:text-foreground"
          >
            <Close className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {isVideo ? (
            <video
              src={fileUrl}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] max-w-full rounded-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={asset.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] max-w-full rounded-lg object-contain"
            />
          )}
          <div className="mt-4 flex items-center gap-3">
            <p className="text-[13px] text-faint">{asset.name}</p>
            <a
              href={`${fileUrl}?download`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
            </a>
          </div>
        </div>
      )}
    </>
  );
}
