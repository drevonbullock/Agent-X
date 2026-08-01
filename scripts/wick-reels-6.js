import "dotenv/config";
import fs from "fs";
import path from "path";
import { byId } from "../modules/wick-topics.js";
import { writeStepsReel, writeTiersReel } from "../modules/wick-copy.js";
import { compositeStepsReel, compositeTiersReel, cropCell, makeThumbnail } from "../modules/wick-reels.js";
import { generateScene, download, STYLE_STACK } from "../modules/wick-render.js";

// Six 9:16 reel covers plus matching thumbnails.
//   4 STEPS  — 2 Mind & Behaviour, 2 Money & Systems
//   2 TIERS  — 1 Mind & Behaviour (plain), 1 Money & Systems (business suit)
//
// Badges and figures are cropped from the two character sheets, so the only
// generation cost is the thumbnails: one per reel, Wick on plain white.
//
// Reels are 10% lanes only. The mixture lane is for feed carousels.

const OUT = "wick_reels";
const tmp = "/tmp/wick-reels";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

const PLAIN = "wick_examples/00_character_sheet.png";
const SUIT  = "wick_examples/00_character_sheet_suit.png";

const PLAN = [
  { n: 1, topic: 23, layout: "steps", sheet: PLAIN, figureCell: 3 },
  { n: 2, topic: 25, layout: "steps", sheet: PLAIN, figureCell: 1 },
  { n: 3, topic: 27, layout: "steps", sheet: SUIT,  figureCell: 4 },
  { n: 4, topic: 30, layout: "steps", sheet: SUIT,  figureCell: 0 },
  // Weakest to strongest, mapped onto each sheet's expression order.
  { n: 5, topic: 24, layout: "tiers", sheet: PLAIN, cells: [6, 7, 8, 2, 1, 0, 5, 3, 4] },
  { n: 6, topic: 28, layout: "tiers", sheet: SUIT,  cells: [6, 7, 8, 2, 1, 5, 0, 3, 4] },
];

const tag = (sheet) => (sheet === SUIT ? "suit" : "plain");
const badge = (sheet, i) => {
  const p = path.join(tmp, `badge-${tag(sheet)}-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: true, sheet });
  return p;
};
const figure = (sheet, i) => {
  const p = path.join(tmp, `figure-${tag(sheet)}-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: false, sheet });
  return p;
};

// Thumbnails are a SET, so the treatment is fixed: plain white, character
// centred, one action, nothing else. Consistency is the whole point when they
// sit next to each other on the reels tab.
const THUMB_STYLE =
  "Plain pure white studio background, completely empty, no room, no set, no " +
  "scenery, no gradient and no shadow on the backdrop. The character is centred, " +
  "full body, at a comfortable distance with even flat lighting. " + STYLE_STACK +
  " Absolutely no text anywhere in the image.";

const el = () => `<<<${process.env.WICK_ELEMENT_ID || "5e934732-6de4-438a-b3a6-024144603518"}>>>`;

async function makeCoverThumb(scene, suited, outPath) {
  const suit = suited
    ? "He wears a well tailored charcoal business suit jacket with a white collar and slim dark tie as a small garment over his cream wax candle body, the wax clearly visible below it. "
    : "";
  const anatomy =
    "CRITICAL ANATOMY: he is a CANDLE. His body is a short cream wax cylinder with soft drips and nothing else. " +
    "No human torso, shoulders, chest, hips or neck. Thin black rubber hose arms ending in rounded mitten hands, " +
    "thin black rubber hose legs ending in rounded feet. The flame is his whole head, roughly the same height as the wax body.";
  const prompt = `A polished cinematic 3D cartoon character portrait, vertical. ${el()} ${scene} ${suit}${anatomy} ${THUMB_STYLE}`;
  const { url } = generateScene(prompt, "9:16");
  return download(url, outPath);
}

for (const p of PLAN) {
  const t = byId(p.topic);
  console.log(`\n${p.n}. ${p.layout.toUpperCase()} · ep${t.id} [${t.lane}] ${t.title}${p.sheet === SUIT ? " · SUIT" : ""}`);
  if (t.lane === "HYBRID") { console.error("   REFUSED: reels are 10% lanes only"); continue; }

  try {
    let buf, copy;
    if (p.layout === "steps") {
      copy = await writeStepsReel(t);
      console.log(`   "${copy.title}"`);
      for (const s of copy.steps) console.log(`     ${s.rule} — ${s.why}`);
      buf = await compositeStepsReel({
        title: copy.title, steps: copy.steps, kicker: copy.kicker,
        sendTo: copy.send_to, figurePath: figure(p.sheet, p.figureCell),
      });
    } else {
      copy = await writeTiersReel(t);
      console.log(`   "${copy.title_lines.join(" / ")}"`);
      console.log(`     ${copy.tiers.map((x) => `${x.label} ${x.stat}`).join(" · ")}`);
      buf = await compositeTiersReel({
        titleLines: copy.title_lines, tiers: copy.tiers, kicker: copy.kicker,
        sendTo: copy.send_to, badgePaths: p.cells.map((i) => badge(p.sheet, i)),
      });
    }

    const cover = path.join(OUT, `reel-${p.n}-${p.layout}-ep${t.id}.jpg`);
    fs.writeFileSync(cover, buf);

    const thumbSrc = path.join(tmp, `thumb-${p.n}.png`);
    if (!fs.existsSync(thumbSrc)) await makeCoverThumb(copy.thumb_scene, p.sheet === SUIT, thumbSrc);
    makeThumbnail(thumbSrc, path.join(OUT, `reel-${p.n}-thumb.jpg`));

    fs.writeFileSync(path.join(OUT, `reel-${p.n}-copy.json`), JSON.stringify({ topic: t, copy }, null, 2));
    console.log(`   saved cover + thumbnail`);
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }
}

console.log("\nREELS COMPLETE");
process.exit(0);
