import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { postToLinkedIn } from "../agent/post-to-linkedin.js";

const client = new Anthropic();

// Engagement threshold — a post must exceed this to trigger variations
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

// ─── GENERATE VARIATIONS ─────────────────────────────────────────────────────

async function generateVariations(post) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3072,
    system: VARIATION_SYSTEM,
    messages: [{
      role: "user",
      content: `Original post (${post.likes} likes, ${post.views} views):\n\n"${post.content}"`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── POST VARIATION ───────────────────────────────────────────────────────────

async function postVariation(parentPost, variation, variationNumber) {
  const postText = `${variation.hook}\n\n${variation.body}`.trim();

  const { postId, postUrl } = await postToLinkedIn(postText, null, null);
  const hook = variation.hook.slice(0, 200);

  await supabase.from("variations").insert({
    parent_post_id: parentPost.id,
    variation_number: variationNumber,
    content: postText,
    platform: "linkedin",
    hook,
    format: variation.variation_type,
    post_id: postId,
    post_url: postUrl,
  });

  console.log(`[VariationEngine] Posted variation ${variationNumber}: ${postId}`);
  return postId;
}

// ─── MAIN: CHECK AND GENERATE ─────────────────────────────────────────────────

export async function checkPerf() {
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
    console.log(`[VariationEngine] Processing winner: ${post.id} (${post.likes} likes)`);

    let variations;
    try {
      variations = await generateVariations(post);
    } catch (err) {
      console.error(`[VariationEngine] Variation generation failed: ${err.message}`);
      continue;
    }

    // Mark original as winner
    await supabase.from("posts").update({ is_winner: true }).eq("id", post.id);

    // Post variations with 6-hour stagger — schedule via setTimeout (non-blocking)
    for (let i = 0; i < variations.length; i++) {
      const delayMs = i * 6 * 60 * 60 * 1000; // 6 hours apart
      const variation = variations[i];
      setTimeout(async () => {
        try {
          await postVariation(post, variation, i + 1);
        } catch (err) {
          console.error(`[VariationEngine] Variation ${i + 1} post failed: ${err.message}`);
        }
      }, delayMs);
      console.log(`[VariationEngine] Variation ${i + 1} scheduled in ${i * 6}h`);
    }
  }
}
