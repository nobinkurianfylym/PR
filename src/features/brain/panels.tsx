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

/** The one number, drawn once. No second chart anywhere on the screen. */
export function HealthDial({
  score,
  contributors,
}: {
  score: number;
  contributors: { label: string; value: number; hint: string }[];
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
            strokeDashoffset={c * (1 - score / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight">{score}</span>
          <span className="mt-0.5 text-xs text-faint">of 100</span>
        </div>
      </div>

      <ul className="mt-7 w-full space-y-3">
        {contributors.map((k) => (
          <li key={k.label} title={k.hint}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-muted">{k.label}</span>
              <span className="tabular-nums text-faint">{k.value}</span>
            </div>
            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-foreground/70 transition-[width] duration-700"
                style={{ width: `${k.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-faint">{children}</p>;
}
