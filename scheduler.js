import cron from "node-cron";
import { runThreads, runLinkedIn, runVideo, runInstagram } from "./index.js";
import { postLinkedInNewsImage, postInstagramNewsImage, postThreadsNewsImage } from "./modules/news-agent.js";
import { checkPerf, processVariationQueue } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";
import { processYouTubeVideo } from "./modules/youtube-cutter.js";
import { analyzeHookPerformance } from "./modules/hook-tester.js";
import { pollThreadsReplies, pollLinkedInComments } from "./modules/comment-reply.js";
import { runAnalyticsCycle } from "./analytics/index.js";
import { processReviewQueue } from "./modules/review-queue.js";
import { mineCompetitors, loadDynamicThemes } from "./modules/competitor-research.js";
import { checkRepeatEngagers } from "./modules/lead-capture.js";
import { runWeeklyBatch, publishNextApproved } from "./modules/wicks-wisdom.js";
import { pollTelegramApprovals } from "./modules/wick-telegram.js";
import { syncWickMetrics } from "./modules/wick-analytics.js";
import { initTokens, refreshTokens, checkAnthropicCredit, checkLinkedInToken, checkTelegram } from "./modules/token-manager.js";
import { isHiggsfieldCliAvailable } from "./agent/generate-higgsfield.js";
import supabase from "./supabase/client.js";

