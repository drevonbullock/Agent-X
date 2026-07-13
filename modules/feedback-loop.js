import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import supabase from "../supabase/client.js";

const client = new Anthropic();
const BRIEF_PATH = "data/performance-brief.json";

const ANALYSIS_SYSTEM = `You are a content performance analyst.
Analyze this week's LinkedIn post data and extract actionable patterns.

Return a JSON object with exactly these keys:
  top_hooks (string[] — the 5 best-performing hooks verbatim),
  top_formats (string[] — format names that outperformed, e.g. "contrarian", "one_liner"),
  top_topics (string[] — specific topic angles that got the most engagement),
  avoid_patterns (string[] — patterns that consistently underperformed),
  best_posting_times (string[] — e.g. ["9am", "6pm"]),
  platform_winners (object — { linkedin: string, tiktok: string } — what content style wins per platform),
  weekly_insight (string — one key takeaway from this week in plain English)

Return ONLY valid JSON. No markdown fences.`;

// ─── FETCH WEEKLY DATA ────────────────────────────────────────────────────────

async function fetchWeeklyData() {
  const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .gte("created_at", sevenDaysAgo)
    .order("likes", { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return posts ?? [];
}

// ─── ANALYZE ─────────────────────────────────────────────────────────────────

async function analyzeData(posts) {
  if (!posts.length) {
    console.log("[FeedbackLoop] No posts this week — skipping analysis");
    return null;
  }

  const summary = posts.map((p) => ({
    hook: p.hook,
    format: p.format,
    platform: p.platform,
    likes: p.likes,
    views: p.views,
    engagement_rate: p.engagement_rate,
    created_at: p.created_at,
  }));

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM,
    messages: [{
      role: "user",
      content: `Weekly post data (${posts.length} posts):\n${JSON.stringify(summary, null, 2)}`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── UPDATE BRIEF ─────────────────────────────────────────────────────────────

function updateBrief(analysis) {
  const weekStart = new Date().toISOString().split("T")[0];
  const brief = {
    week: weekStart,
    ...analysis,
    updated_at: new Date().toISOString(),
  };

  if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(BRIEF_PATH, JSON.stringify(brief, null, 2));
  console.log(`[FeedbackLoop] Brief updated: ${BRIEF_PATH}`);
  return brief;
}

// ─── STORE IN SUPABASE ────────────────────────────────────────────────────────

async function storeBriefInSupabase(analysis) {
  const weekStart = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("performance_briefs").insert({
    week_start: weekStart,
    top_hooks: analysis.top_hooks ?? [],
    top_formats: analysis.top_formats ?? [],
    top_topics: analysis.top_topics ?? [],
    avoid_patterns: analysis.avoid_patterns ?? [],
  });
  if (error) console.warn(`[FeedbackLoop] Supabase insert failed: ${error.message}`);
}

// ─── READ BRIEF (used by content generation) ──────────────────────────────────

export function readBrief() {
  try {
    return JSON.parse(fs.readFileSync(BRIEF_PATH, "utf8"));
  } catch {
    return null;
  }
}

// ─── MAIN: WEEKLY ANALYSIS ────────────────────────────────────────────────────

export async function runWeeklyAnalysis() {
  console.log(`[FeedbackLoop] Running weekly performance analysis...`);

  let posts;
  try {
    posts = await fetchWeeklyData();
    console.log(`[FeedbackLoop] Fetched ${posts.length} posts from last 7 days`);
  } catch (err) {
    console.error(`[FeedbackLoop] Fetch failed: ${err.message}`);
    return;
  }

  let analysis;
  try {
    analysis = await analyzeData(posts);
  } catch (err) {
    console.error(`[FeedbackLoop] Analysis failed: ${err.message}`);
    return;
  }

  if (!analysis) return;

  const brief = updateBrief(analysis);
  await storeBriefInSupabase(analysis);

  console.log(`[FeedbackLoop] Done.`);
  console.log(`[FeedbackLoop] Top formats: ${analysis.top_formats?.join(", ")}`);
  console.log(`[FeedbackLoop] Top topics: ${analysis.top_topics?.join(", ")}`);
  console.log(`[FeedbackLoop] Avoid: ${analysis.avoid_patterns?.join(", ")}`);
  console.log(`[FeedbackLoop] Insight: ${analysis.weekly_insight}`);

  return brief;
}

// CLI: node modules/feedback-loop.js
const isMain = process.argv[1]?.endsWith("feedback-loop.js");
if (isMain) {
  runWeeklyAnalysis().catch((err) => { console.error(`[FeedbackLoop] Fatal: ${err.message}`); process.exit(1); });
}
