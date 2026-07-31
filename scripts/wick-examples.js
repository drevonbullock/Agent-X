import "dotenv/config";
import fs from "fs";
import path from "path";

// Generates one complete example carousel for EVERY Wick format so the whole
// visual system can be reviewed side by side. Writes to wick_examples/.
// Run: node scripts/wick-examples.js

const OUT = "wick_examples";
fs.mkdirSync(OUT, { recursive: true });

const { writeVersusCarousel, writeOrderCarousel, writeLesson, writeCaption, ARCHETYPES } =
  await import("../modules/wick-copy.js");
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
const captions = {};

// ─── 1. VERSUS ───────────────────────────────────────────────────────────────
console.log("\n=== VERSUS carousel ===");
const v = await writeVersusCarousel();
console.log(`theme: ${v.theme} | pillar: ${v.pillar}`);
for (let i = 0; i < v.pairs.length; i++) {
  const p = v.pairs[i];
  console.log(`  ${i + 1}. "${p.top_label}" / "${p.bottom_label}"`);
  const t = await gen(versusPanelPrompt(p.top_scene, { ancient: true, expression: p.top_expression, seed: i * 2 }), `v${i}t`, "3:2");
  const b = await gen(versusPanelPrompt(p.bottom_scene, { ancient: false, expression: p.bottom_expression, seed: i * 2 + 1 }), `v${i}b`, "3:2");
  save(await compositeTwoPanel({ topPath: t, bottomPath: b, topLabel: p.top_label, bottomLabel: p.bottom_label }), `01_versus_${i + 1}.jpg`);
}
const vcta = await gen(lessonScenePrompt(v.cta_scene, v.cta_expression), "vcta", "3:4");
save(await compositeCta({ scenePath: vcta, closingLine: v.closing_line, keyword: v.keyword, resource: v.resource }), "01_versus_5_cta.jpg");
captions.VERSUS = await writeCaption({ format: "VERSUS", copy: v });

// ─── 2. ORDER ────────────────────────────────────────────────────────────────
console.log("\n=== ORDER carousel ===");
const o = await writeOrderCarousel();
console.log(`theme: ${o.theme} | pillar: ${o.pillar}`);
for (let i = 0; i < o.pairs.length; i++) {
  const p = o.pairs[i];
  console.log(`  ${i + 1}. "${p.top_label}" / "${p.bottom_label}"`);
  const t = await gen(versusPanelPrompt(p.top_scene, { ancient: true, expression: p.top_expression, seed: i * 2 + 7 }), `o${i}t`, "3:2");
  const b = await gen(versusPanelPrompt(p.bottom_scene, { ancient: true, expression: p.bottom_expression, seed: i * 2 + 8 }), `o${i}b`, "3:2");
  save(await compositeTwoPanel({ topPath: t, bottomPath: b, topLabel: p.top_label, bottomLabel: p.bottom_label }), `02_order_${i + 1}.jpg`);
}
const octa = await gen(lessonScenePrompt(o.cta_scene, o.cta_expression), "octa", "3:4");
save(await compositeCta({ scenePath: octa, closingLine: o.closing_line, keyword: o.keyword, resource: o.resource }), "02_order_5_cta.jpg");
captions.ORDER = await writeCaption({ format: "ORDER", copy: o });

// ─── 3. COSTUME ──────────────────────────────────────────────────────────────
console.log("\n=== COSTUME carousel ===");
for (let i = 0; i < ARCHETYPES.length; i++) {
  const a = ARCHETYPES[i];
  console.log(`  ${i + 1}. ${a.label} (${a.expression})`);
  const p = await gen(costumePrompt(a, i), `c${i}`, "3:4");
  save(await compositeCostume({ scenePath: p, label: a.label, boldWord: a.bold }), `03_costume_${i + 1}_${a.bold.toLowerCase()}.jpg`);
}
const ccta = await gen(lessonScenePrompt(
  "sits at a worn wooden desk writing on a sheet of papyrus with a reed pen, eight small hand drawn sketches pinned to the wall above the desk in a row, a stack of scrolls and a clay cup at the desk edge, a quiet study at night",
  "warm and quietly satisfied"), "ccta", "3:4");
save(await compositeCta({ scenePath: ccta, closingLine: "Eight minds. Most people only ever build one.", keyword: "SAGE", resource: "all eight" }), "03_costume_9_cta.jpg");
captions.COSTUME = await writeCaption({ format: "COSTUME", copy: { archetypes: ARCHETYPES, hidden_rule: "Character is a set of roles you can practise, not a fixed trait." } });

// ─── 4. LESSON ───────────────────────────────────────────────────────────────
console.log("\n=== LESSON carousel ===");
const l = await writeLesson();
console.log(`"${l.cover_headline}" | pillar: ${l.pillar}`);
const cover = await gen(lessonScenePrompt(l.cover_scene, l.cover_expression, 0), "lcover", "3:4");
save(await compositeLessonCover({ scenePath: cover, headline: l.cover_headline }), "04_lesson_1_cover.jpg");
for (const item of l.items) {
  console.log(`  ${item.number}. ${item.title}`);
  const p = await gen(lessonScenePrompt(item.scene, item.expression, item.number), `l${item.number}`, "3:4");
  save(await compositeLessonItem({ scenePath: p, number: item.number, title: item.title, problem: item.problem, solution: item.solution }), `04_lesson_${item.number + 1}_${item.number}.jpg`);
}
const recap = await gen(lessonScenePrompt(
  `stands at a fork in a dirt road at golden hour, ${l.items.length} weathered wooden signposts crowded along the left hand road each pointing down it, a single clear road on the right leading toward distant sunlit hills, tall grass and two old trees framing the fork`,
  "resolved and clear eyed"), "lrecap", "3:4");
save(await compositeCta({ scenePath: recap, closingLine: l.closing_line, keyword: l.keyword, resource: l.resource }), "04_lesson_7_cta.jpg");
captions.LESSON = await writeCaption({ format: "LESSON", copy: l });

fs.writeFileSync(path.join(OUT, "captions.json"), JSON.stringify(captions, null, 2));
fs.writeFileSync(path.join(OUT, "copy.json"), JSON.stringify({ versus: v, order: o, lesson: l }, null, 2));
console.log("\nALL FOUR CAROUSELS COMPLETE");
process.exit(0);