export function startScheduler() {

  const paused = () => process.env.POSTING_PAUSED === "true";

  // Load competitor-derived design themes into the variant pool at startup.
  loadDynamicThemes().catch((err) => console.warn(`[Scheduler] loadDynamicThemes failed: ${err.message}`));

  // Validate + load Meta tokens (Supabase-stored beats env seed). Logs loudly if dead.
  initTokens().catch((err) => console.warn(`[Scheduler] initTokens failed: ${err.message}`));

  // Anthropic key health — a dead/out-of-credits key kills ALL platforms at once.
  checkAnthropicCredit().catch((err) => console.warn(`[Scheduler] Anthropic health check failed: ${err.message}`));
  checkTelegram().catch((err) => console.warn(`[Scheduler] Telegram health check failed: ${err.message}`));

  // LinkedIn token health — expires ~60 days, can't auto-refresh; dead = text-only posts.
  checkLinkedInToken().catch((err) => console.warn(`[Scheduler] LinkedIn health check failed: ${err.message}`));

  // ── TOKEN REFRESH — every 3 days at 3:15am: keep IG/Threads tokens alive ──
  cron.schedule("15 3 */3 * *", async () => {
    try { await refreshTokens(); }
    catch (err) { console.error(`[Scheduler] Token refresh failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── LINKEDIN — 1x/day at the golden hour (engagement-optimized 2026-07-29) ──
  // ONE high-effort conversation-starter post concentrates all engagement + the
  // author's own replies into a single window. Frequent posting fragments reach
  // and LinkedIn suppresses flooders, so 7x/day was working against engagement.
  // News cards moved off LinkedIn (still on IG/Threads).
  cron.schedule("30 9 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 9:30 AM (conversation starter)`);
    try { await runLinkedIn(false); }
    catch (err) { console.error(`[Scheduler] LinkedIn failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── LINKEDIN COMMENT AUTO-REPLY — every 20 min (author replies = #1 signal) ──
  cron.schedule("*/20 * * * *", async () => {
    if (paused()) return;
    try { await pollLinkedInComments(); }
    catch (err) { console.error(`[Scheduler] LinkedIn replies failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── INSTAGRAM — Agent X no longer posts to Instagram (2026-07-30). ────────
  // The account was repurposed to WICK'S WISDOM, a separate faceless brand with
  // its own batch pipeline (modules/wicks-wisdom.js) + human approval gate.
  // Same IG account and token; different content system entirely.

  // ── WICK'S WISDOM — 2 posts/day at 9am and 12pm ET ───────────────────────
  // Each slot publishes the oldest APPROVED post whose format differs from the
  // last one published, so the feed alternates styles instead of running four
  // VERSUS carousels back to back.
  const wickPublish = (label) => async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Wick ${label} skipped`); return; }
    console.log(`[${new Date().toISOString()}] Wick: ${label}`);
    try { await publishNextApproved(); }
    catch (err) { console.error(`[Scheduler] Wick ${label} failed: ${err.message}`); }
  };
  cron.schedule("0 9 * * *",  wickPublish("9:00am"),  { timezone: "America/New_York" });
  cron.schedule("0 12 * * *", wickPublish("12:00pm"), { timezone: "America/New_York" });

  // ── WICK'S WISDOM — build next weekly batch Sunday 6am (QUEUED, never posted) ──
  cron.schedule("0 6 * * 0", async () => {
    if (paused()) return;
    try { await runWeeklyBatch(); }
    catch (err) { console.error(`[Scheduler] Wick batch failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── WICK APPROVALS — poll Telegram for Approve/Reject taps every 2 min ───
  cron.schedule("*/2 * * * *", async () => {
    try { await pollTelegramApprovals(); }
    catch (err) { console.error(`[Scheduler] Wick Telegram poll failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VIDEO — 1x/day at 9pm: one render, fanned out to all platforms (held for review) ──
  cron.schedule("0 21 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — daily video skipped`); return; }
    // Dre rejected the card-style Hyperframes look (2026-07-18). Videos only
    // render via the scene-based paper-cut pipeline, which needs the
    // authenticated higgsfield CLI. Set VIDEO_ALLOW_FALLBACK=true to override.
    if (!isHiggsfieldCliAvailable() && process.env.VIDEO_ALLOW_FALLBACK !== "true") {
      console.log(`[Scheduler] Video skipped — higgsfield CLI not authenticated on this host (paper-cut pipeline required).`);
      return;
    }
    console.log(`[${new Date().toISOString()}] Video: 9:00 PM (all platforms, held for review)`);
    try { await runVideo(); }
    catch (err) { console.error(`[Scheduler] Daily video failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── THREADS — 7x/day: 5 text (casual conversation starters) + 2 news ─────
  const thText = (label) => async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads ${label} skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: ${label} (text)`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads ${label} failed: ${err.message}`); }
  };
  const thNews = (label) => async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads ${label} skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: ${label} (news image)`);
    try { await postThreadsNewsImage(); }
    catch (err) { console.error(`[Scheduler] Threads ${label} failed: ${err.message}`); }
  };
  cron.schedule("30 8 * * *",  thText("8:30am"),   { timezone: "America/New_York" });
  cron.schedule("30 9 * * *",  thNews("9:30am"),   { timezone: "America/New_York" });
  cron.schedule("30 11 * * *", thText("11:30am"),  { timezone: "America/New_York" });
  cron.schedule("30 13 * * *", thText("1:30pm"),   { timezone: "America/New_York" });
  cron.schedule("30 15 * * *", thText("3:30pm"),   { timezone: "America/New_York" });
  cron.schedule("30 17 * * *", thNews("5:30pm"),   { timezone: "America/New_York" });
  cron.schedule("30 20 * * *", thText("8:30pm"),   { timezone: "America/New_York" });

  // ── VARIATION QUEUE — every 30 minutes (crash-safe, survives restarts) ───
  cron.schedule("*/30 * * * *", async () => {
    if (paused()) { return; }
    try { await processVariationQueue(); }
    catch (err) { console.error(`[Scheduler] VariationQueue failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── COMMENT REPLIES — Threads every 15 minutes ────────────────────────────
  cron.schedule("*/15 * * * *", async () => {
    if (paused()) { return; }
    try { await pollThreadsReplies(); }
    catch (err) { console.error(`[Scheduler] ThreadsReplies failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VIDEO REVIEW QUEUE — publish approved videos every 10 minutes ─────────
  cron.schedule("*/10 * * * *", async () => {
    if (paused()) { return; }
    try { await processReviewQueue(); }
    catch (err) { console.error(`[Scheduler] ReviewQueue failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VARIATION ENGINE — every 6 hours ─────────────────────────────────────
  cron.schedule("0 */6 * * *", async () => {
    if (paused()) { return; }
    try { await checkPerf(); }
    catch (err) { console.error(`[Scheduler] VariationEngine failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── FEEDBACK LOOP — every 3 days at midnight ─────────────────────────────
  cron.schedule("0 0 */3 * *", async () => {
    if (paused()) { return; }
    try { await runWeeklyAnalysis(); }
    catch (err) { console.error(`[Scheduler] FeedbackLoop failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── COMPETITOR MINING — every Sunday 1am: analyze rivals, refresh dynamic themes ──
  cron.schedule("0 1 * * 0", async () => {
    if (paused()) { return; }
    try { await mineCompetitors(); }
    catch (err) { console.error(`[Scheduler] CompetitorMining failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── YOUTUBE CUTTER — daily at 11am (offset from LinkedIn 9am + IG 10am) ──
  cron.schedule("0 11 * * *", async () => {
    if (paused()) { return; }
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    if (!channelId) return;

    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const res = await fetch(rssUrl);
      if (!res.ok) throw new Error(`RSS fetch failed (${res.status})`);
      const xml = await res.text();
      const match = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      if (!match) { console.log(`[YouTubeCutter] No video in RSS`); return; }

      const videoId = match[1];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const { data: seen } = await supabase.from("news_seen").select("id").eq("article_url", videoUrl).maybeSingle();
      if (seen) { console.log(`[YouTubeCutter] Already processed: ${videoUrl}`); return; }

      console.log(`[YouTubeCutter] New video: ${videoUrl}`);
      await processYouTubeVideo(videoUrl);
      await supabase.from("news_seen").insert({ article_url: videoUrl, headline: `YouTube: ${videoId}`, posted: true });
    } catch (err) {
      console.error(`[Scheduler] YouTubeCutter failed: ${err.message}`);
    }
  }, { timezone: "America/New_York" });

  // ── LEAD CAPTURE — every hour: detect repeat engagers → Telegram + GHL ──────
  cron.schedule("0 * * * *", async () => {
    if (paused()) { return; }
    try { await checkRepeatEngagers(); }
    catch (err) { console.error(`[Scheduler] LeadCapture failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── ANALYTICS — every 6 hours (offset :45): pull real metrics, learn, decide A/B ──
  cron.schedule("45 */6 * * *", async () => {
    if (paused()) { return; }
    try { await runAnalyticsCycle(); }
    catch (err) { console.error(`[Scheduler] Analytics failed: ${err.message}`); }
    // Wick lives in wick_posts, which runAnalyticsCycle never touches, so its
    // shares/saves would stay at zero. The brand optimises for shares, so this
    // is the one metric that has to be real.
    try { await syncWickMetrics(); }
    catch (err) { console.error(`[Scheduler] Wick metrics sync failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── HOOK TESTER — every 6 hours (offset :30) ─────────────────────────────
  cron.schedule("30 */6 * * *", async () => {
    if (paused()) { return; }
    try {
      const result = await analyzeHookPerformance();
      const count = result.total_analyzed ?? 0;
      const topCount = result.top_hooks?.length ?? 0;
      console.log(`[HookTester] Analyzed ${count} posts — ${topCount} top hooks`);
    } catch (err) {
      console.error(`[Scheduler] HookTester failed: ${err.message}`);
    }
  }, { timezone: "America/New_York" });

  console.log("Scheduler active — all times EST:");
  console.log(`  BRAND_PLATFORMS: ${process.env.BRAND_PLATFORMS ?? "(not set — defaulting to linkedin only)"}`);
  console.log("  LinkedIn  : 1x/day — 9:30am conversation starter + seed comment + 20-min auto-reply");
  console.log("  Instagram : Wick's Wisdom — 9:00am + 12:00pm daily (approved only, styles alternate)");
  console.log("  Threads   : 7x/day — 5 text (casual starters) + 2 news (9:30am, 5:30pm)");
  console.log("  Video     : 9:00pm daily — one render, all platforms, held for review");
  console.log("  Leads     : every hour (repeat engager detection → Telegram + GHL)");
  console.log("  Var queue : every 30 minutes (crash-safe job queue)");
  console.log("  Variation : every 6 hours");
  console.log("  Replies   : every 15 minutes (Threads polling)");
  console.log("  Review    : every 10 minutes (publish approved videos)");
  console.log("  Feedback  : every 3 days at midnight");
  console.log("  Competitor: Sundays 1:00am (IG Business Discovery + Claude vision → dynamic themes)");
  console.log("  YouTube   : 11:00am daily (if YOUTUBE_CHANNEL_ID set)");
  console.log("  HookTester: every 6 hours (:30 offset)");
  console.log("  Analytics : every 6 hours (:45 offset) — metric sync + learn + A/B decide");
}
