"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Download, Loader2, Paperclip, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKLIST, CHECKLIST_TOTAL } from "@/lib/checklist";

interface ItemState {
  done: boolean;
  file: string | null;
}
type State = Record<string, ItemState>;

const EMPTY: ItemState = { done: false, file: null };

function short(name: string): string {
  if (name.length <= 20) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  return `${name.slice(0, 16 - ext.length)}…${ext}`;
}

/**
 * The campaign checklist — every publicity task grouped by phase, each with a
 * tick and a file slot. The template is fixed (src/lib/checklist.ts); only the
 * ticked/uploaded state is saved per film, live as you go.
 */
export function ChecklistBoard() {
  const [state, setState] = useState<State>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set([CHECKLIST[0]!.id]));
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/checklist", { cache: "no-store" });
    if (res.ok) setState(((await res.json()) as { state: State }).state ?? {});
    setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const at = useCallback((key: string): ItemState => state[key] ?? EMPTY, [state]);

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function toggle(key: string) {
    const done = !at(key).done;
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), done } }));
    await fetch("/api/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, done }),
    });
  }

  async function upload(key: string, file: File) {
    setBusy(key);
    const form = new FormData();
    form.append("key", key);
    form.append("file", file);
    const res = await fetch("/api/checklist/file", { method: "POST", body: form });
    if (res.ok) {
      const { file: name } = (await res.json()) as { file: string };
      setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), file: name } }));
    }
    setBusy(null);
  }

  async function removeFile(key: string) {
    setBusy(key);
    await fetch(`/api/checklist/file?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), file: null } }));
    setBusy(null);
  }

  const doneCount = useMemo(() => Object.values(state).filter((i) => i.done).length, [state]);
  const pct = Math.round((doneCount / CHECKLIST_TOTAL) * 100);

  if (!ready) return null;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Campaign progress</p>
          <p className="text-sm tabular-nums text-muted">
            {doneCount}<span className="text-faint">/{CHECKLIST_TOTAL}</span>
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {CHECKLIST.map((cat) => {
          const total = cat.items.length;
          const done = cat.items.filter((i) => at(`${cat.id}.${i.id}`).done).length;
          const open = expanded.has(cat.id);
          const complete = done === total;
          return (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <button
                onClick={() => toggleExpand(cat.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
              >
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-faint transition-transform", open ? "" : "-rotate-90")}
                  strokeWidth={1.5}
                />
                <span className="flex-1 font-medium">{cat.label}</span>
                <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-raised sm:block">
                  <span
                    className={cn("block h-full rounded-full", complete ? "bg-emerald-500" : "bg-foreground/70")}
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-10 shrink-0 text-right text-xs tabular-nums",
                    complete ? "text-emerald-400" : "text-faint",
                  )}
                >
                  {done}/{total}
                </span>
              </button>

              {open && (
                <ul className="border-t border-border">
                  {cat.items.map((it) => {
                    const key = `${cat.id}.${it.id}`;
                    const item = at(key);
                    const loading = busy === key;
                    return (
                      <li
                        key={key}
                        className="flex items-center gap-3 border-t border-border/50 px-4 py-2.5 first:border-t-0"
                      >
                        <button
                          onClick={() => void toggle(key)}
                          aria-pressed={item.done}
                          aria-label={item.done ? "Mark not done" : "Mark done"}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                            item.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border hover:border-foreground/40",
                          )}
                        >
                          {item.done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        </button>

                        <span className={cn("flex-1 text-sm", item.done && "text-faint line-through")}>
                          {it.label}
                        </span>

                        {item.file ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-raised py-1 pl-2 pr-1 text-xs">
                            <a
                              href={`/api/checklist/file?key=${encodeURIComponent(key)}`}
                              className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-foreground"
                              title={`Download ${item.file}`}
                            >
                              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span className="max-w-[9rem] truncate">{short(item.file)}</span>
                            </a>
                            <button
                              onClick={() => void removeFile(key)}
                              aria-label="Remove file"
                              className="rounded p-0.5 text-faint transition-colors hover:text-red-400"
                            >
                              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            </button>
                          </span>
                        ) : (
                          <label
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground",
                              loading && "pointer-events-none opacity-70",
                            )}
                          >
                            {loading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                            <span className="hidden sm:inline">{loading ? "Uploading…" : "Upload"}</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void upload(key, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
