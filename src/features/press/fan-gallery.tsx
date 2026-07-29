"use client";

import { useEffect, useRef, useState } from "react";
import { downloadZip } from "client-zip";
import { Download, Link2, Loader2, Play, Share2, X as Close } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";
import { recordShare, withRef } from "@/lib/fan-share";
import type { AssetType } from "@/types";

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  content_type: string;
  size: number;
}

/** Share targets — each takes the asset's own page so the poster/still unfurls. */
const TARGETS: { id: string; label: string; href: (p: { page: string; image: string; text: string }) => string }[] = [
  { id: "whatsapp", label: "WhatsApp", href: ({ page, text }) => `https://wa.me/?text=${text}%20${page}` },
  { id: "x", label: "X", href: ({ page, text }) => `https://x.com/intent/tweet?text=${text}&url=${page}` },
  { id: "facebook", label: "Facebook", href: ({ page }) => `https://www.facebook.com/sharer/sharer.php?u=${page}` },
  { id: "linkedin", label: "LinkedIn", href: ({ page }) => `https://www.linkedin.com/sharing/share-offsite/?url=${page}` },
  { id: "reddit", label: "Reddit", href: ({ page, text }) => `https://www.reddit.com/submit?url=${page}&title=${text}` },
  { id: "pinterest", label: "Pinterest", href: ({ page, image, text }) => `https://pinterest.com/pin/create/button/?url=${page}&media=${image}&description=${text}` },
  { id: "telegram", label: "Telegram", href: ({ page, text }) => `https://t.me/share/url?url=${page}&text=${text}` },
];

const TAB_ORDER: AssetType[] = ["Poster", "Stills", "BTS", "Trailer", "Logo"];
const TAB_LABEL: Record<string, string> = {
  Poster: "Posters", Stills: "Stills", BTS: "BTS", Trailer: "Trailers", Logo: "Logo",
};

/**
 * The visual gallery — posters, stills, BTS and trailers in one edge-to-edge
 * masonry, no cards. Filter by type; hover an image for its label, share and
 * download; click to open it full-screen. "Download all" zips the current
 * filter in the browser.
 */
export function FanGallery({
  slug,
  filmTitle,
  assets,
}: {
  slug: string;
  filmTitle: string;
  assets: Asset[];
}) {
  const [tab, setTab] = useState<"all" | AssetType>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const types = TAB_ORDER.filter((t) => assets.some((a) => a.type === t));
  const filtered = tab === "all" ? assets : assets.filter((a) => a.type === tab);
  const preview = assets.find((a) => a.id === previewId) ?? null;

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuId]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreviewId(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

  function share(a: Asset, t: (typeof TARGETS)[number]) {
    const origin = window.location.origin;
    const page = encodeURIComponent(withRef(`${origin}/fan/${slug}/a/${a.id}`));
    const image = encodeURIComponent(`${origin}/api/assets/${a.id}`);
    const text = encodeURIComponent(`${filmTitle} — ${a.type.toLowerCase()}`);
    window.open(t.href({ page, image, text }), "_blank", "noopener,width=600,height=640");
    void recordShare(slug, `asset:${a.id}:${t.id}`);
    setMenuId(null);
  }

  async function downloadAll() {
    if (zipping || filtered.length === 0) return;
    setZipping(true);
    try {
      const responses = await Promise.all(filtered.map((a) => fetch(`/api/assets/${a.id}?download`)));
      const blob = await downloadZip(
        responses.map((res, i) => ({ name: filtered[i]!.name, input: res })),
      ).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filmTitle} — assets.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75";

  return (
    <section id="gallery" className="mt-14 scroll-mt-20 rounded-3xl bg-[#0d0b09] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold uppercase tracking-wide">
          {(["all", ...types] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "border-b-2 border-gold pb-1 text-white"
                  : "border-b-2 border-transparent pb-1 text-white/45 transition-colors hover:text-white/80"
              }
            >
              {t === "all" ? "All" : TAB_LABEL[t] ?? t}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => void downloadAll()}
            disabled={zipping}
            className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-white/70 transition-colors hover:text-white disabled:opacity-60"
          >
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={1.5} />}
            {zipping ? "Zipping…" : "Download all"}
          </button>
        )}
      </div>

      <div className="mt-6 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
        {filtered.map((a) => {
          const isVideo = a.content_type.startsWith("video/");
          const fileUrl = `/api/assets/${a.id}`;
          return (
            <div key={a.id} className="group relative break-inside-avoid">
              <button
                onClick={() => setPreviewId(a.id)}
                aria-label={`Open ${a.name}`}
                className="block w-full overflow-hidden rounded-lg"
              >
                {isVideo ? (
                  <video
                    src={`${fileUrl}#t=0.5`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl}
                    alt={a.name}
                    loading="lazy"
                    className="w-full transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                )}
              </button>

              {isVideo && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                    <Play className="h-5 w-5 translate-x-[1px] text-white" fill="currentColor" strokeWidth={0} />
                  </span>
                </span>
              )}

              {/* Hover overlay: label + share + download */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end rounded-lg bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="pointer-events-auto flex items-end justify-between gap-2 p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                    {TAB_LABEL[a.type] ?? a.type}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="relative" ref={menuId === a.id ? menuRef : undefined}>
                      <button
                        onClick={() => setMenuId((m) => (m === a.id ? null : a.id))}
                        aria-label="Share"
                        className={iconBtn}
                      >
                        <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      {menuId === a.id && (
                        <div className="absolute bottom-full right-0 z-30 mb-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#161310] shadow-2xl">
                          {TARGETS.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => share(a, t)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              <PlatformLogo platform={t.id} className="h-3.5 w-3.5" />
                              {t.label}
                            </button>
                          ))}
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(withRef(`${window.location.origin}/fan/${slug}/a/${a.id}`));
                              void recordShare(slug, `asset:${a.id}:copy`);
                              setMenuId(null);
                            }}
                            className="flex w-full items-center gap-2.5 border-t border-white/10 px-3 py-2 text-left text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Copy link
                          </button>
                        </div>
                      )}
                    </div>
                    <a
                      href={`${fileUrl}?download`}
                      onClick={() => void recordShare(slug, `asset:${a.id}:download`)}
                      aria-label={`Download ${a.name}`}
                      className={iconBtn}
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewId(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <button
            onClick={() => setPreviewId(null)}
            aria-label="Close"
            className="absolute right-5 top-5 rounded-lg border border-white/15 p-2 text-white/70 transition-colors hover:text-white"
          >
            <Close className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {preview.content_type.startsWith("video/") ? (
            <video
              src={`/api/assets/${preview.id}`}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] max-w-full rounded-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/assets/${preview.id}`}
              alt={preview.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] max-w-full rounded-lg object-contain"
            />
          )}
          <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-[13px] text-white/60">{preview.name}</span>
            <a
              href={`/api/assets/${preview.id}?download`}
              onClick={() => void recordShare(slug, `asset:${preview.id}:download`)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white hover:underline"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
