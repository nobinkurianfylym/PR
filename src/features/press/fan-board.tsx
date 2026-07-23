"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logo";

interface Post {
  id: string;
  body: string;
  created_at: string;
  name: string;
  city: string;
}

interface BoardState {
  posts: Post[];
  canPost: boolean;
  isAdmin: boolean;
}

function timeAgo(iso: string): string {
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

const MAX_LEN = 500;

/**
 * The fan-club discussion board — a light comment wall. Joined fans post;
 * everyone reads; the team can delete. Kept fresh by polling every 12s while
 * the tab is visible (cheap, and true realtime would need paid sockets).
 * Community chat-group buttons sit on top for fans who'd rather talk live.
 */
export function FanBoard({
  slug,
  whatsapp,
  telegram,
}: {
  slug: string;
  whatsapp?: string;
  telegram?: string;
}) {
  const [state, setState] = useState<BoardState>({ posts: [], canPost: false, isAdmin: false });
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/press/${slug}/board`, { cache: "no-store" });
    if (res.ok) setState((await res.json()) as BoardState);
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  // Light polling — only while the tab is actually being looked at.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && !busy.current) void load();
    };
    const timer = setInterval(tick, 12000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    busy.current = true;
    const res = await fetch(`/api/press/${slug}/board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (res.ok) {
      const { post: fresh } = (await res.json()) as { post: Post };
      setState((s) => ({ ...s, posts: [fresh, ...s.posts] }));
      setBody("");
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "Couldn't post that.");
    }
    busy.current = false;
    setSending(false);
  }

  async function remove(id: string) {
    busy.current = true;
    const res = await fetch(`/api/press/${slug}/board/${id}`, { method: "DELETE" });
    if (res.status === 204) setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
    busy.current = false;
  }

  return (
    <section id="fan-wall" className="mt-14 scroll-mt-24">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Fan Wall
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">Join the conversation</h2>

      {(whatsapp || telegram) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <PlatformLogo platform="whatsapp" className="h-4 w-4" /> WhatsApp community
            </a>
          )}
          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <PlatformLogo platform="telegram" className="h-4 w-4" /> Telegram community
            </a>
          )}
        </div>
      )}

      {state.canPost ? (
        <form onSubmit={post} className="mt-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder="Share a thought with fellow fans…"
            className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-foreground/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-faint">{body.length}/{MAX_LEN}</span>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} /> {sending ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </form>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-faint">
          Join the fan club above to post — reading is open to everyone.
        </p>
      )}

      {state.posts.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {state.posts.map((p) => (
            <li key={p.id} className="group flex gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-600">
                {(p.name || "F").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium">{p.name || "Anonymous fan"}</span>
                  <span className="text-[11px] text-faint">
                    {p.city ? `${p.city} · ` : ""}{timeAgo(p.created_at)}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">{p.body}</p>
              </div>
              {state.isAdmin && (
                <button
                  onClick={() => void remove(p.id)}
                  aria-label="Delete post"
                  className="h-7 w-7 shrink-0 rounded-md text-faint opacity-0 transition-all hover:bg-raised hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="mx-auto h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-border py-10 text-center text-sm text-faint">
          No posts yet — be the first to say something.
        </p>
      )}
    </section>
  );
}
