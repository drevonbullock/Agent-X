import "dotenv/config";
import supabase from "../supabase/client.js";

// How long an experiment runs before a winner is declared.
const DEFAULT_WINDOW_HOURS = 24;

// Unified engagement score. Interactions are weighted (a comment is worth more
// than a like); views act as a small tiebreaker so it still works on platforms
// that expose impressions. Both variants in an experiment share a platform, so
// the comparison is always apples-to-apples.
export function scorePost(p) {
  const likes = p.likes ?? 0;
  const comments = p.comments ?? 0;
  const shares = p.shares ?? 0;
  const views = p.views ?? 0;
  return likes + shares * 2 + comments * 3 + views * 0.01;
}

// Link two already-posted rows as an A/B pair.
// variantA / variantB: { postRowId (posts.id), label (e.g. format name) }
export async function createExperiment({ platform, slot = null, hypothesis = null, variantA, variantB }) {
  const { data, error } = await supabase
    .from("experiments")
    .insert({
      platform,
      slot,
      hypothesis,
      variant_a_post_id: variantA.postRowId,
      variant_b_post_id: variantB.postRowId,
      variant_a_label: variantA.label,
      variant_b_label: variantB.label,
      status: "running",
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`[Analytics:AB] createExperiment failed: ${error.message}`);
    return null;
  }

  // Tag the posts so learning can see they belong to an experiment.
  await supabase.from("posts").update({ experiment_id: data.id, variant: "a" }).eq("id", variantA.postRowId);
  await supabase.from("posts").update({ experiment_id: data.id, variant: "b" }).eq("id", variantB.postRowId);

  console.log(`[Analytics:AB] Experiment ${data.id} created: ${variantA.label} vs ${variantB.label} on ${platform}`);
  return data.id;
}

// Decide any running experiment whose window has elapsed.
// Assumes metrics have already been synced into the posts rows.
export async function evaluateExperiments(windowHours = DEFAULT_WINDOW_HOURS) {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data: experiments, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("status", "running")
    .lte("created_at", cutoff);

  if (error) {
    console.warn(`[Analytics:AB] fetch experiments failed: ${error.message}`);
    return;
  }
  if (!experiments?.length) return;

  for (const exp of experiments) {
    const { data: rows } = await supabase
      .from("posts")
      .select("id, likes, comments, shares, views, format")
      .in("id", [exp.variant_a_post_id, exp.variant_b_post_id]);

    const a = rows?.find((r) => r.id === exp.variant_a_post_id);
    const b = rows?.find((r) => r.id === exp.variant_b_post_id);
    if (!a || !b) {
      console.warn(`[Analytics:AB] Experiment ${exp.id} missing a post row — skipping`);
      continue;
    }

    const scoreA = scorePost(a);
    const scoreB = scorePost(b);
    let winner = "tie";
    if (scoreA > scoreB) winner = "a";
    else if (scoreB > scoreA) winner = "b";

    await supabase
      .from("experiments")
      .update({
        status: "decided",
        winner,
        winning_score: Math.max(scoreA, scoreB),
        decided_at: new Date().toISOString(),
      })
      .eq("id", exp.id);

    const winLabel = winner === "a" ? exp.variant_a_label : winner === "b" ? exp.variant_b_label : "tie";
    console.log(`[Analytics:AB] Experiment ${exp.id} decided: ${winLabel} (A=${scoreA.toFixed(1)} vs B=${scoreB.toFixed(1)})`);
  }
}

// CLI: node analytics/ab-testing.js
const isMain = process.argv[1]?.endsWith("ab-testing.js");
if (isMain) {
  evaluateExperiments().then(() => process.exit(0)).catch((err) => {
    console.error(`[Analytics:AB] Fatal: ${err.message}`);
    process.exit(1);
  });
}
