"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky section navigation. Only sections that actually have content are
 * passed in, so the bar never offers a jump to an empty part of the page.
 * The active entry follows the scroll position, so it doubles as a position
 * indicator on a long press kit.
 */
export function SectionNav({
  sections,
  accent = false,
}: {
  sections: { id: string; label: string }[];
  /** Indigo, attention-drawing treatment — used on the public fan page. */
  accent?: boolean;
}) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  const key = sections.map((s) => s.id).join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;

    // The last heading to have passed under the bar is the section you are in.
    // Computed rather than observed: anchors are thin, so an
    // IntersectionObserver frequently has nothing intersecting and leaves the
    // highlight stuck on whichever section it started with.
    const onScroll = () => {
      // At the foot of the page the final sections can never reach the top,
      // so nothing below would ever highlight. Treat the bottom as the last
      // section, and give the one before it the lower half of that stretch.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (atBottom) {
        setActive(ids[ids.length - 1]!);
        return;
      }

      let current = ids[0]!;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 96) current = id;
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "sticky top-0 z-20 -mx-6 mb-8 border-b px-6 backdrop-blur md:-mx-10 md:px-10",
        accent
          ? "border-gold/25 bg-gradient-to-r from-gold/15 via-gold/10 to-transparent"
          : "border-border bg-background/85",
      )}
    >
      <ul className="flex gap-1.5 overflow-x-auto py-3">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "block whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all",
                accent
                  ? active === s.id
                    ? "bg-gold text-white shadow-sm shadow-gold/30"
                    : "text-gold-deep/70 hover:bg-gold/10 hover:text-gold-deep"
                  : active === s.id
                    ? "bg-raised text-foreground"
                    : "text-muted hover:text-foreground",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Anchor target with enough offset that the sticky bar never covers a heading. */
export function SectionHeading({
  id,
  title,
  count,
  action,
}: {
  id: string;
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 className="text-sm font-medium">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-xs font-normal text-faint">{count}</span>
          )}
        </h2>
        {action}
      </div>
    </div>
  );
}
