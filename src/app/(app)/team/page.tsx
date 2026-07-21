"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { api, useOverview } from "@/hooks/use-overview";
import type { TeamMember } from "@/types";

const STATUS_TONE: Record<TeamMember["status"], BadgeTone> = {
  Active: "positive",
  Invited: "attention",
  Paused: "neutral",
};

export default function TeamPage() {
  const { data, refresh } = useOverview();
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  if (!data?.film) return null;
  const team = data.team;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.invite(name, role);
    if (res.ok) {
      setName("");
      setRole("");
      setInviting(false);
      await refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Street Team
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            The people carrying your film
          </h1>
        </div>
        <Button onClick={() => setInviting((v) => !v)}>
          <UserPlus className="h-4 w-4" strokeWidth={1.5} /> Invite
        </Button>
      </div>

      {inviting && (
        <Card className="mt-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Name" htmlFor="member-name">
              <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Role" htmlFor="member-role">
              <Input
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Campus Ambassador"
                required
              />
            </Field>
            <Button type="submit">Add member</Button>
          </form>
        </Card>
      )}

      <Card className="mt-8 p-0">
        {team.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-faint">
            No members yet — invite the first people who will amplify every drop.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              <span>Member</span>
              <span>Status</span>
              <span className="text-right">Contribution</span>
            </div>
            <div className="divide-y divide-border border-t border-border">
              {team.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-[13px] text-faint">{m.role}</p>
                  </div>
                  <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                  <p className="text-right text-sm tabular-nums text-muted">
                    {m.contribution > 0 ? `${m.contribution} pts` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
