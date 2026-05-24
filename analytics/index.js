import "dotenv/config";
import supabase from "../supabase/client.js";
import { fetchInstagramMetrics } from "./fetch-instagram.js";
import { fetchThreadsMetrics } from "./fetch-threads.js";
import { fetchLinkedInMetrics } from "./fetch-linkedin.js";
import { learnPerPlatform } from "./learn.js";
import { evaluateExperiments } from "./ab-testing.js";

export { learnPerPlatform, getBestFor } from "./learn.js";
export { createExperiment, evaluateExperiments, scorePost } from "./ab-testing.js";

// Re-poll posts from the last N days — engagement keeps accruing for a while,
// then plateaus, so there's no value re-fetching ancient rows.
const SYNC_WINDOW_DAYS = 14;
const BATCH_LIMIT = 150;

const FETCHERS = {
  instagram: fetchInstagramMetrics,
  threads: fetchThreadsMetrics,
  linkedin: fetchLinkedInMetrics,
};

function engagementRate({ likes, comments, shares, views }) {
  if (!views || views <= 0) return 0;
  return Number(((likes + comments + shares) / views).toFixed(4));
}

// Pull live metrics for every recent post on a supported platform and write
// them back into the posts table. This is the data foundation everything else
// (feedback-loop, hook-tester, variation-engine, learn, A/B) reads from.
export async function syncAllMetrics() {
  const since = new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, platform, post_id")
    .in("platform", Object.keys(FETCHERS))
    .not("post_id", "is", null)
    .gte("created_at", since)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error(`[Analytics] Sync fetch failed: ${error.message}`);
    return { synced: 0, failed: 0 };
  }
  if (!posts?.length) {
    console.log("[Analytics] No recent posts to sync");
    return { synced: 0, failed: 0 };
  }

  console.log(`[Analytics] Syncing metrics for ${posts.length} post(s)...`);
  let synced = 0, failed = 0;

  for (const post of posts) {
    const fetcher = FETCHERS[post.platform];
    let metrics;
    try {
      metrics = await fetcher(post.post_id);
    } catch (err) {
      console.warn(`[Analytics] ${post.platform} fetch threw for ${post.post_id}: ${err.message}`);
      metrics = null;
    }
    if (!metrics) { failed++; continue; }

    const { error: upErr } = await supabase
      .from("posts")
      .update({
        views: metrics.views ?? 0,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
        engagement_rate: engagementRate(metrics),
        metrics_synced_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (upErr) { console.warn(`[Analytics] update failed for ${post.id}: ${upErr.message}`); failed++; }
    else synced++;
  }

  console.log(`[Analytics] Sync done — ${synced} updated, ${failed} failed`);
  return { synced, failed };
}

// Full nightly-ish pass: refresh metrics, recompute per-platform learning,
// then decide any A/B experiments whose window has closed.
export async function runAnalyticsCycle() {
  await syncAllMetrics();
  await learnPerPlatform();
  await evaluateExperiments();
}

// CLI: node analytics/index.js  (sync + learn + evaluate)
const isMain = process.argv[1]?.endsWith("analytics/index.js") || process.argv[1]?.endsWith("analytics\\index.js");
if (isMain) {
  runAnalyticsCycle().then(() => process.exit(0)).catch((err) => {
    console.error(`[Analytics] Fatal: ${err.message}`);
    process.exit(1);
  });
}
