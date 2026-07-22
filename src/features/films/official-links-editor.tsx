"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PLATFORMS, type LinkGroup } from "@/lib/platforms";

const GROUP_LABEL: Record<LinkGroup, string> = {
  official: "Official",
  social: "Social",
  tickets: "Tickets",
  music: "Music",
};

const GROUP_ORDER: LinkGroup[] = ["official", "social", "tickets", "music"];

/**
 * Official pages for the campaign. One field per platform — fill what you
 * have, leave the rest blank. Whatever is filled shows on the public press
 * kit; ticketing gets a prominent button there.
 */
export function OfficialLinksEditor() {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/links", { cache: "no-store" });
    if (!res.ok) return;
    const { links } = (await res.json()) as { links: { platform: string; url: string }[] };
    const next: Record<string, string> = {};
    for (const p of PLATFORMS) next[p.id] = links.find((l) => l.platform === p.id)?.url ?? "";
    setUrls(next);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (urls === null) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        links: PLATFORMS.map((p) => ({ platform: p.id, url: urls![p.id] ?? "" })),
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Could not save links");
    }
    setSaving(false);
  }

  return (
    <Card className="mt-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        Official pages
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        Where audiences find the film
      </h2>
      <p className="mt-1 text-sm text-muted">
        These appear on your public press kit. Leave anything you don&apos;t have blank.
      </p>

      <form onSubmit={save} className="mt-6 space-y-6">
        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              {GROUP_LABEL[group]}
            </p>
            <div className="space-y-3">
              {PLATFORMS.filter((p) => p.group === group).map((p) => (
                <Field key={p.id} label={p.label} htmlFor={`link-${p.id}`}>
                  <Input
                    id={`link-${p.id}`}
                    type="url"
                    inputMode="url"
                    placeholder={p.placeholder}
                    value={urls[p.id] ?? ""}
                    onChange={(e) => setUrls({ ...urls, [p.id]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save links"}
        </Button>
      </form>
    </Card>
  );
}
