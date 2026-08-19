import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import supabase from "../supabase/client.js";
import { pickTopics } from "../modules/wick-topics.js";
import { pickArt, libraryStats } from "../modules/wick-art-library.js";
import { writeToScenes, writeCaption, withJsonRetry } from "../modules/wick-copy.js";
import { compositeLessonItem } from "../modules/wick-render.js";

// ─── ZERO CREDIT BATCH ───────────────────────────────────────────────────────
// Builds posts entirely from art that already exists, so it spends NO Higgsfield
// credits. The pictures are fixed and the copy is written TO them, which is the
// only honest way to reuse art on a page whose first rule is that the artwork
// must match the words.
//
// Only CLEAN library art is used (see wick-art-library.js), and EVERY slide is
// rendered with the LESSON ITEM layout: the picture sits in a top strip and all
// text goes BELOW it.
//
// That is not a style choice, it is the constraint. Reused art was generated to
// fill a whole frame with the character somewhere in the middle. Any composite
// that lays text OVER the picture (the reveal closer, the lesson cover) buries
// his body and the grader correctly reads it as "a floating flame head". First
// run of this script produced exactly that on slide 7 of all three posts.
// Generated art can be asked for empty space; recovered art cannot.
//
// VERSUS is also excluded: it needs matched warm/cold PAIRS and the library is
// almost all warm, so pairing would produce comparisons that do not oppose.
//
//   node scripts/wick-reuse-batch.js            build what the library allows
//   node scripts/wick-reuse-batch.js --plan     show the plan, spend nothing

const PLAN_ONLY = process.argv.includes("--plan");
const BUCKET = "agent-x-images";
const BATCH = `wick-reuse-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

const tmp = () => {
  const d = path.join(os.tmpdir(), "wick-reuse", BATCH);
  fs.mkdirSync(d, { recursive: true });
  return d;
};

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
  // Same retry policy as the main batch: by this point the work is done, so a
  // network blip must not throw it away.
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

async function save(format, topic, copy, buffers, slot) {
  const urls = [];
  for (let i = 0; i < buffers.length; i++) {
    urls.push(await upload(buffers[i], `wick/${BATCH}/${slot}/slide-${String(i + 1).padStart(2, "0")}.jpg`));
  }
  // writeCaption takes a POST OBJECT ({format, copy}), not (topic, copy, format).
  // Calling it positionally made post.copy undefined so it threw on EVERY post,
  // and the catch below hid it: three batches shipped with no caption at all.
  // The catch stays (a caption is not worth losing finished art over) but it now
  // says so loudly instead of swallowing the failure.
  let caption = "";
  try {
    caption = await writeCaption({ format, copy, topic_id: topic.id, pillar: copy.pillar ?? null });
  } catch (err) {
    console.warn(`   ⚠️ caption FAILED (post still saved): ${err.message}`);
  }
  if (!caption) console.warn("   ⚠️ post saved with NO CAPTION");

  const { data, error } = await supabase.from("wick_posts").insert({
    batch_id: BATCH, format, sub_type: copy.sub_type ?? format.toLowerCase(),
    pillar: copy.pillar ?? null, slot_index: slot, topic_id: topic.id,
    copy, caption, slide_urls: urls, status: "qa_pending",  // promoted only by the image QA
  }).select().single();
  if (error) throw new Error(`insert: ${error.message}`);

  console.log(`   saved ${urls.length} slides`);
  try {
    const { sendPostToTelegram } = await import("../modules/wick-telegram.js");
    if (await sendPostToTelegram(data)) console.log("   pushed to Telegram");
  } catch (err) { console.warn(`   Telegram push failed (post is saved): ${err.message}`); }
  return data;
}

// LESSON built entirely from the safe strip layout: cover, five items, closer.
async function buildLesson(topic, art, dir, slot) {
  const slots = art.map((a, i) => ({
    role: i === 0 ? "the opening frame" : i === 6 ? "the closing frame" : `item ${i}`,
    shows: a.scene,
  }));
  const c = await withJsonRetry(() => writeToScenes(topic, "LESSON", slots, {
    rules: `- Frame 1 OPENS the post: an ALL CAPS headline promising a count of 5, plus one
  short line under it naming the trap.
