import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { JoinClient } from "@/features/members/join-client";

/**
 * Invite landing. A signed-out visitor is sent to sign up first (carrying the
 * invite as their post-auth destination), so a new street-team member creates
 * an account and lands right back here to be added.
 */
export const dynamic = "force-dynamic";

export default async function JoinPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/join/${token}`)}`);

  const film = await db()
    .prepare("SELECT title FROM films WHERE invite_token = ?")
    .bind(token)
    .first<{ title: string }>();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      <JoinClient token={token} filmTitle={film?.title ?? null} />
    </div>
  );
}
