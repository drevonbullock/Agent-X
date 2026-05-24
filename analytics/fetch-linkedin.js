import "dotenv/config";

// LinkedIn engagement — best-effort.
// Member-level impression/view analytics is gated behind partner products, so
// views stay 0. Likes + comments are readable via the socialActions endpoint
// (needs r_member_social on the token); if the scope is missing the call 403s
// and we degrade to zeros rather than throwing.
const API_BASE = "https://api.linkedin.com";

function linkedInHeaders() {
  return {
    Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    "LinkedIn-Version": "202503",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

// postUrn: the x-restli-id stored at post time, e.g. "urn:li:share:7300..."
// Returns normalized { views, likes, comments, shares } or null on hard failure.
export async function fetchLinkedInMetrics(postUrn) {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    console.warn("[Analytics:LinkedIn] LINKEDIN_ACCESS_TOKEN not set — skipping");
    return null;
  }
  if (!postUrn?.startsWith("urn:li:")) {
    // Older rows may have stored a bare ID; nothing we can query reliably.
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  const metrics = { views: 0, likes: 0, comments: 0, shares: 0 };

  try {
    const res = await fetch(
      `${API_BASE}/rest/socialActions/${encodeURIComponent(postUrn)}`,
      { headers: linkedInHeaders() }
    );
    if (res.status === 403 || res.status === 401) {
      console.warn(`[Analytics:LinkedIn] socialActions ${res.status} (scope likely missing) — engagement unavailable`);
      return metrics;
    }
    if (res.ok) {
      const j = await res.json();
      metrics.likes = j.likesSummary?.totalLikes ?? j.likesSummary?.aggregatedTotalLikes ?? 0;
      metrics.comments = j.commentsSummary?.count ?? j.commentsSummary?.aggregatedTotalComments ?? 0;
    }
  } catch (err) {
    console.warn(`[Analytics:LinkedIn] fetch failed for ${postUrn}: ${err.message}`);
  }

  return metrics;
}
