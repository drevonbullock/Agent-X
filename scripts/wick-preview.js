import "dotenv/config";
import supabase from "../supabase/client.js";
import { sendBatchToTelegram } from "../modules/wick-telegram.js";

// Pushes everything still queued to Telegram so Dre sees the whole batch before
// any of it publishes. runWeeklyBatch already does this at the end of a run, but
// a batch generated before the Telegram creds existed (or one whose send failed)
// never got pushed. This re-sends without regenerating anything.
//
//   node scripts/wick-preview.js              send everything unpublished
//   node scripts/wick-preview.js <batch_id>   send one batch

const batchId = process.argv[2];

let q = supabase.from("wick_posts").select("*")
  .in("status", ["approved", "pending"])
  .order("created_at", { ascending: true });
if (batchId) q = q.eq("batch_id", batchId);

const { data, error } = await q;
if (error) { console.error(error.message); process.exit(1); }
if (!data?.length) { console.log("Nothing queued to preview."); process.exit(0); }

console.log(`Sending ${data.length} post(s) to Telegram...`);
for (const p of data) console.log(`  ${p.format.padEnd(8)} topic ${p.topic_id ?? "?"}  ${(p.slide_urls ?? []).length} slides`);

const ok = await sendBatchToTelegram(data);
console.log(ok ? "Sent." : "Not sent — check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.");
process.exit(0);
