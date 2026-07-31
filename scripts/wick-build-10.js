import "dotenv/config";
import fs from "fs";
import path from "path";
import supabase from "../supabase/client.js";
import { byId } from "../modules/wick-topics.js";
import { SCENES } from "../modules/wick-assets.js";
import {
  writeToScenes, writeVersusCarousel, writeOrderCarousel,
  writeLesson, writeParable, writeCaption,
} from "../modules/wick-copy.js";
import {
  generateScene, download, tmpDir,
  versusPanelPrompt, lessonScenePrompt, parableScenePrompt, costumePrompt,
  compositeTwoPanel, compositeSplitPanel, compositeSinglePanel,
  compositeReveal, compositeParable, compositeCostume,
  compositeLessonCover, compositeLessonItem, compositeCta,
} from "../modules/wick-render.js";

// Builds the 10 approved posts, reusing paid art wherever it genuinely fits and
// generating only what is missing. Resumable: a post already in wick_posts for
// this batch is skipped, so a crash never re-buys work.
//
//   node scripts/wick-build-10.js          build
//   node scripts/wick-build-10.js --plan   print the plan and cost, spend nothing

const PLAN_ONLY = process.argv.includes("--plan");
const BATCH = "wick-rebuild-10";
const BUCKET = "agent-x-images";
const scene = (f) => SCENES.find((s) => s.file.endsWith(`/${f}.png`));

// ─── THE PLAN ────────────────────────────────────────────────────────────────
// reuse: files already on disk. gen: how many new images this post needs.
const PLAN = [
  { n: 1, topic: 7,  format: "VERSUS", layout: "stacked",
    pairs: [["v0t","v0b"],["v1t","v1b"],["v2t","v2b"],["v3t","v3b"]], cta: "vcta" },

  { n: 2, topic: 15, format: "LESSON",
    cover: "lcover", items: ["l1","l2","l3","l4","l5"], recap: "lrecap" },

  { n: 3, topic: 17, format: "VERSUS", layout: "stacked",
    warm: ["o0t","o1t","o2t","o3t"], cta: "octa" },

  { n: 4, topic: 8,  format: "VERSUS", layout: "stacked",
    warm: ["o0b","o1b","o2b","o3b"], cta: "ccta" },

  { n: 5, topic: 16, format: "VERSUS", layout: "split",
    warm: ["v0t","v1t","v2t","v3t"] },

  { n: 6, topic: 19, format: "ORDER" },
  { n: 7, topic: 10, format: "ORDER" },
  { n: 8, topic: 11, format: "LESSON" },
  { n: 9, topic: 21, format: "PARABLE" },

  { n: 10, topic: 26, format: "COSTUME",
    roles: ["c0","c1","c2","c3","c4","c5"] },
];

const GEN_COST = { 1: 0, 2: 0, 3: 4, 4: 4, 5: 4, 6: 5, 7: 5, 8: 7, 9: 5, 10: 1 };

if (PLAN_ONLY) {
  let total = 0;
  for (const p of PLAN) {
    const g = GEN_COST[p.n];
    total += g;
    console.log(`${String(p.n).padStart(2)}. ${p.format.padEnd(8)} ep${String(p.topic).padEnd(3)} ${byId(p.topic)?.title ?? "?"}  →  ${g} gen`);
  }
  console.log(`\n${total} generations ≈ ${total * 7} credits`);
  process.exit(0);
}

