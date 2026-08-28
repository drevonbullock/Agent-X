import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import supabase from "../supabase/client.js";
import { pickTopics } from "../modules/wick-topics.js";
import { pickOverlaySafe, pickStripSafe, libraryFramingStats } from "../modules/wick-art-library.js";
import { writeToScenes, writeCaption, withJsonRetry, setUsedIdeas, critiqueCoherence } from "../modules/wick-copy.js";
import { compositeLessonCover, compositeLessonItem, compositeCta, loadStyleSettings } from "../modules/wick-render.js";
import { auditQueue } from "../modules/wick-image-qa.js";

// ─── THE WEEK, FROM THE LIBRARY, FOR ZERO CREDITS ────────────────────────────
// Dre, 2026-08-26: "you can reuse all images that pass the quality test, no
// need to regenerate." Combined with the harvested job history, that makes a
// full week buildable with NO Higgsfield credits: the art exists and is paid
// for; only the words are new.
//
// Every post is a LESSON in the current doctrine:
//   cover  money hook (dollar figure, promise/loss/cost shape) on the new
//          educational card layout — OVERLAY-SAFE art only (coverTop/upper
//          framing: the lower frame is empty by construction)
//   items  5 × PROBLEM → SOLUTION → HOW, art in the top strip, words below
//   closer CTA on overlay-safe art
//
// Copy is written TO the scenes: the pictures are fixed, so the words adapt
// to them — the only honest way to reuse art on a page whose first rule is
// that the artwork matches the words.
//
//   node scripts/wick-week-from-library.js              build to 14
//   node scripts/wick-week-from-library.js --posts 8
//   node scripts/wick-week-from-library.js --plan       show capacity, build nothing

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? parseInt(process.argv[i + 1], 10) : d; };
const TARGET = arg("posts", 14);
const PLAN = process.argv.includes("--plan");
const BUCKET = "agent-x-images";
const BATCH = `wick-lib-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

async function fetchArt(a, dir) {
  const p = path.join(dir, `art-${a.n}.png`);
  if (!fs.existsSync(p)) {
    const r = await fetch(a.url);
    if (!r.ok) throw new Error(`fetch art #${a.n}: ${r.status}`);
    fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  }
  return p;
}

async function upload(buf, key) {
  let last;
  for (let i = 1; i <= 4; i++) {
    const { error } = await supabase.storage.from(BUCKET)
      .upload(key, buf, { contentType: "image/jpeg", upsert: true });
    if (!error) return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    last = error;
    await new Promise((r) => setTimeout(r, 2000 * i));
  }
  throw new Error(`upload ${key}: ${last?.message}`);
}

async function buildOne(topic, slot, dir) {
  const used = new Set();
  const overlay = pickOverlaySafe(2, used);            // cover + closer
  const strip = pickStripSafe(5, used);                // 5 items
  if (overlay.length < 2 || strip.length < 5) return null;

  const slots = [
    { role: "the cover", shows: overlay[0].scene },
    ...strip.map((a, i) => ({ role: `item ${i + 1}`, shows: a.scene })),
    { role: "the closing frame", shows: overlay[1].scene },
  ];

  const extraRules = `- Frame 1 is the COVER. Its headline is a hook from Dre's template, max 10
  words, ALL CAPS, with a ROUND number only ($100/$250/$500/$1,000 — never
  $289). The four shapes, exactly: "YOU MISSED OUT ON $1,000 LAST WEEK" /
  "LET ME SHOW YOU HOW TO MAKE $1,000 IN 1 DAY" / "LET ME SHOW YOU HOW YOU
  CAN SAVE $100 PER DAY" / "YOU ARE LOSING $100 A DAY". Each carries its
  emotion (regret, hope, alarm). Mind-lane topics use hours or nights instead
  of dollars. NO trailing "HERE'S HOW" — the card prints that itself. Never a
  count formula.
- Frames 2 to 6 are numbered items. Each teaches PROBLEM then SOLUTION then
  HOW: problem = the trap with its number (max 12 words), solution = the fix
  as a principle (max 12 words), how = ONE imperative move to make tonight
  (max 10 words). The arithmetic across the items must CASH the cover's round
  number — the exact math lives here, the rounding lives on the cover.
- Frame 7 CLOSES: one short line that hands the decision back, then the ask.
- NUMBERS: find honest believable figures for THIS scenario first, then round
  their total into the hook. Never work backwards from a clean hook number to
  invented items. The same convenient amount repeating across items is a fail.
- The hook names the everyday thing PLAINLY. No metaphor, no shorthand: a
  stranger must know what the post is about from the hook alone.`;
  const extraFields = `  "cover_headline": "ALL CAPS hook from Dre's template with a ROUND number, max 10 words, no trailing HERE'S HOW",
  "items": [{ "number": 1, "title": "max 5 words", "problem": "trap + number, max 12 words", "solution": "the fix as a principle, max 12 words", "how": "ONE imperative move tonight, max 10 words" }],`;
  const c = await withJsonRetry(() => writeToScenes(topic, "LESSON", slots, {
    rules: extraRules, fields: extraFields,
  }), { label: "library LESSON copy" });
  if (!c.items?.length || !c.cover_headline) throw new Error("copy engine returned incomplete copy");

  // THE COPY INSPECTOR. Write, then judge as a stranger, then rewrite ONCE
  // with the exact objections, then judge again. Two fails kill the topic:
  // shipping confident nonsense is what "YOU ARE LOSING $500 A YEAR TO THE
  // STARS" was, and no image gate can save a post whose words are gibberish.
  let verdict = await critiqueCoherence(c);
  if (!verdict.pass) {
    console.log(`   ✎ copy failed inspection: ${verdict.problems.slice(0, 2).join(" | ").slice(0, 160)}`);
    const c2 = await withJsonRetry(() => writeToScenes(topic, "LESSON", slots, {
      rules: extraRules + `\n- A previous draft FAILED review for these exact problems. Fix every one:\n` +
        verdict.problems.map((x) => "  * " + x).join("\n"),
      fields: extraFields,
    }), { label: "library LESSON rewrite" });
    verdict = await critiqueCoherence(c2);
    if (!verdict.pass) throw new Error(`copy failed inspection twice: ${verdict.problems[0] ?? "incoherent"}`);
    Object.assign(c, c2);
  }
  console.log(`   ✓ copy inspector: "${String(verdict.retell).slice(0, 90)}"`);

  const buffers = [];
  buffers.push(await compositeLessonCover({
    scenePath: await fetchArt(overlay[0], dir), headline: c.cover_headline,
  }));
  for (let i = 0; i < Math.min(5, c.items.length); i++) {
    const it = c.items[i];
    buffers.push(await compositeLessonItem({
      scenePath: await fetchArt(strip[i], dir),
      number: it.number ?? i + 1, title: it.title,
      problem: it.problem, solution: it.solution, how: it.how,
    }));
  }
  buffers.push(await compositeCta({
    scenePath: await fetchArt(overlay[1], dir),
    closingLine: c.closing_line, sendTo: c.send_to,
    keyword: c.keyword, resource: c.resource,
  }));

  const urls = [];
  for (let i = 0; i < buffers.length; i++) {
    urls.push(await upload(buffers[i], `wick/${BATCH}/${slot}/slide-${String(i + 1).padStart(2, "0")}.jpg`));
  }
  let caption = "";
  try { caption = await writeCaption({ format: "LESSON", copy: c, topic_id: topic.id, pillar: c.pillar ?? null }); }
  catch (err) { console.warn(`   caption failed (post still saved): ${err.message}`); }

  const { data, error } = await supabase.from("wick_posts").insert({
    batch_id: BATCH, format: "LESSON", sub_type: "problem_solution_how",
    pillar: c.pillar ?? null, slot_index: slot, topic_id: topic.id,
    copy: c, caption, slide_urls: urls, status: "qa_pending",
    image_model: "library-reuse",
  }).select().single();
  if (error) throw new Error(`insert: ${error.message}`);

  try {
    const { sendPostToTelegram } = await import("../modules/wick-telegram.js");
    await sendPostToTelegram(data);
  } catch (err) { console.warn(`   Telegram push failed (post is saved): ${err.message}`); }
  return data;
}

