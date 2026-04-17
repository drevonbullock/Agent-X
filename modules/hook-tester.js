import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";

const client = new Anthropic();

const HOOK_GEN_SYSTEM = `You are a hook writer for Dre'von Bullock — AI automation builder, NYC.
Given a topic or existing post, write 5 hook variations to A/B test.
Each uses a different psychological trigger.

Techniques (use each once):
- curiosity_gap: Creates a knowledge gap the reader must close
- stat_led: Opens with a specific number or surprising statistic
- contrarian: Challenges a widely-held belief directly
- identity: Speaks directly to who the reader is ("If you run a service business...")
- consequence: Opens with what's at stake if they don't act

Rules:
- Max 15 words per hook
- No filler openers
- Each must be able to stand alone as a scroll-stopping first line

Return a JSON array of 5 objects:
  hook (string), technique (string), psychological_trigger (string — one sentence)

Return ONLY valid JSON. No markdown fences.`;

// ─── GENERATE HOOKS ───────────────────────────────────────────────────────────

export async function generateHookVariations(topic) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: HOOK_GEN_SYSTEM,
    messages: [{ role: "user", content: `Topic: "${topic}"` }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── ANALYZE HOOK PERFORMANCE ────────────────────────────────────────────────
// Reads Supabase posts from the last 30 days and scores hooks by engagement.

export async function analyzeHookPerformance() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("hook, likes, views, engagement_rate")
    .gte("created_at", thirtyDaysAgo)
    .not("hook", "is", null)
    .order("likes", { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!posts?.length) return { top_hooks: [], patterns: [] };

  // Score each hook: weighted combination of likes + views + engagement_rate
  const scored = posts.map((p) => ({
    hook: p.hook,
    score: (p.likes ?? 0) * 3 + (p.views ?? 0) * 0.01 + (p.engagement_rate ?? 0) * 100,
  })).sort((a, b) => b.score - a.score);

  // Identify opening word patterns from top 10 hooks
  const topHooks = scored.slice(0, 10).map((s) => s.hook);
  const openingWords = topHooks.map((h) => h.split(" ")[0].toLowerCase());
  const patternCounts = openingWords.reduce((acc, w) => {
    acc[w] = (acc[w] ?? 0) + 1;
    return acc;
  }, {});
  const patterns = Object.entries(patternCounts)
    .filter(([, c]) => c > 1)
    .sort(([, a], [, b]) => b - a)
    .map(([word, count]) => ({ word, count }));

  return { top_hooks: topHooks, patterns, total_analyzed: posts.length };
}

// CLI: node modules/hook-tester.js "Your topic here"
const isMain = process.argv[1]?.endsWith("hook-tester.js");
if (isMain) {
  const topic = process.argv[2];
  if (!topic) { console.error('Usage: node modules/hook-tester.js "topic"'); process.exit(1); }

  generateHookVariations(topic)
    .then((hooks) => {
      console.log("\n[HookTester] Generated hook variations:\n");
      hooks.forEach((h, i) => {
        console.log(`${i + 1}. [${h.technique}] ${h.hook}`);
        console.log(`   Why: ${h.psychological_trigger}\n`);
      });
    })
    .catch((err) => { console.error(`[HookTester] Fatal: ${err.message}`); process.exit(1); });
}
