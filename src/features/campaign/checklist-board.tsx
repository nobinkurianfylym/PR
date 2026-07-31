"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, ChevronDown, Download, FileDown, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKLIST, CHECKLIST_TOTAL } from "@/lib/checklist";
import { useOverview } from "@/hooks/use-overview";

interface ItemState {
  done: boolean;
  file: string | null;
  assignee: string;
  dueDate: string;
}
type State = Record<string, ItemState>;

const EMPTY: ItemState = { done: false, file: null, assignee: "", dueDate: "" };

function short(name: string): string {
  if (name.length <= 18) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  return `${name.slice(0, 14 - ext.length)}…${ext}`;
}

/**
 * The campaign checklist — every publicity task grouped by phase. Each item now
 * carries an owner, a due date, an optional file, and an auto "Live" badge when
 * the work is provable from real artifacts already on file (a trailer asset, a
 * published poster, the fan club being live). Exportable as a schedule.
 */
export function ChecklistBoard() {
  const { data } = useOverview();
  const [state, setState] = useState<State>({});
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set([CHECKLIST[0]!.id]));
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const res = await fetch("/api/checklist", { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { state: State; verified: string[] };
      setState(d.state ?? {});
      setVerified(new Set(d.verified ?? []));
    }
    setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const at = useCallback((key: string): ItemState => state[key] ?? EMPTY, [state]);
  const team = (data?.team ?? []).filter((t) => (t as { status?: string }).status !== "Removed");

  function toggleExpand(id: string) {
    setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function patch(key: string, body: Record<string, unknown>) {
    await fetch("/api/checklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...body }) });
  }
  async function toggle(key: string) {
    const done = !at(key).done;
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), done } }));
    await patch(key, { done });
  }
  async function setOwner(key: string, assignee: string) {
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), assignee } }));
    await patch(key, { assignee });
  }
  async function setDue(key: string, dueDate: string) {
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), dueDate } }));
    await patch(key, { dueDate });
  }
  async function upload(key: string, file: File) {
    setBusy(key);
    const form = new FormData(); form.append("key", key); form.append("file", file);
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

  function exportCsv() {
    const rows: string[][] = [["Category", "Task", "Status", "Owner", "Due", "Verified live", "Attachment"]];
    for (const cat of CHECKLIST) {
      for (const it of cat.items) {
        const key = `${cat.id}.${it.id}`;
        const s = at(key);
        rows.push([
          cat.label, it.label,
          verified.has(key) ? "Live" : s.done ? "Done" : "Open",
          s.assignee, s.dueDate, verified.has(key) ? "Yes" : "", s.file ?? "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data?.film?.title ?? "campaign").toLowerCase().replace(/\s+/g, "-")}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const doneCount = useMemo(
    () => CHECKLIST.reduce((n, c) => n + c.items.filter((i) => at(`${c.id}.${i.id}`).done || verified.has(`${c.id}.${i.id}`)).length, 0),
    [at, verified],
  );
  const pct = Math.round((doneCount / CHECKLIST_TOTAL) * 100);

  if (!ready) return null;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">Campaign progress</p>
          <div className="flex items-center gap-3">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-foreground">
              <FileDown className="h-3.5 w-3.5" strokeWidth={1.5} /> Export schedule
            </button>
            <p className="text-sm tabular-nums text-muted">{doneCount}<span className="text-faint">/{CHECKLIST_TOTAL}</span></p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {CHECKLIST.map((cat) => {
          const total = cat.items.length;
          const done = cat.items.filter((i) => { const k = `${cat.id}.${i.id}`; return at(k).done || verified.has(k); }).length;
          const open = expanded.has(cat.id);
          const complete = done === total;
          return (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <button onClick={() => toggleExpand(cat.id)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised">
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-faint transition-transform", open ? "" : "-rotate-90")} strokeWidth={1.5} />
                <span className="flex-1 font-medium">{cat.label}</span>
                <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-raised sm:block">
                  <span className={cn("block h-full rounded-full", complete ? "bg-emerald-500" : "bg-foreground/70")} style={{ width: `${(done / total) * 100}%` }} />
                </span>
                <span className={cn("w-10 shrink-0 text-right text-xs tabular-nums", complete ? "text-emerald-400" : "text-faint")}>{done}/{total}</span>
              </button>

              {open && (
                <ul className="border-t border-border">
                  {cat.items.map((it) => {
                    const key = `${cat.id}.${it.id}`;
                    const item = at(key);
                    const isVerified = verified.has(key);
                    const checked = item.done || isVerified;
                    const overdue = item.dueDate && !checked && item.dueDate < today;
                    const loading = busy === key;
                    return (
                      <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/50 px-4 py-2.5 first:border-t-0">
                        <button
                          onClick={() => void toggle(key)}
                          disabled={isVerified}
                          aria-pressed={checked}
                          aria-label={checked ? "Done" : "Mark done"}
                          className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                            checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-foreground/40",
                            isVerified && "opacity-90")}
                        >
                          {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        </button>

                        <span className={cn("min-w-[8rem] flex-1 text-sm", checked && "text-faint")}>
                          <span className={cn(item.done && !isVerified && "line-through")}>{it.label}</span>
                          {isVerified && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-400">
                              <BadgeCheck className="h-3 w-3" strokeWidth={2} /> Live
                            </span>
                          )}
                        </span>

                        {/* Owner */}
                        <select
                          value={item.assignee}
                          onChange={(e) => void setOwner(key, e.target.value)}
                          aria-label="Owner"
                          className="h-8 max-w-[9rem] rounded-lg border border-border bg-raised px-2 text-xs text-muted"
                        >
                          <option value="">Owner…</option>
                          {team.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>

                        {/* Due date */}
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => void setDue(key, e.target.value)}
                          aria-label="Due date"
                          className={cn("h-8 rounded-lg border bg-raised px-2 text-xs", overdue ? "border-red-500/40 text-red-400" : "border-border text-muted")}
                        />

                        {/* File */}
                        {item.file ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-raised py-1 pl-2 pr-1 text-xs">
                            <a href={`/api/checklist/file?key=${encodeURIComponent(key)}`} className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-foreground" title={`Download ${item.file}`}>
                              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span className="max-w-[7rem] truncate">{short(item.file)}</span>
                            </a>
                            <button onClick={() => void removeFile(key)} aria-label="Remove file" className="rounded p-0.5 text-faint transition-colors hover:text-red-400">
                              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            </button>
                          </span>
                        ) : (
                          <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground", loading && "pointer-events-none opacity-70")}>
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />}
                            <span className="hidden sm:inline">{loading ? "…" : "Proof"}</span>
                            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(key, f); e.target.value = ""; }} />
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
