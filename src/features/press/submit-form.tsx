"use client";

import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SHARED_LINK_KINDS } from "@/lib/platforms";
import { UPLOAD_TYPES } from "@/lib/asset-sections";
import type { AssetType } from "@/types";

const FILE_TYPES: AssetType[] = UPLOAD_TYPES;

type Mode = "file" | "link";

/**
 * Public contribution form on a press kit. Anyone — a photographer at the
 * premiere, a critic who just published, a fan — can send the production
 * either a file or a link (a review, a social post, any coverage) without an
 * account. Files go to the producer's review queue; links go to the team's
 * inbox.
 */
export function SubmitForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("file");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [fileType, setFileType] = useState<AssetType>("Stills");
  const fileRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [kind, setKind] = useState(SHARED_LINK_KINDS[0]!);
  const [note, setNote] = useState("");

  function reset() {
    setUrl("");
    setNote("");
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    let res: Response;
    if (mode === "file") {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError("Choose a file to send.");
        setSending(false);
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("type", fileType);
      form.append("submittedBy", name);
      res = await fetch(`/api/press/${slug}/submit`, { method: "POST", body: form });
    } else {
      res = await fetch(`/api/press/${slug}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind, note, submittedBy: name }),
      });
    }

    if (res.ok) {
      setSent(mode);
      reset();
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Could not send that.");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="mt-10 flex items-center gap-2 rounded-xl border border-emerald-900 bg-surface px-5 py-4 text-sm text-emerald-400">
        <Check className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        {sent === "file"
          ? "Thank you — your material was sent to the production team for review."
          : "Thank you — your link was sent to the production team."}
      </div>
    );
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setError(null); }}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
        mode === m ? "bg-foreground text-background" : "text-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-10">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4" strokeWidth={1.5} /> Submit material
        </Button>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">Send material to the production</p>
          <p className="mt-1 text-[13px] leading-relaxed text-faint">
            Upload a file, or share a link to a review, a social post, or any
            coverage. The team sees everything you send.
          </p>

          <div className="mt-4 inline-flex rounded-lg border border-border p-1">
            {tab("file", "File")}
            {tab("link", "Link")}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Your name or outlet (optional)" htmlFor="submitted-by">
              <Input
                id="submitted-by"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meera J, OnManorama"
              />
            </Field>

            {mode === "file" ? (
              <div>
                <label htmlFor="submit-type" className="mb-1.5 block text-[13px] font-medium text-muted">
                  Kind of material
                </label>
                <select
                  id="submit-type"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as AssetType)}
                  className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground"
                >
                  {FILE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="link-kind" className="mb-1.5 block text-[13px] font-medium text-muted">
                  Kind of link
                </label>
                <select
                  id="link-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground"
                >
                  {SHARED_LINK_KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
            )}
          </div>

          {mode === "file" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                aria-label="File"
                className="mt-4 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-raised file:px-3 file:py-1.5 file:text-sm file:text-foreground"
              />
              <p className="mt-2 text-xs text-faint">
                Max 25MB — images, video, audio, PDF, or ZIP. Files are reviewed
                before they appear here.
              </p>
            </>
          ) : (
            <div className="mt-4 space-y-4">
              <Field label="Link" htmlFor="link-url">
                <Input
                  id="link-url"
                  type="url"
                  inputMode="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Note (optional)" htmlFor="link-note">
                <Input
                  id="link-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 4-star review in today's edition"
                />
              </Field>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-5 flex items-center gap-2">
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
