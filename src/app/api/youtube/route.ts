import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { fetchYouTubeStats, youtubeVideoId, youtubeConfigured } from "@/server/youtube";
import { rateLimit } from "@/server/rate-limit";

/**
 * Refresh the live trailer metrics for the active film from its real YouTube
 * link. Snapshots the previous reading first, so daily velocity is a measured
 * delta. Returns the current numbers (or a clear "not configured" state).
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const film = await db()
    .prepare("SELECT trailer_url FROM films WHERE id = ?")
    .bind(filmId)
    .first<{ trailer_url: string }>();
  const videoId = youtubeVideoId(film?.trailer_url);
  if (!videoId) {
    return NextResponse.json({ error: "Add a YouTube trailer link to track views.", configured: youtubeConfigured() }, { status: 400 });
  }
  if (!youtubeConfigured()) {
    return NextResponse.json({ error: "YouTube tracking isn't configured yet.", configured: false }, { status: 400 });
  }
  if (!(await rateLimit(`yt:${filmId}`, 30, 3600))) {
    return NextResponse.json({ error: "Refresh limit reached. Try again shortly." }, { status: 429 });
  }

  const stats = await fetchYouTubeStats(videoId);
  if (!stats) return NextResponse.json({ error: "Couldn't reach YouTube for that video." }, { status: 502 });

  const d = db();
  const prev = await d
    .prepare("SELECT video_id, views, fetched_at FROM youtube_stats WHERE film_id = ?")
    .bind(filmId)
    .first<{ video_id: string; views: number; fetched_at: string }>();
  // Only carry forward the previous reading when it's the same video.
  const samey = prev && prev.video_id === videoId;
  await d
    .prepare(
      `INSERT INTO youtube_stats (film_id, video_id, views, likes, comments, fetched_at, prev_views, prev_fetched_at)
       VALUES (?,?,?,?,?,datetime('now'),?,?)
       ON CONFLICT(film_id) DO UPDATE SET
         video_id = excluded.video_id, views = excluded.views, likes = excluded.likes,
         comments = excluded.comments, fetched_at = excluded.fetched_at,
         prev_views = excluded.prev_views, prev_fetched_at = excluded.prev_fetched_at`,
    )
    .bind(filmId, videoId, stats.views, stats.likes, stats.comments, samey ? prev!.views : 0, samey ? prev!.fetched_at : "")
    .run();

  return NextResponse.json({ ...stats, configured: true });
}
