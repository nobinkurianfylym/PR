"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useOverview } from "@/hooks/use-overview";
import { OfficialLinksEditor } from "@/features/films/official-links-editor";
import { slugify, slugStatus } from "@/lib/slug";

type FormState = Record<
  "title" | "genre" | "language" | "budget" | "marketingBudget" | "releaseDate" | "posterUrl" | "trailerUrl" | "cast" | "crew" | "slug",
  string
>;

const FIELDS: { name: keyof FormState; label: string; type?: string }[] = [
  { name: "title", label: "Movie title" },
  { name: "genre", label: "Genre" },
  { name: "language", label: "Language" },
  { name: "budget", label: "Production budget (₹)", type: "number" },
  { name: "marketingBudget", label: "Marketing budget (₹)", type: "number" },
  { name: "releaseDate", label: "Release date", type: "date" },
  { name: "posterUrl", label: "Poster link" },
  { name: "trailerUrl", label: "Trailer link" },
  { name: "cast", label: "Cast" },
  { name: "crew", label: "Crew" },
];

export default function EditFilmPage() {
  const router = useRouter();
  const { data, refresh } = useOverview();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.film && form === null) {
      const f = data.film as unknown as Record<string, unknown>;
      setForm({
        title: String(f.title ?? ""),
        genre: String(f.genre ?? ""),
        language: String(f.language ?? ""),
        budget: String(f.budget ?? ""),
        marketingBudget: String(f.marketing_budget ?? ""),
        releaseDate: String(f.release_date ?? ""),
        posterUrl: String(f.poster_url ?? ""),
        trailerUrl: String(f.trailer_url ?? ""),
        cast: String(f.cast ?? ""),
        crew: String(f.crew ?? ""),
        slug: String(f.slug ?? ""),
      });
    }
  }, [data, form]);

  const currentSlug = String((data?.film as unknown as { slug?: string } | undefined)?.slug ?? "");
  const typedSlug = slugify(form?.slug ?? "");
  const unchanged = typedSlug === currentSlug;
  const localStatus = typedSlug ? slugStatus(typedSlug) : "invalid";
  const [avail, setAvail] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!typedSlug || unchanged || localStatus !== "ok") {
      setAvail(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(typedSlug)}`, { cache: "no-store" });
      if (res.ok) setAvail((await res.json()) as { available: boolean; reason: string | null });
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [typedSlug, unchanged, localStatus]);

  if (!data?.film || form === null) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/films/${data!.film!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, budget: Number(form.budget), marketingBudget: Number(form.marketingBudget) }),
    });
    if (res.ok) {
      await refresh();
      router.push("/dashboard");
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Could not save");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        Film details
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit {form.title}</h1>
      <p className="mt-1 text-sm text-muted">
        Changing the release date re-plans the campaign timeline automatically.
      </p>

      <Card className="mt-6">
        <form onSubmit={save} className="space-y-4">
          {FIELDS.map(({ name, label, type }) => (
            <Field key={name} label={label} htmlFor={name}>
              <Input
                id={name}
                type={type ?? "text"}
                value={form[name]}
                required={name === "title" || name === "releaseDate"}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            </Field>
          ))}

          <div className="rounded-lg border border-border bg-raised/40 p-3">
            <label htmlFor="film-slug" className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
              Fan page address
            </label>
            <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-border bg-background px-2.5">
              <span className="text-sm text-faint">https://</span>
              <input
                id="film-slug"
                value={typedSlug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="your-film"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium outline-none"
              />
              <span className="text-sm text-faint">.fylym.com</span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
              {!typedSlug ? (
                <span className="flex items-center gap-1 text-red-400"><X className="h-3.5 w-3.5" /> An address is required.</span>
              ) : unchanged ? (
                <span className="text-faint">This is the current address.</span>
              ) : localStatus === "reserved" ? (
                <span className="flex items-center gap-1 text-red-500"><X className="h-3.5 w-3.5" /> Reserved name.</span>
              ) : localStatus === "invalid" ? (
                <span className="flex items-center gap-1 text-red-500"><X className="h-3.5 w-3.5" /> Use a–z, 0–9 and hyphens.</span>
              ) : checking ? (
                <span className="text-faint">Checking availability…</span>
              ) : avail?.available ? (
                <span className="flex items-center gap-1 text-emerald-500"><Check className="h-3.5 w-3.5" /> Available</span>
              ) : (
                <span className="flex items-center gap-1 text-red-500"><X className="h-3.5 w-3.5" /> Already taken.</span>
              )}
            </p>
            {!unchanged && typedSlug && (
              <p className="mt-1 text-[11px] text-amber-500">
                Heads up: changing this breaks links already shared to the old address.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <OfficialLinksEditor />
    </div>
  );
}
