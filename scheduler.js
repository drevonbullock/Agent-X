import cron from "node-cron";
import { runAgent } from "./index.js";
import { checkAndPost } from "./modules/news-agent.js";
import { checkPerf } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";

export function startScheduler() {
  // ── CORE CONTENT POSTS: twice per hour, 24/7 ─────────────────────────────
  // :00 of every hour — post with image (image skipped automatically for short posts)
  cron.schedule("0 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: top of hour (image)`);
    try { await runAgent(true); }
    catch (err) { console.error(`[Scheduler] :00 run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // :30 of every hour — text only
  cron.schedule("30 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: half hour (text only)`);
    try { await runAgent(false); }
    catch (err) { console.error(`[Scheduler] :30 run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── NEWS AGENT — every 30 minutes (v2) ──────────────────────────────────
  cron.schedule("*/30 * * * *", async () => {
    try { await checkAndPost(); }
    catch (err) { console.error(`[Scheduler] NewsAgent failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── VARIATION ENGINE — every 6 hours (v2) ───────────────────────────────
  cron.schedule("0 */6 * * *", async () => {
    try { await checkPerf(); }
    catch (err) { console.error(`[Scheduler] VariationEngine failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // ── FEEDBACK LOOP — every Sunday at midnight (v2) ───────────────────────
  cron.schedule("0 0 * * 0", async () => {
    try { await runWeeklyAnalysis(); }
    catch (err) { console.error(`[Scheduler] FeedbackLoop failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  console.log("Scheduler active:");
  console.log("  Content posts : :00 and :30 every hour, 24/7 (EST)");
  console.log("  News agent    : every 30 minutes");
  console.log("  Variation eng : every 6 hours");
  console.log("  Feedback loop : Sundays at midnight");
}
