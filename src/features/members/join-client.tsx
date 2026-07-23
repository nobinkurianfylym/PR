"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Redeems the invite for a signed-in visitor and lands them on the assets
 * page — the shared workspace this invite is about.
 */
export function JoinClient({
  token,
  filmTitle,
}: {
  token: string;
  filmTitle: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<"joining" | "error">("joining");

  useEffect(() => {
    if (!filmTitle) {
      setState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/join/${token}`, { method: "POST" });
      if (cancelled) return;
      if (res.ok) router.replace("/assets");
      else setState("error");
    })();
    return () => {
      cancelled = true;
    };
  }, [token, filmTitle, router]);

  if (state === "error" || !filmTitle) {
    return (
      <>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-faint">
          PR.FYLYM
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          This invite link is no longer valid
        </h1>
        <p className="mt-2 text-sm text-muted">
          Ask the campaign admin for a fresh link.
        </p>
        <Button className="mt-6" onClick={() => router.replace("/")}>
          Go to PR.FYLYM
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-faint">
        PR.FYLYM
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Joining {filmTitle}…
      </h1>
      <p className="mt-2 text-sm text-muted">Setting up your access.</p>
    </>
  );
}
