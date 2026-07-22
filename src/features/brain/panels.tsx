"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The Campaign Brain's shared surfaces. Every panel states what happened,
 * why it matters, and what to do — so the shell exists only to frame a
 * decision, never to hold a chart.
 */
export function Panel({
  title,
  hint,
  action,
  accent,
  className,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  accent?: "risk" | "opportunity" | "ai" | "warning";
  className?: string;
  children: ReactNode;
}) {
  const dot = {
    risk: "bg-red-400",
    opportunity: "bg-emerald-400",
    ai: "bg-blue-400",
    warning: "bg-amber-400",
  };
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface p-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            {accent && <span className={cn("h-1.5 w-1.5 rounded-full", dot[accent])} />}
            {title}
          </p>
          {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Campaign readiness: the share of tracked fundamentals in place. Every item
 * behind the number is listed with its real state, so the score is auditable
 * rather than something to take on faith.
 */
export function ReadinessDial({
  readiness,
  fundamentals,
}: {
  readiness: { met: number; total: number; percent: number };
  fundamentals: { label: string; fact: string; met: boolean }[];
}) {
  const c = 2 * Math.PI * 52;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" strokeWidth="5" className="stroke-raised" />
          <circle
            cx="60" cy="60" r="52" fill="none" strokeWidth="5" strokeLinecap="round"
            className="stroke-foreground transition-[stroke-dashoffset] duration-700"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - readiness.percent / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">
            {readiness.met}
            <span className="text-2xl text-faint">/{readiness.total}</span>
          </span>
          <span className="mt-0.5 text-xs text-faint">fundamentals in place</span>
        </div>
      </div>

      <ul className="mt-7 w-full space-y-2.5">
        {fundamentals.map((f) => (
          <li key={f.label} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full",
                  f.met ? "bg-emerald-400" : "bg-raised ring-1 ring-border",
                )}
              />
              <span className={cn("truncate text-[13px]", f.met ? "text-muted" : "text-faint")}>
                {f.label}
              </span>
            </span>
            <span className="shrink-0 text-[13px] tabular-nums text-faint">{f.fact}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-faint">{children}</p>;
}
