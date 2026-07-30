"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Send, Trash2 } from "lucide-react";
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
 * Styled for the dark espresso Fan Club block it lives in.
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
  const [expanded, setExpanded] = useState(false);
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

  // Show the latest few until expanded — the wall stays compact.
  const LIMIT = 5;
  const shownPosts = expanded ? state.posts : state.posts.slice(0, LIMIT);

  return (
    <div id="fan-wall" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-soft">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Fan Wall
        </p>
        {(whatsapp || telegram) && (
          <div className="flex flex-wrap gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                <PlatformLogo platform="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {telegram && (
              <a
                href={telegram}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                <PlatformLogo platform="telegram" className="h-3.5 w-3.5" /> Telegram
              </a>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-white/50">Talk with fellow fans — everyone reads, joined fans post.</p>

      {state.canPost ? (
        <form onSubmit={post} className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder="Share a thought with fellow fans…"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-gold/50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/40">{body.length}/{MAX_LEN}</span>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold-soft disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} /> {sending ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/50">
          Join the fan club above to post — reading is open to everyone.
        </p>
      )}

      {state.posts.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {shownPosts.map((p) => (
            <li key={p.id} className="group flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold-soft">
                {(p.name || "F").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium text-[#f3ecdd]">{p.name || "Anonymous fan"}</span>
                  <span className="text-[11px] text-white/40">
                    {p.city ? `${p.city} · ` : ""}{timeAgo(p.created_at)}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/70">{p.body}</p>
              </div>
              {state.isAdmin && (
                <button
                  onClick={() => void remove(p.id)}
                  aria-label="Delete post"
                  className="h-7 w-7 shrink-0 rounded-md text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="mx-auto h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
          No posts yet — be the first to say something.
        </p>
      )}

      {state.posts.length > LIMIT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-[13px] font-semibold text-white/80 transition-colors hover:border-gold/40 hover:text-white"
        >
          {expanded ? "Show less" : `Show all ${state.posts.length}`}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
