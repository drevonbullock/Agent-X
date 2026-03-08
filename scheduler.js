import cron from "node-cron";
import { runAgent } from "./index.js";

const SCHEDULES = [
  { time: "0 9 * * *",  label: "9:00 AM" },
  { time: "0 13 * * *", label: "1:00 PM" },
  { time: "0 18 * * *", label: "6:00 PM" },
];

export function startScheduler() {
  for (const { time, label } of SCHEDULES) {
    cron.schedule(
      time,
      async () => {
        console.log(`[${new Date().toISOString()}] Scheduled run triggered: ${label} EST`);
        try {
          await runAgent();
          console.log(`[${new Date().toISOString()}] Run complete: ${label} EST`);
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Run failed (${label} EST):`, err.message);
        }
      },
      { timezone: "America/New_York" }
    );

    console.log(`Scheduled: ${label} EST`);
  }

  console.log("Scheduler active. Waiting for next run...");
}
