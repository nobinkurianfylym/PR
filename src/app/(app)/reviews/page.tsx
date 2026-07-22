"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ReviewCard } from "@/features/reviews/review-card";
import { api, useOverview } from "@/hooks/use-overview";

function ReviewsInner() {
  const { data, refresh } = useOverview();
  const params = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState("");
  const [publication, setPublication] = useState("");
  const [critic, setCritic] = useState("");
  const [rating, setRating] = useState("4");

  // Arriving from "Add to Review Wall" on an approved coverage link.
  useEffect(() => {
    const pub = params.get("publication");
    const cri = params.get("critic");
    if (pub || cri) {
      if (pub) setPublication(pub);
      if (cri) setCritic(cri);
      setAdding(true);
    }
  }, [params]);

  if (!data?.film) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.addReview({
      quote,
      publication,
      critic,
      rating: Number(rating),
    });
    if (res.ok) {
      setQuote("");
      setPublication("");
      setCritic("");
      setAdding(false);
      await refresh();
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Review Wall
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            What the press is saying
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track every mention; turn the best lines into quote cards.
          </p>
        </div>
        <Button onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Add review
        </Button>
      </div>

      {adding && (
        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Quote" htmlFor="rq">
              <Input id="rq" value={quote} onChange={(e) => setQuote(e.target.value)} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Publication" htmlFor="rp">
                <Input id="rp" value={publication} onChange={(e) => setPublication(e.target.value)} required />
              </Field>
              <Field label="Critic (optional)" htmlFor="rc">
                <Input id="rc" value={critic} onChange={(e) => setCritic(e.target.value)} />
              </Field>
              <Field label="Rating (0.5–5)" htmlFor="rr">
                <Input
                  id="rr"
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Button type="submit">Save review</Button>
          </form>
        </Card>
      )}

      {data.reviews.length === 0 ? (
        <p className="mt-16 text-center text-sm text-faint">
          No reviews yet. Add the first press mention above.
        </p>
      ) : (
        <div className="mt-8 columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {data.reviews.map((r) => (
            <ReviewCard key={r.id} review={r} filmTitle={data.film!.title} withQuoteCard />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ReviewsInner />
    </Suspense>
  );
}
