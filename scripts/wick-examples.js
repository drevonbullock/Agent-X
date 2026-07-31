import "dotenv/config";
import fs from "fs";
import path from "path";

// Generates one complete example carousel for EVERY Wick format so the whole
// visual system can be reviewed side by side. Writes to wick_examples/.
//
//   node scripts/wick-examples.js            full run, art + composites
//   node scripts/wick-examples.js --copy     copy only, no images, no credits
//
// --copy exists because copy is the cheap part and decides everything. Read it
// before spending a single credit on art.

const COPY_ONLY = process.argv.includes("--copy");

const OUT = COPY_ONLY ? "wick_examples/copy" : "wick_examples";
fs.mkdirSync(OUT, { recursive: true });

const { writeVersusCarousel, writeOrderCarousel, writeCostume, writeLesson, writeCaption } =
  await import("../modules/wick-copy.js");
const { byId } = await import("../modules/wick-topics.js");

// One topic per format, chosen to show the range of the registry:
// two HYBRID (the 80% lane), one MIND_BEHAVIOUR, one MONEY_SYSTEMS.
const ASSIGN = {
  VERSUS:  byId(6),   // Why Free Trials Work on You Every Time
  ORDER:   byId(19),  // Why Ten Dollars a Month Feels Like Nothing
  COSTUME: byId(30),  // Where Your Money Goes When You Swipe
  LESSON:  byId(15),  // Why Your Budget Dies in Week Three
};

const captions = {};
const copies = {};

// Resume support. A run is ~30 generations at 7 credits, so a crash partway
// through must not re-buy what is already on disk. Existing copy is reused
// verbatim so regenerated slides still match the ones already rendered.
const COPY_PATH = path.join(OUT, "copy.json");
const prior = fs.existsSync(COPY_PATH) ? JSON.parse(fs.readFileSync(COPY_PATH, "utf8")) : {};
if (Object.keys(prior).length) {
  Object.assign(copies, prior);
  if (fs.existsSync(path.join(OUT, "captions.json"))) {
    Object.assign(captions, JSON.parse(fs.readFileSync(path.join(OUT, "captions.json"), "utf8")));
  }
  console.log(`[resume] reusing saved copy for: ${Object.keys(prior).join(", ")}`);
}

async function writeFor(format) {
  const t = ASSIGN[format];
  if (prior[format]?.copy) {
    console.log(`\n=== ${format} — #${t.id} ${t.title} [${t.lane}] (copy reused) ===`);
    return prior[format].copy;
  }
  console.log(`\n=== ${format} — #${t.id} ${t.title} [${t.lane}] ===`);
  const copy = format === "VERSUS"  ? await writeVersusCarousel(t)
             : format === "ORDER"   ? await writeOrderCarousel(t)
             : format === "COSTUME" ? await writeCostume(t)
             :                        await writeLesson(t);
  copies[format] = { topic: t, copy };

  if (format === "LESSON") {
    console.log(`  cover: ${copy.cover_headline}`);
    for (const i of copy.items) console.log(`  ${i.number}. ${i.title}`);
  } else if (format === "COSTUME") {
    for (const r of copy.roles) console.log(`  ${r.label} — ${r.note}`);
  } else {
    for (const p of copy.pairs) console.log(`  "${p.top_label}"  /  "${p.bottom_label}"`);
  }
  console.log(`  link: ${copy.pillar_link ?? copy.pillar}`);
  console.log(`  rule: ${copy.hidden_rule ?? copy.closing_line}`);

  captions[format] = await writeCaption({ format, copy });
  return copy;
}

// A slide already on disk is already paid for. Skip it.
const done = (file) => fs.existsSync(path.join(OUT, file));

const v = await writeFor("VERSUS");
const o = await writeFor("ORDER");
const c = await writeFor("COSTUME");
const l = await writeFor("LESSON");

fs.writeFileSync(path.join(OUT, "captions.json"), JSON.stringify(captions, null, 2));
fs.writeFileSync(path.join(OUT, "copy.json"), JSON.stringify(copies, null, 2));

if (COPY_ONLY) {
  console.log(`\nCOPY ONLY — wrote ${OUT}/copy.json and captions.json. No credits spent.`);
  process.exit(0);
}

// ─── ART ─────────────────────────────────────────────────────────────────────

const {
  generateScene, download, versusPanelPrompt, costumePrompt, lessonScenePrompt,
  compositeTwoPanel, compositeCostume, compositeLessonCover, compositeLessonItem, compositeCta,
} = await import("../modules/wick-render.js");

const tmp = "/tmp/wick-ex";
fs.mkdirSync(tmp, { recursive: true });

async function gen(prompt, name, aspect) {
  for (let a = 1; a <= 2; a++) {
    try {
      const { url } = generateScene(prompt, aspect);
      return await download(url, path.join(tmp, `${name}.png`));
    } catch (e) {
      console.warn(`  retry ${name}: ${String(e.message).slice(0, 90)}`);
    }
  }
  throw new Error(`${name} failed`);
}
const save = (buf, file) => { fs.writeFileSync(path.join(OUT, file), buf); console.log(`  saved ${file}`); };

