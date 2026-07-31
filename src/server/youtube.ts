import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Live trailer metrics from the real YouTube link a producer already enters.
 * Everything here is a measured number from the YouTube Data API — views,
 * likes, comments — never estimated. Needs a Worker secret YOUTUBE_API_KEY
 * (wrangler secret put YOUTUBE_API_KEY); degrades cleanly to null without one.
 */

export interface YouTubeStats {
  videoId: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

/** Pull the video id out of any common YouTube URL form. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1]!;
  }
  return null;
}

export function youtubeConfigured(): boolean {
  return !!(getCloudflareContext().env as unknown as { YOUTUBE_API_KEY?: string }).YOUTUBE_API_KEY;
}

/** Fetch real statistics for a video id, or null if unavailable. */
export async function fetchYouTubeStats(videoId: string): Promise<YouTubeStats | null> {
  const key = (getCloudflareContext().env as unknown as { YOUTUBE_API_KEY?: string }).YOUTUBE_API_KEY;
  if (!key) return null;

  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: {
      snippet?: { title?: string; publishedAt?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }[];
  };
  const item = data.items?.[0];
  if (!item) return null;
  const s = item.statistics ?? {};
  return {
    videoId,
    title: item.snippet?.title ?? "",
    publishedAt: item.snippet?.publishedAt ?? "",
    views: Number(s.viewCount ?? 0),
    likes: Number(s.likeCount ?? 0),
    comments: Number(s.commentCount ?? 0),
  };
}
