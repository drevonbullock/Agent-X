import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { postToLinkedIn } from "../agent/post-to-linkedin.js";

const client = new Anthropic();

const WIN_THRESHOLD_LIKES = 15;
const WIN_THRESHOLD_VIEWS = 500;

const VARIATION_SYSTEM = `You are a viral content optimizer writing as Dre'von Bullock — AI automation builder, NYC.
Given a high-performing LinkedIn post, generate 5 variations.
Each must have a different hook style, angle, or emotional trigger — same core idea, new entry point.

Voice rules:
- Same as original: direct, confident, non-corporate
- No filler phrases, no hype openers
- Max 2 hashtags per variation
- 150-400 words per variation

Return a JSON array of exactly 5 objects with:
  hook (string — first sentence only),
  body (string — rest of the post),
  variation_type (string — "curiosity" | "contrarian" | "emotional" | "stat_led" | "story")

Return ONLY valid JSON. No markdown fences.`;

// ─── FETCH WINNERS ────────────────────────────────────────────────────────────

async function fetchWinners() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .or(`likes.gte.${WIN_THRESHOLD_LIKES},views.gte.${WIN_THRESHOLD_VIEWS}`)
    .eq("is_winner", false)
    .order("likes", { ascending: false })
    .limit(3);

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data ?? [];
}

// ─── GENERATE + QUEUE VARIATIONS ─────────────────────────────────────────────
// Writes all 5 variations to variations_queue with scheduled_for timestamps.
// No setTimeout — crash-safe across Railway restarts.

async function queueVariations(post) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3072,
    system: VARIATION_SYSTEM,
    messages: [{
      role: "user",
      content: `Original post (${post.likes} likes, ${post.views} views):\n\n"${post.content}"`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const variations = JSON.parse(raw);

  const now = Date.now();
  const rows = variations.map((v, i) => ({
    parent_post_id: post.id,
    variation_number: i + 1,
    content: `${v.hook}\n\n${v.body}`.trim(),
    platform: "linkedin",
    hook: v.hook.slice(0, 200),
    format: v.variation_type,
    scheduled_for: new Date(now + i * 6 * 60 * 60 * 1000).toISOString(),
  }));

  const { error } = await supabase.from("variations_queue").insert(rows);
  if (error) throw new Error(`Queue insert failed: ${error.message}`);

  console.log(`[VariationEngine] Queued ${rows.length} variations for post ${post.id}`);
}

// ─── PROCESS QUEUE ────────────────────────────────────────────────────────────
// Exported so scheduler can run it every 30 min independently of checkPerf.
// Posts any queued variations whose scheduled_for has passed.

async function fetchWithRetry(fn, label, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries - 1 && err.message?.includes("fetch failed")) {
        console.warn(`[${label}] Network error, retrying in ${delayMs / 1000}s... (${i + 1}/${retries - 1})`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

export async function processVariationQueue() {
  let pending, error;
  try {
    ({ data: pending, error } = await fetchWithRetry(
      () => supabase.from("variations_queue").select("*").eq("sent", false).lte("scheduled_for", new Date().toISOString()).order("scheduled_for", { ascending: true }).limit(5),
      "VariationEngine"
    ));
  } catch (err) {
    console.error(`[VariationEngine] Queue fetch failed: ${err.message}`);
    return;
  }

  if (error) {
    console.error(`[VariationEngine] Queue fetch failed: ${error.message}`);
    return;
  }

  if (!pending?.length) return;
  console.log(`[VariationEngine] Processing ${pending.length} queued variation(s)...`);

  for (const item of pending) {
    try {
      const { postId, postUrl } = await postToLinkedIn(item.content, null, null);

      await supabase
        .from("variations_queue")
        .update({ sent: true, post_id: postId, post_url: postUrl })
        .eq("id", item.id);

      // Mirror to variations table for hook-tester + feedback-loop
      await supabase.from("variations").insert({
        parent_post_id: item.parent_post_id,
        variation_number: item.variation_number,
        content: item.content,
        platform: item.platform,
        hook: item.hook,
        format: item.format,
        post_id: postId,
        post_url: postUrl,
      });

      console.log(`[VariationEngine] Posted variation ${item.variation_number}: ${postId}`);
    } catch (err) {
      console.error(`[VariationEngine] Variation ${item.variation_number} (${item.id}) failed: ${err.message}`);
    }
  }
}

// ─── MAIN: CHECK AND GENERATE ─────────────────────────────────────────────────

export async function checkPerf() {
  // Process any due queue items first
  await processVariationQueue();

  console.log(`[VariationEngine] Checking for high-performing posts...`);

  let winners;
  try {
    winners = await fetchWinners();
  } catch (err) {
    console.error(`[VariationEngine] Fetch failed: ${err.message}`);
    return;
  }

  if (!winners.length) {
    console.log(`[VariationEngine] No posts above threshold — skipping`);
    return;
  }

  for (const post of winners) {
    console.log(`[VariationEngine] New winner: ${post.id} (${post.likes} likes)`);

    try {
      await queueVariations(post);
    } catch (err) {
      console.error(`[VariationEngine] Queue generation failed: ${err.message}`);
      continue;
    }

    await supabase.from("posts").update({ is_winner: true }).eq("id", post.id);
  }
}
