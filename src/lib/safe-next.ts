/**
 * A post-auth redirect target is only honoured when it is a local path — never
 * an absolute URL — so an invite or deep link can't be used to bounce someone
 * off to another origin after they sign in.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
