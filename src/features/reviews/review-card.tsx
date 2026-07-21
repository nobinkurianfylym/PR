"use client";

import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/hooks/use-overview";
import type { Review } from "@/types";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-foreground">
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
      ))}
      {half && <StarHalf className="h-3.5 w-3.5 fill-current" strokeWidth={0} />}
    </span>
  );
}

/** One review on the wall; can flip into the shareable quote-card artwork. */
export function ReviewCard({
  review,
  filmTitle,
  withQuoteCard = false,
}: {
  review: Review;
  filmTitle: string;
  withQuoteCard?: boolean;
}) {
  const [showCard, setShowCard] = useState(false);

  if (showCard) {
    return (
      <figure className="break-inside-avoid rounded-xl border border-foreground/20 bg-foreground p-6 text-background">
        <Stars rating={review.rating} />
        <blockquote className="mt-3 text-lg font-medium leading-snug">
          “{review.quote}”
        </blockquote>
        <figcaption className="mt-4 text-[13px] opacity-70">
          {review.publication} — {filmTitle.toUpperCase()}
        </figcaption>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => downloadQuoteCard(review, filmTitle)}
            className="text-xs font-medium underline"
          >
            Download PNG
          </button>
          <button
            onClick={() => setShowCard(false)}
            className="text-xs underline opacity-60 hover:opacity-100"
          >
            Back to review
          </button>
        </div>
      </figure>
    );
  }

  return (
    <figure className="break-inside-avoid rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} />
        <span className="text-xs text-faint">{formatDate(review.date)}</span>
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed">“{review.quote}”</blockquote>
      <figcaption className="mt-3 text-[13px] text-muted">
        {review.publication}
        {review.critic ? ` · ${review.critic}` : ""}
      </figcaption>
      {withQuoteCard && (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCard(true)}>
          Generate Quote Card
        </Button>
      )}
    </figure>
  );
}

/** Renders the quote card to a 1080×1350 PNG (portrait social size) and downloads it. */
function downloadQuoteCard(review: Review, filmTitle: string): void {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0a0a0b";

  const stars = "★".repeat(Math.floor(review.rating)) + (review.rating % 1 >= 0.5 ? "½" : "");
  ctx.font = "48px -apple-system, sans-serif";
  ctx.fillText(stars, 96, 220);

  ctx.font = "600 72px -apple-system, sans-serif";
  const words = `\u201C${review.quote}\u201D`.split(" ");
  let line = "";
  let y = 380;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > W - 192 && line) {
      ctx.fillText(line, 96, y);
      line = word;
      y += 96;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 96, y);

  ctx.font = "40px -apple-system, sans-serif";
  ctx.globalAlpha = 0.65;
  ctx.fillText(`${review.publication} \u2014 ${filmTitle.toUpperCase()}`, 96, H - 140);
  ctx.globalAlpha = 1;

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${filmTitle.toLowerCase().replace(/\s+/g, "-")}-quote-card.png`;
  a.click();
}
