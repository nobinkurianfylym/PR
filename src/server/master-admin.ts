import { currentUser, type SessionUser } from "./auth";

/**
 * Platform master admins — the people who run PR.FYLYM itself, not a single
 * campaign. They see every fan across every film and can message them. The
 * allowlist is deliberately hard-coded: this is a role you cannot grant
 * yourself through the app.
 */
export const MASTER_ADMINS = ["nobinkurian@gmail.com", "hello@fylym.com"];

export function isMasterAdminEmail(email: string | undefined | null): boolean {
  return !!email && MASTER_ADMINS.includes(email.trim().toLowerCase());
}

/** The current user, but only if they are a master admin — else null. */
export async function requireMasterAdmin(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user && isMasterAdminEmail(user.email) ? user : null;
}
