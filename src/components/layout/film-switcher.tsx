"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, useOverview } from "@/hooks/use-overview";

/**
 * Campaign switcher — the control that makes PR.FYLYM multi-film. Shows the
 * active campaign; the dropdown lists every campaign the producer owns and
 * offers a shortcut to start a new one. Choosing one persists server-side
 * (active-film cookie) and refetches, so every page follows the switch.
 */
export function FilmSwitcher() {
  const router = useRouter();
  const { data, refresh } = useOverview();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!data?.film) return null;
  const films = data.films;

  async function choose(id: string) {
    setOpen(false);
    if (id === data!.film!.id) return;
    setSwitching(true);
    await api.selectFilm(id);
    await refresh();
    setSwitching(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-raised px-3 py-2 text-left text-sm transition-colors hover:border-foreground/30 disabled:opacity-60"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
            Campaign
          </span>
          <span className="block truncate font-medium">
            {switching ? "Switching…" : data.film.title}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
          <ul className="max-h-64 overflow-auto py-1">
            {films.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => void choose(f.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-raised"
                >
                  <span className="min-w-0 truncate">{f.title}</span>
                  {f.id === data.film!.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-foreground" strokeWidth={2} />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/films/new");
            }}
            className={cn(
              "flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-muted transition-colors hover:bg-raised hover:text-foreground",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} /> New campaign
          </button>
        </div>
      )}
    </div>
  );
}
