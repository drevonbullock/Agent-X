import cron from "node-cron";
import { runAgent } from "./index.js";
import { checkAndPost } from "./modules/news-agent.js";
import { checkPerf } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";

export function startScheduler() {
  // ── CORE CONTENT POSTS (v1 — unchanged) ─────────────────────────────────
  cron.schedule("0 9 * * *",  async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: 9:00 AM EST`);
    try { await runAgent(true); }
    catch (err) { console.error(`[Scheduler] 9am run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 13 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: 1:00 PM EST`);
    try { await runAgent(false); }
    catch (err) { console.error(`[Scheduler] 1pm run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  cron.schedule("0 18 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: 6:00 PM EST`);
    try { await runAgent(false); }
    catch (err) { console.error(`[Scheduler] 6pm run failed: ${err.message}`); }
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
  console.log("  Content posts : 9am, 1pm, 6pm EST (daily)");
  console.log("  News agent    : every 30 minutes");
  console.log("  Variation eng : every 6 hours");
  console.log("  Feedback loop : Sundays at midnight");
}