// 1. VERSUS
console.log("\n=== VERSUS art ===");
for (let i = 0; i < v.pairs.length; i++) {
  const file = `01_versus_${i + 1}.jpg`;
  if (done(file)) { console.log(`  skip ${file}`); continue; }
  const p = v.pairs[i];
  const t = await gen(versusPanelPrompt(p.top_scene,    { owned: true,  expression: p.top_expression,    seed: i * 2 }),     `v${i}t`, "3:2");
  const b = await gen(versusPanelPrompt(p.bottom_scene, { owned: false, expression: p.bottom_expression, seed: i * 2 + 1 }), `v${i}b`, "3:2");
  save(await compositeTwoPanel({ topPath: t, bottomPath: b, topLabel: p.top_label, bottomLabel: p.bottom_label }), file);
}
if (done("01_versus_5_cta.jpg")) console.log("  skip 01_versus_5_cta.jpg");
else save(await compositeCta({ scenePath: await gen(lessonScenePrompt(v.cta_scene, v.cta_expression), "vcta", "3:4"), closingLine: v.closing_line, keyword: v.keyword, resource: v.resource }), "01_versus_5_cta.jpg");

// 2. ORDER
console.log("\n=== ORDER art ===");
for (let i = 0; i < o.pairs.length; i++) {
  const file = `02_order_${i + 1}.jpg`;
  if (done(file)) { console.log(`  skip ${file}`); continue; }
  const p = o.pairs[i];
  const t = await gen(versusPanelPrompt(p.top_scene,    { owned: true, expression: p.top_expression,    seed: i * 2 + 7 }), `o${i}t`, "3:2");
  const b = await gen(versusPanelPrompt(p.bottom_scene, { owned: true, expression: p.bottom_expression, seed: i * 2 + 8 }), `o${i}b`, "3:2");
  save(await compositeTwoPanel({ topPath: t, bottomPath: b, topLabel: p.top_label, bottomLabel: p.bottom_label }), file);
}
if (done("02_order_5_cta.jpg")) console.log("  skip 02_order_5_cta.jpg");
else save(await compositeCta({ scenePath: await gen(lessonScenePrompt(o.cta_scene, o.cta_expression), "octa", "3:4"), closingLine: o.closing_line, keyword: o.keyword, resource: o.resource }), "02_order_5_cta.jpg");

// 3. COSTUME
console.log("\n=== COSTUME art ===");
for (let i = 0; i < c.roles.length; i++) {
  const file = `03_costume_${i + 1}.jpg`;
  if (done(file)) { console.log(`  skip ${file}`); continue; }
  const r = c.roles[i];
  console.log(`  ${i + 1}. ${r.label}`);
  save(await compositeCostume({ scenePath: await gen(costumePrompt(r, i), `c${i}`, "3:4"), label: r.label, boldWord: r.bold }), file);
}
if (done("03_costume_7_cta.jpg")) console.log("  skip 03_costume_7_cta.jpg");
else save(await compositeCta({ scenePath: await gen(lessonScenePrompt(c.cta_scene, c.cta_expression), "ccta", "3:4"), closingLine: c.closing_line, keyword: c.keyword, resource: c.resource }), "03_costume_7_cta.jpg");

// 4. LESSON
console.log("\n=== LESSON art ===");
if (done("04_lesson_1_cover.jpg")) console.log("  skip 04_lesson_1_cover.jpg");
else save(await compositeLessonCover({ scenePath: await gen(lessonScenePrompt(l.cover_scene, l.cover_expression, 0), "lcover", "3:4"), headline: l.cover_headline }), "04_lesson_1_cover.jpg");
for (const item of l.items) {
  const file = `04_lesson_${item.number + 1}_${item.number}.jpg`;
  if (done(file)) { console.log(`  skip ${file}`); continue; }
  console.log(`  ${item.number}. ${item.title}`);
  save(await compositeLessonItem({
    scenePath: await gen(lessonScenePrompt(item.scene, item.expression, item.number), `l${item.number}`, "3:4"),
    number: item.number, title: item.title, problem: item.problem, solution: item.solution,
  }), file);
}
if (done("04_lesson_7_cta.jpg")) console.log("  skip 04_lesson_7_cta.jpg");
else {
  const recap = await gen(lessonScenePrompt(
    `stands on a city sidewalk at dusk at a five way junction, ${l.items.length} illuminated overhead direction signs crowded above the left hand street all pointing the same way, one clear open street to the right leading toward lit towers, a bus shelter and parked cars framing the junction`,
    "resolved and clear eyed"), "lrecap", "3:4");
  save(await compositeCta({ scenePath: recap, closingLine: l.closing_line, keyword: l.keyword, resource: l.resource }), "04_lesson_7_cta.jpg");
}

console.log("\nALL FOUR CAROUSELS COMPLETE");
process.exit(0);
