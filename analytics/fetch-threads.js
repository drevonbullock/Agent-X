import "dotenv/config";

// Threads media insights — graph.threads.net v1.0
// Requires the posting token with the `threads_manage_insights` scope.
// Docs: https://developers.facebook.com/docs/threads/insights
const API_BASE = "https://graph.threads.net/v1.0";

function readMetric(entry) {
  return entry?.total_value?.value ?? entry?.values?.[0]?.value ?? 0;
}

// Returns normalized { views, likes, comments, shares } or null on hard failure.
// Threads maps: replies → comments, reposts + quotes (+ shares) → shares.
export async function fetchThreadsMetrics(mediaId) {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Analytics:Threads] THREADS_ACCESS_TOKEN not set — skipping");
    return null;
  }

  try {
    const res = await fetch(
      `${API_BASE}/${mediaId}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${token}`
    );
    if (!res.ok) {
      console.warn(`[Analytics:Threads] insights ${res.status} for ${mediaId}`);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }

    const { data } = await res.json();
    const raw = {};
    for (const entry of data ?? []) raw[entry.name] = readMetric(entry);

    return {
      views: raw.views ?? 0,
      likes: raw.likes ?? 0,
      comments: raw.replies ?? 0,
      shares: (raw.reposts ?? 0) + (raw.quotes ?? 0) + (raw.shares ?? 0),
    };
  } catch (err) {
    console.warn(`[Analytics:Threads] fetch failed for ${mediaId}: ${err.message}`);
    return null;
  }
}
