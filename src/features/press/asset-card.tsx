"use client";

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, Clapperboard, Archive, Camera, Shapes,
  Download, Eye, Share2, Link2, Copy, X as Close, type LucideIcon,
} from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import type { AssetType } from "@/types";

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  Poster: ImageIcon, Trailer: Clapperboard, EPK: Archive, Stills: Camera, Logo: Shapes,
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
 * Link targets, kept as a secondary option. No social platform's web intent
 * can carry a file — they accept a URL and nothing else — so these share the
 * asset's own page, which unfurls with the image. Sharing the *file* is the
 * primary path above, via the system share sheet.
 */
const LINK_TARGETS: {
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

/** Clipboards only reliably accept PNG, so anything else is redrawn as one. */
async function toPngBlob(blob: Blob): Promise<Blob | null> {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
}

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
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isImage = asset.content_type.startsWith("image/");
  const Icon = TYPE_ICON[asset.type] ?? Camera;
  const fileUrl = `/api/assets/${asset.id}`;
  const caption = `${filmTitle} — ${asset.type.toLowerCase()}`;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

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

  function say(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2400);
  }

  function openPreview() {
    if (isImage) setPreviewing(true);
    else window.open(fileUrl, "_blank", "noopener");
  }

  /**
   * Share the asset itself. The system share sheet is the only route that
   * carries an actual file to Instagram, WhatsApp, Messages and the rest, so
   * it is tried first. Where the browser cannot do it (most desktops), we open
   * the menu instead, which offers the file by clipboard or download.
   */
  async function shareFile() {
    setBusy(true);
    try {
      const blob = await (await fetch(fileUrl)).blob();
      const file = new File([blob], asset.name, { type: blob.type || asset.content_type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filmTitle, text: caption });
        return;
      }
      setMenuOpen(true);
    } catch (e) {
      // A cancelled share sheet is not an error worth reporting.
      if (!(e instanceof DOMException && e.name === "AbortError")) setMenuOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyImage() {
    setBusy(true);
    try {
      const blob = await (await fetch(fileUrl)).blob();
      const png = await toPngBlob(blob);
      if (!png) throw new Error("convert failed");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      say("Image copied — paste it anywhere");
      setMenuOpen(false);
    } catch {
      say("Couldn't copy — use Download");
    } finally {
      setBusy(false);
    }
  }

  function shareLink(target: (typeof LINK_TARGETS)[number]) {
    const origin = window.location.origin;
    const page = encodeURIComponent(`${origin}/press/${slug}/a/${asset.id}`);
    const image = encodeURIComponent(`${origin}${fileUrl}`);
    const text = encodeURIComponent(caption);
    window.open(target.href({ page, image, text }), "_blank", "noopener,width=600,height=640");
    setMenuOpen(false);
  }

  const action =
    "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50";
  const row =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-foreground";

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
              {/* Primary: shares the file itself, not a link to it. */}
              <button onClick={() => void shareFile()} disabled={busy} className={action}>
                <Share2 className="h-3 w-3" strokeWidth={1.5} />
                {busy ? "Preparing…" : "Share"}
              </button>

              {menuOpen && (
                <div className="absolute bottom-full left-0 z-30 mb-1.5 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
                  <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                    Share the {asset.type.toLowerCase()}
                  </p>
                  {isImage && (
                    <button onClick={() => void copyImage()} disabled={busy} className={row}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy image
                    </button>
                  )}
                  <a href={`${fileUrl}?download`} className={row} onClick={() => setMenuOpen(false)}>
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download file
                  </a>

                  <p className="border-t border-border px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                    Or share a link
                  </p>
                  {LINK_TARGETS.map((t) => (
                    <button key={t.id} onClick={() => shareLink(t)} className={row}>
                      <PlatformLogo platform={t.id} className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/press/${slug}/a/${asset.id}`,
                      );
                      setMenuOpen(false);
                      say("Link copied");
                    }}
                    className={`${row} border-t border-border`}
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy link
                  </button>
                </div>
              )}
            </div>

            <a href={`${fileUrl}?download`} className={action} aria-label={`Download ${asset.name}`}>
              <Download className="h-3 w-3" strokeWidth={1.5} /> Download
            </a>
          </div>

          {flash && <p className="mt-2 text-[11px] text-emerald-400">{flash}</p>}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={asset.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-full rounded-lg object-contain"
          />
          <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[13px] text-faint">{asset.name}</p>
            <button onClick={() => void shareFile()} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline disabled:opacity-50">
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Share
            </button>
            <a
              href={`${fileUrl}?download`}
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
