import "dotenv/config";

// Instagram media insights — graph.instagram.com v22.0
// Requires the same token used for posting, with the `instagram_manage_insights` scope.
// Docs: https://developers.facebook.com/docs/instagram-platform/insights
const API_BASE = "https://graph.instagram.com/v22.0";

// Pull a value out of either the legacy { values: [{ value }] } shape
// or the newer { total_value: { value } } shape.
function readMetric(entry) {
  return entry?.total_value?.value ?? entry?.values?.[0]?.value ?? 0;
}

// Returns normalized { views, likes, comments, shares } or null on hard failure.
export async function fetchInstagramMetrics(mediaId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Analytics:IG] INSTAGRAM_ACCESS_TOKEN not set — skipping");
    return null;
  }

  const metrics = { views: 0, likes: 0, comments: 0, shares: 0 };

  // 1. Basic counts via fields — reliable for every media type.
  try {
    const res = await fetch(
      `${API_BASE}/${mediaId}?fields=like_count,comments_count&access_token=${token}`
    );
    if (res.ok) {
      const j = await res.json();
      metrics.likes = j.like_count ?? 0;
      metrics.comments = j.comments_count ?? 0;
    }
  } catch (err) {
    console.warn(`[Analytics:IG] fields fetch failed for ${mediaId}: ${err.message}`);
  }

  // 2. Reach/views/shares via insights — best-effort (metric set varies by media type).
  try {
    const res = await fetch(
      `${API_BASE}/${mediaId}/insights?metric=views,reach,shares,likes,comments&access_token=${token}`
    );
    if (res.ok) {
      const { data } = await res.json();
      for (const entry of data ?? []) {
        const v = readMetric(entry);
        if (entry.name === "views") metrics.views = v;
        else if (entry.name === "shares") metrics.shares = v;
        else if (entry.name === "likes" && v) metrics.likes = v;
        else if (entry.name === "comments" && v) metrics.comments = v;
      }
    }
  } catch (err) {
    console.warn(`[Analytics:IG] insights fetch failed for ${mediaId}: ${err.message}`);
  }

  return metrics;
}
