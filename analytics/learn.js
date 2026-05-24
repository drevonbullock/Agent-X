import "dotenv/config";
import supabase from "../supabase/client.js";
import { scorePost } from "./ab-testing.js";

const LOOKBACK_DAYS = 30;
const MIN_SAMPLE = 3; // don't trust a dimension value until we've seen it this many times

// Aggregate the last LOOKBACK_DAYS of real metrics per platform and per
// dimension (format, post_type), then replace that platform's rows in
// platform_performance. This is the "self-learn which post types perform best
// on each platform" layer — it reads the metrics the fetchers populated.
export async function learnPerPlatform() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("platform, format, post_type, likes, comments, shares, views")
    .gte("created_at", since);

  if (error) {
    console.warn(`[Analytics:Learn] fetch failed: ${error.message}`);
    return [];
  }
  if (!posts?.length) {
    console.log("[Analytics:Learn] No posts in window — skipping");
    return [];
  }

  // platform -> dimension -> value -> { total, count }
  const agg = {};
  const bump = (platform, dimension, value) => {
    if (!value) return null;
    agg[platform] ??= {};
    agg[platform][dimension] ??= {};
    agg[platform][dimension][value] ??= { total: 0, count: 0 };
    return agg[platform][dimension][value];
  };

  for (const p of posts) {
    const score = scorePost(p);
    for (const [dimension, value] of [["format", p.format], ["post_type", p.post_type]]) {
      const cell = bump(p.platform, dimension, value);
      if (cell) {
        cell.total += score;
        cell.count += 1;
      }
    }
  }

  const rows = [];
  for (const [platform, dims] of Object.entries(agg)) {
    for (const [dimension, values] of Object.entries(dims)) {
      for (const [value, { total, count }] of Object.entries(values)) {
        rows.push({
          platform,
          dimension,
          value,
          avg_score: count ? total / count : 0,
          sample_size: count,
        });
      }
    }
  }

  // Replace prior aggregates for the platforms we just recomputed.
  const platforms = [...new Set(rows.map((r) => r.platform))];
  for (const platform of platforms) {
    await supabase.from("platform_performance").delete().eq("platform", platform);
  }
  if (rows.length) {
    const { error: insErr } = await supabase.from("platform_performance").insert(rows);
    if (insErr) console.warn(`[Analytics:Learn] insert failed: ${insErr.message}`);
  }

  console.log(`[Analytics:Learn] Recomputed ${rows.length} aggregates across ${platforms.length} platform(s)`);
  return rows;
}

// Reader used by the generators to bias content toward what actually works.
// Returns the best-scoring value for a (platform, dimension) once it clears the
// sample-size floor, otherwise null so callers fall back to default behavior.
export async function getBestFor(platform, dimension = "format", minSample = MIN_SAMPLE) {
  try {
    const { data, error } = await supabase
      .from("platform_performance")
      .select("value, avg_score, sample_size")
      .eq("platform", platform)
      .eq("dimension", dimension)
      .gte("sample_size", minSample)
      .order("avg_score", { ascending: false })
      .limit(1);

    if (error || !data?.length) return null;
    return data[0].value;
  } catch {
    return null;
  }
}

// CLI: node analytics/learn.js
const isMain = process.argv[1]?.endsWith("learn.js");
if (isMain) {
  learnPerPlatform().then((rows) => {
    for (const r of rows.sort((a, b) => b.avg_score - a.avg_score)) {
      console.log(`  ${r.platform.padEnd(10)} ${r.dimension.padEnd(10)} ${String(r.value).padEnd(16)} avg=${r.avg_score.toFixed(1)} n=${r.sample_size}`);
    }
    process.exit(0);
  }).catch((err) => { console.error(`[Analytics:Learn] Fatal: ${err.message}`); process.exit(1); });
}