async function main() {
  await loadStyleSettings();   // Edit-the-Editor: dashboard-set typography
  const stats = libraryFramingStats();
  console.log(`[LibWeek] library:`, JSON.stringify(stats));
  // Capacity: each post needs 2 overlay-safe + 5 strip-safe uses, cap 2 uses/image.
  const overlayCap = ((stats.coverTop ?? 0) + (stats.upper ?? 0)) * 2;
  const canBuild = Math.min(TARGET, Math.floor(overlayCap / 2));
  console.log(`[LibWeek] overlay-safe uses available: ${overlayCap} → can build ~${canBuild} of ${TARGET} posts`);
  if (PLAN) return;

  const { data: prior } = await supabase.from("wick_posts")
    .select("copy").order("created_at", { ascending: false }).limit(150);
  setUsedIdeas((prior ?? []).flatMap((r) => [r.copy?.theme, r.copy?.cover_headline, r.copy?.reveal_line]));

  const topics = await pickTopics(canBuild);
  const dir = path.join(os.tmpdir(), "wick-lib", BATCH);
  fs.mkdirSync(dir, { recursive: true });

  const { stopRequested, clearStop } = await import("../modules/wick-overseer.js");
  await clearStop();
  const created = [];
  for (let i = 0; i < canBuild; i++) {
    // The Overseer's stop lever. Checked between posts so a stop never tears a
    // half-built post; the current post finishes or fails, then the line halts.
    if (await stopRequested()) {
      console.log("[LibWeek] STOPPED by the Overseer");
      try { const { alertWick } = await import("../modules/wick-telegram.js");
        await alertWick("🛑 Build stopped by the Overseer after " + created.length + " post(s)."); } catch {}
      break;
    }
    const topic = topics[i % topics.length];
    if (!topic) break;
    console.log(`\n[LibWeek] ${i + 1}/${canBuild} LESSON <- #${topic.id} ${topic.title}`);
    try {
      const post = await buildOne(topic, i, dir);
      if (!post) { console.log("[LibWeek] art exhausted — stopping"); break; }
      created.push(post);
      console.log(`   queued (${post.slide_urls.length} slides) — 0 credits`);
    } catch (err) {
      console.error(`[LibWeek] post ${i} failed: ${err.message}`);
    }
  }

  console.log(`\n[LibWeek] built ${created.length}, running the QA gate`);
  try { await auditQueue({ autoPull: true }); }
  catch (err) { console.warn(`[LibWeek] QA gate failed: ${err.message}`); }

  const { count } = await supabase.from("wick_posts").select("*", { count: "exact", head: true })
    .in("status", ["approved", "pending", "qa_pending"]).is("pulled_at", null);
  const msg = `📚 Library week done: built ${created.length} post(s), ${count ?? 0} now publishable (${((count ?? 0) / 2).toFixed(1)} days). Higgsfield credits spent: 0.`;
  console.log(msg);
  try { const { alertWick } = await import("../modules/wick-telegram.js"); await alertWick(msg); } catch { /* logged above */ }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
