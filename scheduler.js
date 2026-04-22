import cron from "node-cron";
import { runAgent } from "./index.js";
import { checkAndPost } from "./modules/news-agent.js";
import { checkPerf } from "./modules/variation-engine.js";
import { runWeeklyAnalysis } from "./modules/feedback-loop.js";

export function startScheduler() {
  // ── CORE CONTENT POSTS: 3 per 2-hour block, 24/7 (every 40 min) ──────────
  // Slot 1: minute :00 of even hours — post with image
  cron.schedule("0 */2 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: slot 1 of 2hr block (image)`);
    try { await runAgent(true); }
    catch (err) { console.error(`[Scheduler] slot 1 run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // Slot 2: minute :40 of even hours — text only
  cron.schedule("40 */2 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: slot 2 of 2hr block (text)`);
    try { await runAgent(false); }
    catch (err) { console.error(`[Scheduler] slot 2 run failed: ${err.message}`); }
  }, { timezone: "America/New_York" });

  // Slot 3: minute :20 of odd hours — text only
  cron.schedule("20 1-23/2 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Scheduled run: slot 3 of 2hr block (text)`);
    try { await runAgent(false); }
    catch (err) { console.error(`[Scheduler] slot 3 run failed: ${err.message}`); }
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
  console.log("  Content posts : 3 per 2-hour block (:00 + :40 even hours, :20 odd hours), 24/7 EST");
  console.log("  News agent    : every 30 minutes (posts when news drops)");
  console.log("  Variation eng : every 6 hours");
  console.log("  Feedback loop : Sundays at midnight");
}
