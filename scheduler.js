import cron from "node-cron";
import { runLinkedIn, runInstagram, runThreads } from "./index.js";
import { checkAndPost } from "./modules/news-agent.js";
import { checkPerf } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";
import { processYouTubeVideo } from "./modules/youtube-cutter.js";
import { analyzeHookPerformance } from "./modules/hook-tester.js";
import supabase from "./supabase/client.js";

export function startScheduler() {

  // ── LINKEDIN — 9am (image), 1pm (text), 6pm (text) ───────────────────────
  cron.schedule("0 9 * * *", async () => {
    console.log(`[${new Date().toISOString()}] LinkedIn: 9:00 AM`);
    try { await runLinkedIn(true); }
    catch (err) { console.error(`[Scheduler] LinkedIn 9am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 13 * * *", async () => {
    console.log(`[${new Date().toISOString()}] LinkedIn: 1:00 PM`);
    try { await runLinkedIn(false); }
    catch (err) { console.error(`[Scheduler] LinkedIn 1pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 18 * * *", async () => {
    console.log(`[${new Date().toISOString()}] LinkedIn: 6:00 PM`);
    try { await runLinkedIn(false); }
    catch (err) { console.error(`[Scheduler] LinkedIn 6pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── INSTAGRAM — 10am, 3pm, 8pm (carousels only) ──────────────────────────
  cron.schedule("0 10 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Instagram: 10:00 AM`);
    try { await runInstagram(); }
    catch (err) { console.error(`[Scheduler] Instagram 10am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 15 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Instagram: 3:00 PM`);
    try { await runInstagram(); }
    catch (err) { console.error(`[Scheduler] Instagram 3pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 20 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Instagram: 8:00 PM`);
    try { await runInstagram(); }
    catch (err) { console.error(`[Scheduler] Instagram 8pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── THREADS — 8:30am, 12:30pm, 5:30pm (text or carousel every 3rd) ───────
  cron.schedule("30 8 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Threads: 8:30 AM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 8:30am failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("30 12 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Threads: 12:30 PM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 12:30pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("30 17 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Threads: 5:30 PM`);
    try { await runThreads(); }
    catch (err) { console.error(`[Scheduler] Threads 5:30pm failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── NEWS AGENT — every 30 minutes ────────────────────────────────────────
  cron.schedule("*/30 * * * *", async () => {
    try { await checkAndPost(); }
    catch (err) { console.error(`[Scheduler] NewsAgent failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VARIATION ENGINE — every 6 hours ─────────────────────────────────────
  cron.schedule("0 */6 * * *", async () => {
    try { await checkPerf(); }
    catch (err) { console.error(`[Scheduler] VariationEngine failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── FEEDBACK LOOP — every Sunday at midnight ──────────────────────────────
  cron.schedule("0 0 * * 0", async () => {
    try { await runWeeklyAnalysis(); }
    catch (err) { console.error(`[Scheduler] FeedbackLoop failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── YOUTUBE CUTTER — daily at 11am (offset from LinkedIn 9am + IG 10am) ──
  cron.schedule("0 11 * * *", async () => {
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

  // ── HOOK TESTER — every 6 hours (offset :30) ─────────────────────────────
  cron.schedule("30 */6 * * *", async () => {
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
  console.log("  LinkedIn  : 9:00am (image), 1:00pm (text), 6:00pm (text)");
  console.log("  Instagram : 10:00am, 3:00pm, 8:00pm (carousels only)");
  console.log("  Threads   : 8:30am, 12:30pm, 5:30pm (text | carousel every 3rd)");
  console.log("  News agent: every 30 minutes");
  console.log("  Variation : every 6 hours");
  console.log("  Feedback  : Sundays midnight");
  console.log("  YouTube   : 11:00am daily (if YOUTUBE_CHANNEL_ID set)");
  console.log("  HookTester: every 6 hours (:30 offset)");
}
