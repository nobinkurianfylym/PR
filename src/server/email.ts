import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Email delivery via Resend, active only when RESEND_API_KEY is configured
 * (wrangler secret put RESEND_API_KEY) with a verified sending domain. Until
 * then broadcasts are stored but not delivered — the master admin can export
 * the recipient list and send through their own tool. This mirrors how the
 * Campaign Brain degrades without an OpenAI key: the feature is whole, the
 * outbound integration is one key away.
 */
interface Env {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

function env(): Env {
  return getCloudflareContext().env as unknown as Env;
}

export function emailConfigured(): boolean {
  return !!env().RESEND_API_KEY;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Send one email. Returns ok:false rather than throwing, so a bulk run can
 *  count failures and continue. */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  const { RESEND_API_KEY, MAIL_FROM } = env();
  if (!RESEND_API_KEY) return { ok: false, error: "not-configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: MAIL_FROM ?? "PR.FYLYM <updates@fylym.com>",
        to,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : "error" };
  }
}
