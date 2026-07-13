import cron from "node-cron";
import { runThreads, runLinkedIn, runVideo, runInstagram } from "./index.js";
import { postLinkedInNewsImage, postInstagramNewsImage, postThreadsNewsImage } from "./modules/news-agent.js";
import { checkPerf, processVariationQueue } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";
import { processYouTubeVideo } from "./modules/youtube-cutter.js";
import { analyzeHookPerformance } from "./modules/hook-tester.js";
import { pollThreadsReplies } from "./modules/comment-reply.js";
import { runAnalyticsCycle } from "./analytics/index.js";
import { processReviewQueue } from "./modules/review-queue.js";
import { mineCompetitors, loadDynamicThemes } from "./modules/competitor-research.js";
import { checkRepeatEngagers } from "./modules/lead-capture.js";
import { initTokens, refreshTokens, checkAnthropicCredit } from "./modules/token-manager.js";
import supabase from "./supabase/client.js";

export function startScheduler() {

  const paused = () => process.env.POSTING_PAUSED === "true";

  // Load competitor-derived design themes into the variant pool at startup.
  loadDynamicThemes().catch((err) => console.warn(`[Scheduler] loadDynamicThemes failed: ${err.message}`));

  // Validate + load Meta tokens (Supabase-stored beats env seed). Logs loudly if dead.
  initTokens().catch((err) => console.warn(`[Scheduler] initTokens failed: ${err.message}`));

  // Anthropic key health — a dead/out-of-credits key kills ALL platforms at once.
  checkAnthropicCredit().catch((err) => console.warn(`[Scheduler] Anthropic health check failed: ${err.message}`));

  // ── TOKEN REFRESH — every 3 days at 3:15am: keep IG/Threads tokens alive ──
  cron.schedule("15 3 */3 * *", async () => {
    try { await refreshTokens(); }
    catch (err) { console.error(`[Scheduler] Token refresh failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── LINKEDIN — 5x/day: 2 news, 2 cheatsheet, 1 text ────────────────────
  cron.schedule("0 8 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn 8am skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 8:00 AM (news image)`);
    try { await postLinkedInNewsImage(); }
    catch (err) { console.error(`[Scheduler] LinkedIn 8am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 11 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn 11am skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 11:00 AM (cheatsheet post)`);
    try { await runLinkedIn(true); }
    catch (err) { console.error(`[Scheduler] LinkedIn 11am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 14 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn 2pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 2:00 PM (text post)`);
    try { await runLinkedIn(false); }
    catch (err) { console.error(`[Scheduler] LinkedIn 2pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 17 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn 5pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 5:00 PM (news image)`);
    try { await postLinkedInNewsImage(); }
    catch (err) { console.error(`[Scheduler] LinkedIn 5pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 20 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — LinkedIn 8pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] LinkedIn: 8:00 PM (cheatsheet post)`);
    try { await runLinkedIn(true); }
    catch (err) { console.error(`[Scheduler] LinkedIn 8pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── INSTAGRAM — 3x/day: 10am news, 2pm carousel, 7pm carousel ───────────
  cron.schedule("0 10 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Instagram 10am skipped`); return; }
    console.log(`[${new Date().toISOString()}] Instagram: 10:00 AM (news image)`);
    try { await postInstagramNewsImage(); }
    catch (err) { console.error(`[Scheduler] Instagram 10am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── THREADS NEWS IMAGE — 10:30am (paired offset from Instagram 10am) ─────
  cron.schedule("30 10 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads 10:30am news skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: 10:30 AM (news image)`);
    try { await postThreadsNewsImage(); }
    catch (err) { console.error(`[Scheduler] Threads 10:30am news failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 14 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Instagram 2pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] Instagram: 2:00 PM (carousel)`);
    try { await runInstagram(); }
    catch (err) { console.error(`[Scheduler] Instagram 2pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 18 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Instagram 6pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] Instagram: 6:00 PM (carousel)`);
    try { await runInstagram(); }
    catch (err) { console.error(`[Scheduler] Instagram 6pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VIDEO — 1x/day at 9pm: one render, fanned out to all platforms (held for review) ──
  cron.schedule("0 21 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — daily video skipped`); return; }
    console.log(`[${new Date().toISOString()}] Video: 9:00 PM (all platforms, held for review)`);
    try { await runVideo(); }
    catch (err) { console.error(`[Scheduler] Daily video failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── THREADS — 4x/day: matches LinkedIn frequency (30min offset) ──────────
  cron.schedule("30 8 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads 8:30am skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: 8:30 AM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 8:30am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("30 12 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads 12:30pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: 12:30 PM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 12:30pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("30 16 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads 4:30pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: 4:30 PM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 4:30pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("30 20 * * *", async () => {
    if (paused()) { console.log(`[Scheduler] PAUSED — Threads 8:30pm skipped`); return; }
    console.log(`[${new Date().toISOString()}] Threads: 8:30 PM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 8:30pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

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
  console.log("  LinkedIn  : 8:00am (news), 11:00am (cheatsheet), 2:00pm (text), 5:00pm (news), 8:00pm (cheatsheet)");
  console.log("  Instagram : 10:00am (news), 2:00pm (carousel), 6:00pm (carousel)");
  console.log("  Threads   : 8:30am, 10:30am (news image), 12:30pm, 4:30pm, 8:30pm (text | carousel every 3rd)");
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
