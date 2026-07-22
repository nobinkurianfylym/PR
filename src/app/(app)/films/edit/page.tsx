"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useOverview } from "@/hooks/use-overview";
import { OfficialLinksEditor } from "@/features/films/official-links-editor";

type FormState = Record<
  "title" | "genre" | "language" | "budget" | "marketingBudget" | "releaseDate" | "posterUrl" | "trailerUrl" | "cast" | "crew",
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
      });
    }
  }, [data, form]);

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
