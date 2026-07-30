"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a block so it gently fades and rises into view once, the first time it
 * scrolls near the viewport. Purely presentational: the styling lives in the
 * `.reveal` utility (compositor-only, reduced-motion aware), and content is
 * fully visible without JS — so it never affects SEO or accessibility.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Small stagger (ms) for sequenced elements. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
