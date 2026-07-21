"use client";

import { CampaignTimeline } from "@/features/campaign/campaign-timeline";
import { useOverview } from "@/hooks/use-overview";

export default function CampaignPage() {
  const { data } = useOverview();
  if (!data?.film) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        Campaign
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {data.film.title} — from announcement to awards
      </h1>
      <p className="mt-1 text-sm text-muted">
        Planned by the Campaign Brain from your release date. Click a phase for detail.
      </p>
      <div className="mt-10">
        <CampaignTimeline entries={data.phases} />
      </div>
    </div>
  );
}
