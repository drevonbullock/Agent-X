import "dotenv/config";
import fs from "fs";
import path from "path";
import supabase from "../supabase/client.js";
import { byId } from "../modules/wick-topics.js";
import { writeRulesReel, writeTiersReel } from "../modules/wick-copy.js";
import { compositeRulesReel, compositeTiersReel, cropCell, makeThumbnail } from "../modules/wick-reels.js";

// Builds four 9:16 reel covers plus thumbnails. Every figure and badge is cropped
// from the character sheet that was already paid for, so this run costs nothing
// in image credits.
//
// Reels are 10% lanes only: MIND_BEHAVIOUR and MONEY_SYSTEMS, never the mixture.

const OUT = "wick_reels";
fs.mkdirSync(OUT, { recursive: true });
const tmp = "/tmp/wick-reels";
fs.mkdirSync(tmp, { recursive: true });

const PLAN = [
  { n: 1, topic: 24, layout: "rules",
    figureCell: 4 },                               // determined
  { n: 2, topic: 29, layout: "rules",
    figureCell: 3 },                               // stern
  { n: 3, topic: 22, layout: "tiers",
    // weakest to strongest: sad, weary, anxious, surprised, serene, content,
    // pleased, stern, determined
    cells: [6, 7, 8, 2, 1, 0, 5, 3, 4] },
  { n: 4, topic: 28, layout: "tiers",
    cells: [8, 6, 7, 2, 1, 0, 5, 3, 4] },
];

// Badge crops are shared across both tier reels; cut once, reuse.
const badge = (i) => {
  const p = path.join(tmp, `badge-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: true });
  return p;
};
const figure = (i) => {
  const p = path.join(tmp, `figure-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: false });
  return p;
};

for (const p of PLAN) {
  const t = byId(p.topic);
  console.log(`\n${p.n}. ${p.layout.toUpperCase()} · ep${t.id} [${t.lane}] ${t.title}`);
  if (t.lane === "HYBRID") { console.error("   REFUSED: reels are 10% lanes only"); continue; }

  try {
    let buf, copy;
    if (p.layout === "rules") {
      copy = await writeRulesReel(t);
      console.log(`   "${copy.title}"`);
      for (const r of copy.rules) console.log(`     ${r.rule} — ${r.why}`);
      buf = await compositeRulesReel({
        title: copy.title, rules: copy.rules, kicker: copy.kicker,
        sendTo: copy.send_to, figurePath: figure(p.figureCell),
      });
    } else {
      copy = await writeTiersReel(t);
      console.log(`   "${copy.title_lines.join(" / ")}"`);
      console.log(`     ${copy.tiers.map((x) => `${x.label} ${x.stat}`).join(" · ")}`);
      buf = await compositeTiersReel({
        titleLines: copy.title_lines, tiers: copy.tiers, kicker: copy.kicker,
        sendTo: copy.send_to, badgePaths: p.cells.map(badge),
      });
    }

    const cover = path.join(OUT, `reel-${p.n}-${p.layout}-ep${t.id}.jpg`);
    fs.writeFileSync(cover, buf);
    const thumb = makeThumbnail(cover, cover.replace(".jpg", "-thumb.jpg"));
    fs.writeFileSync(path.join(OUT, `reel-${p.n}-copy.json`), JSON.stringify({ topic: t, copy }, null, 2));
    console.log(`   saved ${path.basename(cover)} + ${path.basename(thumb)}`);
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }
}

console.log("\nREELS COMPLETE");
process.exit(0);
