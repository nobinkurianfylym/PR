"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, RotateCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/hooks/use-overview";

interface Member {
  user_id: string;
  role: "admin" | "member";
  name: string;
  email: string;
  joined_at: string;
}

/**
 * Members & access. The admin creates and rotates the invite link and manages
 * who is on the campaign; a member sees the roster but not the invite controls.
 * Everyone here has full working access to the press kit and vault.
 */
export function AccessPanel() {
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [you, setYou] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/members", { cache: "no-store" });
    if (!res.ok) return;
    const d = (await res.json()) as {
      role: "admin" | "member"; members: Member[]; inviteToken: string | null; you: string;
    };
    setRole(d.role);
    setMembers(d.members);
    setInviteToken(d.inviteToken);
    setYou(d.you);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (role === null) return null;
  const inviteUrl =
    inviteToken && typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteToken}`
      : null;

  async function rotate(disable = false) {
    setBusy(true);
    await fetch("/api/invite/rotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disable }),
    });
    await load();
    setBusy(false);
  }

  async function removeMember(id: string) {
    if (!confirm("Remove this member's access?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Card className="mb-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted" strokeWidth={1.5} />
        <p className="text-sm font-medium">Members &amp; access</p>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Everyone here has full access to the press kit and assets. The admin
        manages the invite link and the team.
      </p>

      {role === "admin" && (
        <div className="mt-5 rounded-xl border border-border bg-raised/40 p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <UserPlus className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
            Invite link
          </p>
          {inviteUrl ? (
            <>
              <p className="mt-1 text-xs text-faint">
                Anyone with this link can join and get working access. Rotate it
                to cut off the old one.
              </p>
              <code className="mt-3 block truncate rounded-lg border border-border bg-background px-3 py-2 text-[13px]">
                {inviteUrl}
              </code>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void rotate()}>
                  <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} /> Rotate
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void rotate(true)}>
                  Disable
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-faint">
                No invite link yet. Create one to bring the street team in.
              </p>
              <Button size="sm" className="mt-3" disabled={busy} onClick={() => void rotate()}>
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Create invite link
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          {members.length} {members.length === 1 ? "person" : "people"} with access
        </p>
        <div className="mt-2 divide-y divide-border rounded-xl border border-border">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name}
                  {m.user_id === you && <span className="text-faint"> · you</span>}
                </p>
                <p className="truncate text-xs text-faint">{m.email}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                  m.role === "admin" ? "border-blue-500/30 text-blue-400" : "border-border text-muted"
                }`}
              >
                {m.role === "admin" ? "Admin" : "Member"}
              </span>
              <span className="hidden shrink-0 text-xs text-faint sm:block">
                {formatDate(m.joined_at.slice(0, 10))}
              </span>
              {role === "admin" && m.user_id !== you && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => void removeMember(m.user_id)}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
