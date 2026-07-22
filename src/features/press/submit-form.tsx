"use client";

import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { AssetType } from "@/types";

const TYPES: AssetType[] = ["Stills", "Poster", "Trailer", "EPK", "Logo"];

/**
 * Public contribution form on a press kit. Anyone — a photographer at the
 * premiere, a fan, a partner — can send material without an account. It goes
 * to the producer for review rather than straight onto the page.
 */
export function SubmitForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("Stills");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to send.");
      return;
    }
    setSending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    form.append("submittedBy", name);
    const res = await fetch(`/api/press/${slug}/submit`, { method: "POST", body: form });
    if (res.ok) {
      setSent(true);
      setOpen(false);
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Could not send that file.");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="mt-10 flex items-center gap-2 rounded-xl border border-emerald-900 bg-surface px-5 py-4 text-sm text-emerald-400">
        <Check className="h-4 w-4" strokeWidth={1.5} />
        Thank you — your material was sent to the production team for review.
      </div>
    );
  }

  return (
    <div className="mt-10">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4" strokeWidth={1.5} /> Submit material
        </Button>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <p className="text-sm font-medium">Send material to the production</p>
          <p className="mt-1 text-[13px] leading-relaxed text-faint">
            Stills, clips, artwork, or press coverage. The team reviews everything
            before it appears here. Max 25MB — images, video, audio, PDF, or ZIP.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Your name or outlet (optional)" htmlFor="submitted-by">
              <Input
                id="submitted-by"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meera J, OnManorama"
              />
            </Field>
            <div>
              <label
                htmlFor="submit-type"
                className="mb-1.5 block text-[13px] font-medium text-muted"
              >
                Kind of material
              </label>
              <select
                id="submit-type"
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-foreground"
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            required
            aria-label="File"
            className="mt-4 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-raised file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          />

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