async function upload(buf, key) {
  const { error } = await supabase.storage.from(BUCKET)
    .upload(key, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`upload ${key}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

// Generate one image, retrying the download in place (never the generation).
async function gen(prompt, dir, name, aspect) {
  const { url, jobId } = generateScene(prompt, aspect);
  return { path: await download(url, path.join(dir, `${name}.png`)), jobId };
}

async function alreadyBuilt(n) {
  const { data } = await supabase.from("wick_posts")
    .select("id").eq("batch_id", BATCH).eq("slot_index", n).maybeSingle();
  return !!data;
}

async function save(p, buffers, copy, caption, jobIds) {
  const urls = [];
  for (let i = 0; i < buffers.length; i++) {
    urls.push(await upload(buffers[i], `wick/${BATCH}/${p.n}/slide-${String(i + 1).padStart(2, "0")}.jpg`));
  }
  const { error } = await supabase.from("wick_posts").insert({
    batch_id: BATCH, format: p.format, sub_type: copy.sub_type ?? p.format.toLowerCase(),
    pillar: copy.pillar ?? null, slot_index: p.n, topic_id: p.topic,
    copy, caption, slide_urls: urls, hf_job_ids: jobIds,
    status: "approved",
  });
  if (error) throw new Error(`insert: ${error.message}`);
  console.log(`   saved ${urls.length} slides`);

  // Deliver immediately. A post nobody can see is a post that does not exist.
  try {
    const { data: row } = await supabase.from("wick_posts")
      .select("*").eq("batch_id", BATCH).eq("slot_index", p.n).single();
    const { sendPostToTelegram } = await import("../modules/wick-telegram.js");
    if (row && await sendPostToTelegram(row)) console.log("   pushed to Telegram");
  } catch (err) {
    console.warn(`   Telegram push failed (post is saved): ${err.message}`);
  }
}

// ─── BUILDERS ────────────────────────────────────────────────────────────────

async function buildReusedVersus(p, dir, jobIds) {
  const topic = byId(p.topic);
  const slots = [];
  for (const [t, b] of p.pairs) {
    slots.push({ role: "owner (warm)", shows: scene(t).shows });
    slots.push({ role: "the reader's default (cold)", shows: scene(b).shows });
  }
  const c = await writeToScenes(topic, "VERSUS", slots, {
    rules: "- Labels alternate: frames 1,3,5,7 are the owner line (third person); frames 2,4,6,8 are the reader's default (second person).",
  });
  const buffers = [];
  for (let i = 0; i < p.pairs.length; i++) {
    const [t, b] = p.pairs[i];
    console.log(`   ${i + 1}. "${c.labels[i * 2]}" / "${c.labels[i * 2 + 1]}"`);
    buffers.push(await compositeTwoPanel({
      topPath: scene(t).file, bottomPath: scene(b).file,
      topLabel: c.labels[i * 2], bottomLabel: c.labels[i * 2 + 1],
    }));
  }
  buffers.push(await compositeCta({
    scenePath: scene(p.cta).file, closingLine: c.closing_line, sendTo: c.send_to,
  }));
  return { buffers, copy: { ...c, sub_type: "owner_vs_owned" } };
}

// Warm panels reused, cold halves generated to answer them.
async function buildHalfVersus(p, dir, jobIds) {
  const topic = byId(p.topic);
  const slots = p.warm.map((f) => ({ role: "owner (warm, art exists)", shows: scene(f).shows }));
  const c = await writeToScenes(topic, "VERSUS", slots, {
    rules: `- These four frames are the OWNER panels only, written in third person.
- For each, also write the reader's default that answers it, in second person,
  and a scene staging that default so it can be generated.`,
    fields: `  "counters": ["the reader's default answering each frame, max 7 words, 4 entries"],
  "counter_scenes": ["one dense sentence staging each counter: his body position, the action that proves it, 3-4 named modern objects, present day, 4 entries"],
  "counter_expressions": ["emotionally precise expression for each counter, 4 entries"],`,
  });

  if (!c.counters?.length || !c.counter_scenes?.length) {
    throw new Error("copy engine omitted counters/counter_scenes");
  }
  const buffers = [];
  for (let i = 0; i < p.warm.length; i++) {
    console.log(`   ${i + 1}. "${c.labels[i]}" / "${c.counters[i]}"`);
    const cold = await gen(
      versusPanelPrompt(c.counter_scenes[i], { owned: false, expression: c.counter_expressions?.[i], seed: i * 2 + 1 }),
      dir, `cold-${i}`, "3:2");
    if (cold.jobId) jobIds.push(cold.jobId);
    buffers.push(p.layout === "split"
      ? await compositeSplitPanel({
          leftPath: cold.path, rightPath: scene(p.warm[i]).file,
          leftLabel: c.counters[i], rightLabel: c.labels[i] })
      : await compositeTwoPanel({
          topPath: scene(p.warm[i]).file, bottomPath: cold.path,
          topLabel: c.labels[i], bottomLabel: c.counters[i] }));
  }

  // Split posts have no spare closing frame, so one is generated.
  let ctaPath;
  if (p.cta) ctaPath = scene(p.cta).file;
  else {
    const g = await gen(lessonScenePrompt(
      "sits at a small table with an open notebook and a phone face down beside a mug, the room quiet around him",
      "settled and clear eyed", 7), dir, "cta", "4:5");
    if (g.jobId) jobIds.push(g.jobId);
    ctaPath = g.path;
  }
  buffers.push(await compositeCta({ scenePath: ctaPath, closingLine: c.closing_line, sendTo: c.send_to }));
  return { buffers, copy: { ...c, sub_type: "owner_vs_owned" } };
}

async function buildReusedLesson(p) {
  const topic = byId(p.topic);
  const slots = [
    { role: "cover", shows: scene(p.cover).shows },
    ...p.items.map((f) => ({ role: "numbered item", shows: scene(f).shows })),
    { role: "recap", shows: scene(p.recap).shows },
  ];
  const c = await writeToScenes(topic, "LESSON", slots, {
    rules: `- Label 1 is the COVER HEADLINE: ALL CAPS, promises a count, max 8 words.
- Labels 2 to 6 are item TITLES, max 6 words each.
- Label 7 is the recap frame and is ignored.`,
    fields: `  "problems": ["2 to 3 sentences naming the trap, second person, one per item, 5 entries"],
  "solutions": ["2 to 3 sentences naming the practice and the cost of skipping it, never a step by step method, 5 entries"],`,
  });
  if (!c.problems?.length || !c.solutions?.length) {
    throw new Error("copy engine omitted problems/solutions");
  }
  const buffers = [];
  console.log(`   cover: ${c.labels[0]}`);
  buffers.push(await compositeLessonCover({ scenePath: scene(p.cover).file, headline: c.labels[0] }));
  for (let i = 0; i < p.items.length; i++) {
    console.log(`   ${i + 1}. ${c.labels[i + 1]}`);
    buffers.push(await compositeLessonItem({
      scenePath: scene(p.items[i]).file, number: i + 1, title: c.labels[i + 1],
      problem: c.problems[i], solution: c.solutions[i],
    }));
  }
  buffers.push(await compositeCta({
    scenePath: scene(p.recap).file, closingLine: c.closing_line, sendTo: c.send_to,
  }));
  return { buffers, copy: { ...c, cover_headline: c.labels[0], sub_type: "problem_solution" } };
}

async function buildReusedCostume(p, dir, jobIds) {
  const topic = byId(p.topic);
  const slots = p.roles.map((f) => ({ role: "one actor in the chain", shows: scene(f).shows }));
  const c = await writeToScenes(topic, "COSTUME", slots, {
    rules: `- Each label names that actor's ROLE in the mechanic, max 5 words, plain and
  modern, in the shape "The one who sets the price".`,
    fields: `  "bolds": ["the single most important word from each label, ${p.roles.length} entries"],`,
  });
  const buffers = [];
  for (let i = 0; i < p.roles.length; i++) {
    console.log(`   ${i + 1}. ${c.labels[i]}`);
    buffers.push(await compositeCostume({
      scenePath: scene(p.roles[i]).file, label: c.labels[i], boldWord: c.bolds?.[i],
    }));
  }
  const g = await gen(lessonScenePrompt(
    "stands at a kitchen counter looking down at a card lying face up beside a receipt and a mug, the room quiet",
    "knowing and unhurried", 4), dir, "cta", "4:5");
  if (g.jobId) jobIds.push(g.jobId);
  buffers.push(await compositeCta({ scenePath: g.path, closingLine: c.closing_line, sendTo: c.send_to }));
  return { buffers, copy: { ...c, sub_type: "cast" } };
}

async function buildOrder(p, dir, jobIds) {
  const c = await writeOrderCarousel(byId(p.topic));
  const buffers = [];
  for (let i = 0; i < c.lines.length; i++) {
    console.log(`   ${i + 1}. "${c.lines[i].label}"`);
    const g = await gen(lessonScenePrompt(c.lines[i].scene, c.lines[i].expression, i), dir, `line-${i}`, "4:5");
    if (g.jobId) jobIds.push(g.jobId);
    buffers.push(await compositeSinglePanel({ scenePath: g.path, label: c.lines[i].label }));
  }
  const g = await gen(lessonScenePrompt(c.cta_scene, c.cta_expression, 9), dir, "reveal", "4:5");
  if (g.jobId) jobIds.push(g.jobId);
  buffers.push(await compositeReveal({
    scenePath: g.path, revealLine: c.reveal_line,
    closingLine: c.closing_line, sendTo: c.send_to,
  }));
  return { buffers, copy: c };
}

async function buildLesson(p, dir, jobIds) {
  const l = await writeLesson(byId(p.topic));
  const buffers = [];
  console.log(`   cover: ${l.cover_headline}`);
  const cov = await gen(lessonScenePrompt(l.cover_scene, l.cover_expression, 0), dir, "cover", "4:5");
  if (cov.jobId) jobIds.push(cov.jobId);
  buffers.push(await compositeLessonCover({ scenePath: cov.path, headline: l.cover_headline }));
  for (const it of l.items) {
    console.log(`   ${it.number}. ${it.title}`);
    const g = await gen(lessonScenePrompt(it.scene, it.expression, it.number), dir, `item-${it.number}`, "4:5");
    if (g.jobId) jobIds.push(g.jobId);
    buffers.push(await compositeLessonItem({
      scenePath: g.path, number: it.number, title: it.title,
      problem: it.problem, solution: it.solution,
    }));
  }
  const g = await gen(lessonScenePrompt(
    `stands on a city pavement at dusk beneath ${l.items.length} lit overhead signs all pointing down one street, one clear street to the right`,
    "resolved and clear eyed", 8), dir, "recap", "4:5");
  if (g.jobId) jobIds.push(g.jobId);
  buffers.push(await compositeCta({ scenePath: g.path, closingLine: l.closing_line, sendTo: l.send_to }));
  return { buffers, copy: l };
}

async function buildParable(p, dir, jobIds) {
  const c = await writeParable(byId(p.topic));
  console.log(`   speaker: ${c.speaker}`);
  const buffers = [];
  for (let i = 0; i < c.beats.length; i++) {
    const b = c.beats[i];
    console.log(`   ${i + 1}. "${b.bubble}"`);
    const g = await gen(parableScenePrompt(b.scene, b.expression, b.side, i), dir, `beat-${i}`, "4:5");
    if (g.jobId) jobIds.push(g.jobId);
    buffers.push(await compositeParable({ scenePath: g.path, bubbleText: b.bubble, side: b.side }));
  }
  const ap = await gen(lessonScenePrompt(c.application_scene, c.application_expression, 5), dir, "apply", "4:5");
  if (ap.jobId) jobIds.push(ap.jobId);
  buffers.push(await compositeSinglePanel({ scenePath: ap.path, label: c.application }));
  const g = await gen(lessonScenePrompt(c.cta_scene, c.cta_expression, 9), dir, "cta", "4:5");
  if (g.jobId) jobIds.push(g.jobId);
  buffers.push(await compositeReveal({
    scenePath: g.path, revealLine: c.application,
    closingLine: c.closing_line, sendTo: c.send_to,
  }));
  return { buffers, copy: c };
}

// ─── RUN ─────────────────────────────────────────────────────────────────────

for (const p of PLAN) {
  const t = byId(p.topic);
  if (await alreadyBuilt(p.n)) { console.log(`\n${p.n}. ${p.format} ep${p.topic} — already built, skipping`); continue; }
  console.log(`\n${p.n}. ${p.format} ep${p.topic} — ${t.title}  (${GEN_COST[p.n]} gen)`);

  const dir = tmpDir(BATCH, p.n);
  const jobIds = [];
  try {
    const built =
      p.n === 1  ? await buildReusedVersus(p, dir, jobIds)
    : p.n === 2  ? await buildReusedLesson(p)
    : p.n === 10 ? await buildReusedCostume(p, dir, jobIds)
    : p.warm     ? await buildHalfVersus(p, dir, jobIds)
    : p.format === "ORDER"   ? await buildOrder(p, dir, jobIds)
    : p.format === "LESSON"  ? await buildLesson(p, dir, jobIds)
    : p.format === "PARABLE" ? await buildParable(p, dir, jobIds)
    : null;
    if (!built) throw new Error(`no builder for post ${p.n}`);

    const caption = await writeCaption({ format: p.format, copy: built.copy });
    await save(p, built.buffers, built.copy, caption, jobIds);
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }
}

console.log("\nBUILD COMPLETE");
process.exit(0);
