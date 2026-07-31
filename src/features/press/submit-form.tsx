"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Upload, X as Close } from "lucide-react";
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
 * inbox. The trigger opens a centered modal, so it works anywhere — inline on
 * the page or as a compact button in the sticky header (pass triggerClassName).
 */
export function SubmitForm({
  slug,
  triggerClassName,
}: {
  slug: string;
  /** When set, the trigger renders as a bare button with this class (for the
   *  header). Otherwise it's the default outline button. */
  triggerClassName?: string;
}) {
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    // Clear a completed submission a moment after the modal closes.
    setTimeout(() => setSent(null), 200);
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
      setUrl("");
      setNote("");
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Could not send that.");
    }
    setSending(false);
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
    <>
      {triggerClassName ? (
        <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
          <Upload className="h-4 w-4" strokeWidth={1.5} /> Submit material
        </button>
      ) : (
        <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4" strokeWidth={1.5} /> Submit material
        </Button>
      )}

      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit material"
          onClick={close}
          className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm"
        >
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto w-full max-w-lg rounded-2xl border border-border bg-surface shadow-cinematic"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-faint transition-colors hover:text-foreground"
            >
              <Close className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {sent ? (
              <div className="p-6">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {sent === "file"
                    ? "Thank you — your material was sent to the production team for review."
                    : "Thank you — your link was sent to the production team."}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button type="button" onClick={close}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="p-6">
                <p className="text-base font-semibold tracking-tight">Send material to the production</p>
                <p className="mt-1 text-[13px] leading-relaxed text-faint">
                  Upload a file, or share a link to a review, a social post, or any
                  coverage. The team sees everything you send.
                </p>

                <div className="mt-5 inline-flex rounded-lg border border-border p-1">
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
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
