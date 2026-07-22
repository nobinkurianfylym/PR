"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, Clapperboard, Archive, Camera, Shapes,
  Eye, Share2, Download, Trash2, Upload, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, formatDate } from "@/hooks/use-overview";
import { PressKitPanel } from "@/features/assets/press-kit-panel";
import type { AssetType } from "@/types";

interface AssetRow {
  id: string; name: string; type: AssetType; content_type: string;
  size: number; share_token: string; created_at: string;
  status: "approved" | "pending"; submitted_by: string;
}

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  Poster: ImageIcon, Trailer: Clapperboard, EPK: Archive, Stills: Camera, Logo: Shapes,
};
const TYPES: AssetType[] = ["Poster", "Trailer", "EPK", "Stills", "Logo"];

function fmtSize(bytes: number): string {
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))}KB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[] | null>(null);
  const [uploadType, setUploadType] = useState<AssetType>("Poster");
  const [busy, setBusy] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assets", { cache: "no-store" });
    if (res.ok) setAssets(((await res.json()) as { assets: AssetRow[] }).assets);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    form.append("type", uploadType);
    await fetch("/api/assets", { method: "POST", body: form });
    setBusy(false);
    await load();
  }

  async function share(a: AssetRow) {
    const url = `${location.origin}/api/assets/${a.id}?token=${a.share_token}`;
    await navigator.clipboard.writeText(url);
    setSharedId(a.id);
    setTimeout(() => setSharedId(null), 2000);
  }

  const approved = (assets ?? []).filter((a) => a.status !== "pending");
  const pending = (assets ?? []).filter((a) => a.status === "pending");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Asset Vault
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Always the right version
          </h1>
          <p className="mt-1 text-sm text-muted">
            Real files, stored in your vault. Share links work without an account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as AssetType)}
            aria-label="Asset type"
            className="h-10 rounded-lg border border-border bg-raised px-3 text-sm"
          >
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" strokeWidth={1.5} />
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      <PressKitPanel />

      {pending.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">
              Submissions awaiting review
            </h2>
            <span className="text-xs text-faint">{pending.length} pending</span>
          </div>
          <p className="mt-1 text-[13px] text-faint">
            Sent from your public press kit. Nothing here is visible to the
            public until you approve it.
          </p>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="mt-0.5 text-xs text-faint">
                    {a.type} · {fmtSize(a.size)}
                    {a.submitted_by ? ` · from ${a.submitted_by}` : " · anonymous"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/api/assets/${a.id}`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.5} /> Review
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await api.approveAsset(a.id);
                    await load();
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Reject ${a.name}`}
                  onClick={async () => {
                    if (confirm(`Reject and delete ${a.name}?`)) {
                      await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
                      await load();
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {assets === null ? null : approved.length === 0 ? (
        <p className="mt-16 text-center text-sm text-faint">
          The vault is empty — upload your first poster, trailer, or EPK.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Camera;
            return (
              <Card key={a.id} className="group flex flex-col overflow-hidden p-0">
                {/* Whole image, never cropped — grows on hover inside its frame. */}
                <div className="flex h-56 items-center justify-center overflow-hidden bg-raised p-3">
                  {a.content_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/assets/${a.id}`}
                      alt={a.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.12]"
                    />
                  ) : (
                    <Icon className="h-8 w-8 text-faint" strokeWidth={1.25} />
                  )}
                </div>
                <p className="mt-3 truncate px-4 text-xs text-faint" title={a.name}>
                  {a.name} · {fmtSize(a.size)} · {formatDate(a.created_at.slice(0, 10))}
                </p>
                <div className="mb-3 mt-2 flex gap-1.5 px-3">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/assets/${a.id}`, "_blank")}>
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.5} /> Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void share(a)}>
                    <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {sharedId === a.id ? "Copied!" : "Share"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/assets/${a.id}?download`, "_blank")} aria-label="Download">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost" size="sm" aria-label="Delete"
                    onClick={async () => {
                      if (confirm(`Delete ${a.name}?`)) {
                        await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
                        await load();
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
