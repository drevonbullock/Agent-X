import "dotenv/config";
import supabase from "../supabase/client.js";
import { fetchInstagramMetrics } from "../analytics/fetch-instagram.js";

// ─── WICK'S WISDOM — METRICS + FORMAT SCOREBOARD ─────────────────────────────
// The brand's whole thesis is "optimise shares, not followers": a forwarded post
// is distribution, a liked post is a nice feeling. But wick_posts.shares had no
// writer. Wick never calls logPost(), so its posts never reach the `posts` table
// that analytics/ syncs, and the shares/saves columns sat at zero forever.
//
// Without this the strategy is unmeasurable: there is no way to learn which of
// the four formats actually earns a forward.

const SAVES_METRIC = "saved";

// Instagram exposes `saved` separately and only for some media types, so it is
// fetched here rather than bolted onto the shared fetcher.
async function fetchSaves(mediaId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return 0;
  try {
    const res = await fetch(
      `https://graph.instagram.com/v22.0/${mediaId}/insights?metric=${SAVES_METRIC}&access_token=${token}`
    );
    if (!res.ok) return 0;
    const { data } = await res.json();
    const e = (data ?? [])[0];
    return e?.total_value?.value ?? e?.values?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

// Pull live metrics for every published Wick post and write them back.
export async function syncWickMetrics({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data: posts, error } = await supabase.from("wick_posts")
    .select("id,format,topic_id,ig_media_id,published_at")
    .eq("status", "posted")
    .not("ig_media_id", "is", null)
    .gte("published_at", since);

  if (error) { console.warn(`[WickAnalytics] query failed: ${error.message}`); return; }
  if (!posts?.length) { console.log("[WickAnalytics] No published posts to sync."); return; }

  let synced = 0;
  for (const p of posts) {
    const m = await fetchInstagramMetrics(p.ig_media_id);
    if (!m) continue;
    const saves = await fetchSaves(p.ig_media_id);
    const { error: e } = await supabase.from("wick_posts").update({
      likes: m.likes, comments: m.comments, shares: m.shares, saves,
    }).eq("id", p.id);
    if (e) console.warn(`[WickAnalytics] update failed for ${p.id}: ${e.message}`);
    else synced++;
  }
  console.log(`[WickAnalytics] Synced ${synced}/${posts.length} post(s).`);
  return synced;
}

// The scoreboard the brand actually cares about: shares per like, by format.
// A format with fewer likes but a higher forward rate is the better format, and
// that is invisible on a raw like count.
export async function wickFormatReport() {
  const { data } = await supabase.from("wick_posts")
    .select("format,topic_id,likes,comments,shares,saves,post_url,published_at")
    .eq("status", "posted")
    .order("published_at", { ascending: false });

  if (!data?.length) { console.log("[WickAnalytics] Nothing published yet."); return []; }

  const byFormat = new Map();
  for (const p of data) {
    const f = byFormat.get(p.format) ?? { format: p.format, n: 0, likes: 0, shares: 0, saves: 0, comments: 0 };
    f.n++; f.likes += p.likes ?? 0; f.shares += p.shares ?? 0;
    f.saves += p.saves ?? 0; f.comments += p.comments ?? 0;
    byFormat.set(p.format, f);
  }

  const rows = [...byFormat.values()].map((f) => ({
    ...f,
    // The headline number. Guard the divide so a zero-like format still ranks.
    sharesPerLike: f.likes > 0 ? +(f.shares / f.likes).toFixed(3) : (f.shares > 0 ? Infinity : 0),
    avgShares: +(f.shares / f.n).toFixed(1),
  })).sort((a, b) => b.sharesPerLike - a.sharesPerLike);

  console.log("\nFORMAT SCOREBOARD (ranked by shares per like)\n");
  console.log("format    n   likes  shares  saves  shares/like  avg shares");
  for (const r of rows) {
    console.log(
      `${r.format.padEnd(9)} ${String(r.n).padEnd(3)} ${String(r.likes).padEnd(6)} ` +
      `${String(r.shares).padEnd(7)} ${String(r.saves).padEnd(6)} ` +
      `${String(r.sharesPerLike).padEnd(12)} ${r.avgShares}`
    );
  }
  console.log("\nPromote the top format, retire the bottom one once every format has 3+ posts.\n");
  return rows;
}

// CLI: node modules/wick-analytics.js [--report]
if (process.argv[1]?.endsWith("wick-analytics.js")) {
  const run = async () => {
    if (!process.argv.includes("--report")) await syncWickMetrics();
    await wickFormatReport();
  };
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