- Frames 2 to 6 are numbered items. Each needs a short title, ONE problem
  sentence and ONE solution sentence, words a child knows, max 12 words each.
- Frame 7 CLOSES it: one short line that hands the decision back, then the ask.`,
    fields: `  "cover_headline": "ALL CAPS, promises a count of 5, max 8 words",
  "cover_line": "ONE short line under the headline, max 10 words",
  "items": [{ "number": 1, "title": "max 5 words", "problem": "ONE sentence, max 12 words", "solution": "ONE sentence, max 12 words" }],`,
  }), { label: "LESSON copy" });
  if (!c.items?.length) throw new Error("copy engine returned no items");

  const buffers = [];

  // Cover, in the same strip layout so the character is never covered.
  buffers.push(await compositeLessonItem({
    scenePath: await fetchArt(art[0], dir),
    number: "", title: c.cover_headline,
    problem: c.cover_line ?? "", solution: "",
  }));

  for (let i = 0; i < Math.min(5, c.items.length); i++) {
    const it = c.items[i];
    console.log(`   ${it.number ?? i + 1}. ${it.title}`);
    buffers.push(await compositeLessonItem({
      scenePath: await fetchArt(art[i + 1], dir),
      number: it.number ?? i + 1, title: it.title, problem: it.problem, solution: it.solution,
    }));
  }

  // Closer, same layout again.
  buffers.push(await compositeLessonItem({
    scenePath: await fetchArt(art[6], dir),
    number: "", title: c.closing_line ?? "",
    problem: c.send_to ? `Send this to ${String(c.send_to).replace(/^(The|A|An|Your|My)\b/, (m) => m.toLowerCase())}.` : "",
    solution: "Repost it if it landed.",
  }));

  return save("LESSON", topic, c, buffers, slot);
}

async function main() {
  const stats = libraryStats();
  console.log(`[Reuse] library: ${stats.reusable} clean images available`);

  // 5 per ORDER, 7 per LESSON. Build what the library can actually cover.
  const plan = [];
  let left = stats.reusable;
  while (left >= 7 && plan.length < 4) { plan.push("LESSON"); left -= 7; }
  // ORDER needs compositeSinglePanel and compositeReveal, both of which shade and
  // overlay the lower frame. Reused art cannot survive that, so LESSON only.

  console.log(`[Reuse] plan: ${plan.join(", ")}  (${plan.length} posts, 0 Higgsfield credits)`);
  if (PLAN_ONLY) return;

  const topics = await pickTopics(plan.length);
  const dir = tmp();
  const used = new Set();

  for (let i = 0; i < plan.length; i++) {
    const format = plan[i];
    const topic = topics[i] ?? topics[0];
    const art = pickArt(format === "LESSON" ? 7 : 5, used);
    if (art.length < (format === "LESSON" ? 7 : 5)) {
      console.log(`[Reuse] not enough clean art left for ${format} — stopping`);
      break;
    }
    console.log(`\n[Reuse] ${i + 1}/${plan.length} ${format} <- #${topic.id} ${topic.title}`);
    console.log(`   art: ${art.map((a) => "#" + a.n).join(" ")}`);
    try {
      await buildLesson(topic, art, dir, i);
    } catch (err) {
      console.error(`[Reuse] ${format} failed: ${err.message}`);
    }
  }
  // Gate the new posts NOW. They are qa_pending and cannot publish until this
  // passes them, so leaving it to the 7am sweep would stall the queue and, worse,
  // is what let ungraded posts ship in the first place.
  try {
    const { auditQueue } = await import("../modules/wick-image-qa.js");
    console.log("\n[Reuse] running image QA gate");
    await auditQueue({ autoPull: true });
  } catch (err) {
    console.warn(`[Reuse] QA gate failed: ${err.message}`);
  }
  console.log("\n[Reuse] done. Higgsfield credits spent: 0");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
