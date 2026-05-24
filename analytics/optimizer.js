import "dotenv/config";
import supabase from "../supabase/client.js";
import { scorePost } from "./ab-testing.js";
import { variantPool, defaultVariant } from "./design-variants.js";

const BASELINE_WINDOW = 20;     // recent posts used to compute the rolling baseline
const UNDERPERFORM_STREAK = 5;  // consecutive posts below baseline before we adapt
const MIN_VARIANT_SAMPLE = 3;   // posts needed before trusting a variant's avg score
const EXPLOIT_EXPLORE_RATE = 0.15; // chance of trying a challenger while exploiting

// The (platform, post_type) combos the optimizer manages.
const MANAGED = [
  { platform: "linkedin", postType: "image" },
  { platform: "linkedin", postType: "text" },
];

// ─── PURE HELPERS (unit-tested) ──────────────────────────────────────────────

export function median(nums) {
  const arr = [...nums].filter((n) => typeof n === "number").sort((a, b) => a - b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

// scoresNewestFirst: post scores ordered newest → oldest.
// Returns true only when the most recent `streak` posts are ALL below baseline,
// so one slow day can't trip it.
export function isUnderperformingStreak(scoresNewestFirst, baseline, streak = UNDERPERFORM_STREAK) {
  if (scoresNewestFirst.length < streak) return false;
  return scoresNewestFirst.slice(0, streak).every((s) => s < baseline);
}

// Best variant by average score, requiring a minimum sample size.
// rows: [{ design_variant, score }]
export function bestVariant(rows, minSample = MIN_VARIANT_SAMPLE) {
  const agg = {};
  for (const r of rows) {
    if (!r.design_variant) continue;
    agg[r.design_variant] ??= { total: 0, count: 0 };
    agg[r.design_variant].total += r.score;
    agg[r.design_variant].count += 1;
  }
  let best = null;
  for (const [variant, { total, count }] of Object.entries(agg)) {
    if (count < minSample) continue;
    const avg = total / count;
    if (!best || avg > best.avg) best = { variant, avg, count };
  }
  return best;
}

// ─── STATE I/O ───────────────────────────────────────────────────────────────

async function getState(platform, postType) {
  const { data } = await supabase
    .from("optimization_state")
    .select("*")
    .eq("platform", platform)
    .eq("post_type", postType)
    .maybeSingle();
  return data ?? null;
}

async function upsertState(row) {
  const { error } = await supabase
    .from("optimization_state")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "platform,post_type" });
  if (error) console.warn(`[Analytics:Optimizer] state upsert failed: ${error.message}`);
}

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── PICK: which variant should the next post use? ───────────────────────────
// exploit mode → champion, with an occasional challenger to keep gathering data.
// explore mode → actively rotate challengers (excluding the champion).
// Falls back to the brand default when there's no state yet (cold start), so
// behavior is unchanged until real data exists.
export async function pickVariant(platform, postType) {
  const pool = variantPool(postType);
  let state;
  try {
    state = await getState(platform, postType);
  } catch {
    return defaultVariant(postType);
  }

  if (!state || !state.champion_variant) return defaultVariant(postType);
  const champion = state.champion_variant;

  if (state.mode === "explore") {
    const challengers = pool.filter((id) => id !== champion);
    return challengers.length ? randomFrom(challengers) : champion;
  }

  // exploit
  if (Math.random() < EXPLOIT_EXPLORE_RATE) {
    const challengers = pool.filter((id) => id !== champion);
    if (challengers.length) return randomFrom(challengers);
  }
  return champion;
}

// ─── ADAPT: recompute baseline, detect decline, promote winners ──────────────
async function adaptOne(platform, postType) {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("design_variant, likes, comments, shares, views, created_at")
    .eq("platform", platform)
    .eq("post_type", postType)
    .order("created_at", { ascending: false })
    .limit(BASELINE_WINDOW);

  if (error || !posts?.length) return;

  const scored = posts.map((p) => ({ design_variant: p.design_variant, score: scorePost(p) }));
  const baseline = median(scored.map((s) => s.score));
  const declining = isUnderperformingStreak(scored.map((s) => s.score), baseline);
  const winner = bestVariant(scored);

  const prev = await getState(platform, postType);
  const champion = prev?.champion_variant ?? defaultVariant(postType);

  let mode = prev?.mode ?? "exploit";
  let newChampion = champion;
  let streak = declining ? (prev?.underperform_streak ?? 0) + 1 : 0;

  // Promote a challenger that clearly beats the current champion.
  if (winner && winner.variant !== champion) {
    const champRows = scored.filter((s) => s.design_variant === champion);
    const champAvg = champRows.length ? champRows.reduce((a, s) => a + s.score, 0) / champRows.length : 0;
    if (winner.avg > champAvg) {
      newChampion = winner.variant;
      mode = "exploit";
      streak = 0;
      console.log(`[Analytics:Optimizer] ${platform}/${postType}: promoted ${winner.variant} (avg ${winner.avg.toFixed(1)} > champ ${champAvg.toFixed(1)})`);
    }
  }

  // Genuine decline (5 in a row below baseline) → go explore challengers.
  if (declining && mode !== "explore") {
    mode = "explore";
    console.log(`[Analytics:Optimizer] ${platform}/${postType}: ${UNDERPERFORM_STREAK} below baseline — entering EXPLORE`);
  }

  await upsertState({
    platform,
    post_type: postType,
    champion_variant: newChampion,
    mode,
    underperform_streak: streak,
    baseline_score: baseline,
  });
}

export async function adaptAll() {
  for (const { platform, postType } of MANAGED) {
    try { await adaptOne(platform, postType); }
    catch (err) { console.warn(`[Analytics:Optimizer] adapt ${platform}/${postType} failed: ${err.message}`); }
  }
}

// CLI: node analytics/optimizer.js
const isMain = process.argv[1]?.endsWith("optimizer.js");
if (isMain) {
  adaptAll().then(() => process.exit(0)).catch((err) => {
    console.error(`[Analytics:Optimizer] Fatal: ${err.message}`);
    process.exit(1);
  });
}
