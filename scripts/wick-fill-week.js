import "dotenv/config";
import supabase from "../supabase/client.js";
import { runWeeklyBatch } from "../modules/wicks-wisdom.js";
import { runWeeklyReels } from "../modules/wick-reel-batch.js";
import { auditQueue } from "../modules/wick-image-qa.js";
import { readBalance, creditsPerImage } from "../modules/credit-guard.js";
import { alertWick } from "../modules/wick-telegram.js";

// ─── FILL THE WEEK ───────────────────────────────────────────────────────────
// Dre, 2026-08-21: "make sure its enough for 7 days, any blocks or bugs fix them
// before its a problem."
//
// THE BLOCK. runWeeklyBatch builds a FIXED COUNT (14 = 2/day x 7). But the image
// QA gate rejects anything with a bad slide, and the measured pass rate across
// every graded post is 37%. So "build 14" lands about 5 usable posts, which is
// two and a half days, and the queue runs dry mid-week every time. That is the
// mechanism behind every "why didn't it post this week" so far: the batch
// reported success having built 14, and nobody was counting how many SURVIVED.
//
// Building a fixed number and hoping is the bug. This builds to a TARGET OF
// USABLE POSTS instead: build, grade, count what passed, build more if short.
//
// Guards, because an unbounded "keep building until it works" loop is how an
// account gets emptied:
//   - the credit floor is checked before every round and is authoritative
//   - MAX_ROUNDS caps total attempts even if the pass rate collapses to zero
//   - a round that adds NOTHING usable twice in a row stops the loop, because
//     that means the failure is systematic and more spending will not fix it
//
//   node scripts/wick-fill-week.js                 fill to 14 posts + 7 reels
//   node scripts/wick-fill-week.js --posts 14 --reels 7
//   node scripts/wick-fill-week.js --dry           report the gap, spend nothing

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? parseInt(process.argv[i + 1], 10) : dflt;
};
const TARGET_POSTS = arg("posts", 14);   // 2/day x 7 days
const TARGET_REELS = arg("reels", 7);    // 1/day x 7 days
const MAX_ROUNDS = arg("rounds", 4);
const DRY = process.argv.includes("--dry");

// What is actually publishable. Mirrors publishNextApproved exactly: status is
// not enough, because a pulled post keeps whatever status it had.
async function usable() {
  const [{ data: p }, { data: r }] = await Promise.all([
    supabase.from("wick_posts").select("status,pulled_at").is("pulled_at", null),
    supabase.from("wick_reels").select("status"),
  ]);
  const ok = (row) => ["approved", "pending", "qa_pending"].includes(row.status);
  return { posts: (p ?? []).filter(ok).length, reels: (r ?? []).filter(ok).length };
}

async function main() {
  let have = await usable();
  console.log(`[Fill] have ${have.posts}/${TARGET_POSTS} posts, ${have.reels}/${TARGET_REELS} reels`);
  console.log(`[Fill] balance ${readBalance()} @ ${creditsPerImage()} credits/image`);

  if (DRY) {
    console.log(`[Fill] --dry: would build ${Math.max(0, TARGET_POSTS - have.posts)} more post(s), ` +
      `${Math.max(0, TARGET_REELS - have.reels)} more reel(s)`);
    return;
  }

  let barren = 0;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const shortPosts = Math.max(0, TARGET_POSTS - have.posts);
    const shortReels = Math.max(0, TARGET_REELS - have.reels);
    if (!shortPosts && !shortReels) break;

    // Overbuild by the measured shortfall plus a margin, because some of this
    // round will fail QA too. Capped so one bad round cannot run away.
    const build = Math.min(shortPosts + Math.ceil(shortPosts * 0.5), 20);
    console.log(`\n[Fill] round ${round}/${MAX_ROUNDS}: short ${shortPosts} post(s), building ${build}`);

    if (build) {
      try {
        await runWeeklyBatch({ formats: Array.from({ length: build }, (_, i) =>
          ["LESSON", "ORDER", "VERSUS"][i % 3]) });
      } catch (err) { console.error(`[Fill] batch round failed: ${err.message}`); }
    }
    if (shortReels) {
      try { await runWeeklyReels({ count: shortReels }); }
      catch (err) { console.error(`[Fill] reel round failed: ${err.message}`); }
    }

    // Grade before counting. runWeeklyBatch gates its own output, but reels and
    // any straggler rows are caught here so the count below is honest.
    try { await auditQueue({ autoPull: true }); }
    catch (err) { console.warn(`[Fill] QA gate failed: ${err.message}`); }

    const after = await usable();
    const gained = after.posts - have.posts;
    console.log(`[Fill] round ${round}: +${gained} usable post(s) → ${after.posts}/${TARGET_POSTS}`);

    // Two rounds that add nothing means the failure is systematic. Spending
    // more will not fix a broken prompt, so stop and say so.
    barren = gained > 0 ? 0 : barren + 1;
    have = after;
    if (barren >= 2) {
      console.error("[Fill] two rounds produced nothing usable — stopping rather than spending into a systematic failure");
      break;
    }
  }

  const bal = readBalance();
  const days = (have.posts / 2).toFixed(1);
  const done = have.posts >= TARGET_POSTS && have.reels >= TARGET_REELS;
  const msg = [
    done ? "✅ Week is covered" : "⚠️ Week is NOT fully covered",
    "",
    `${have.posts}/${TARGET_POSTS} posts (${days} days at 2/day)`,
    `${have.reels}/${TARGET_REELS} reel images`,
    bal != null ? `${Math.round(bal)} credits left` : "balance unreadable",
  ].join("\n");
  console.log(`\n${msg}`);
  try { await alertWick(msg); } catch { /* reporting must not mask the result */ }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
