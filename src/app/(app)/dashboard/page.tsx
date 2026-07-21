"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { HealthScore } from "@/features/dashboard/health-score";
import { MissionCard } from "@/features/dashboard/mission-card";
import { CampaignTimeline } from "@/features/campaign/campaign-timeline";
import { ReviewCard } from "@/features/reviews/review-card";
import { api, formatDate, useOverview } from "@/hooks/use-overview";

export default function DashboardPage() {
  const { data, refresh } = useOverview();
  if (!data?.film) return null;
  const { film, phases, missions, reviews } = data;
  const upcoming = phases.filter((p) => p.status === "upcoming").slice(0, 3);
  const open = missions.filter((m) => !m.done).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <HealthScore film={film} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between">
            <CardTitle>Today&apos;s priorities</CardTitle>
            <span className="text-xs text-faint">{open} open</span>
          </div>
          <div className="mt-2 divide-y divide-border">
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={{ ...m, done: !!m.done }}
                onToggle={async () => {
                  await api.toggleMission(m.id, !m.done);
                  await refresh();
                }}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <CardTitle>Campaign timeline</CardTitle>
            <Link href="/campaign" className="text-xs text-faint hover:text-foreground">
              Open →
            </Link>
          </div>
          <div className="mt-4">
            <CampaignTimeline entries={phases} compact />
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <CardTitle>Latest reviews</CardTitle>
            <Link href="/reviews" className="text-xs text-faint hover:text-foreground">
              Review Wall →
            </Link>
          </div>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-faint">
              No reviews yet — add press mentions on the Review Wall.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.slice(0, 2).map((r) => (
                <ReviewCard key={r.id} review={r} filmTitle={film.title} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Upcoming milestones</CardTitle>
          <ul className="mt-3 space-y-2.5">
            {upcoming.map((t) => (
              <li key={t.phase} className="flex items-baseline justify-between text-sm">
                <span>{t.phase}</span>
                <span className="text-xs text-faint">{formatDate(t.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
