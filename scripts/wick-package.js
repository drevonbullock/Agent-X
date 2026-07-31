import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// Packs wick_examples/ into something reviewable in one pass:
//   - one contact sheet per carousel (all slides side by side)
//   - README.md with the topic, every slide's copy, and the caption
// Run: node scripts/wick-package.js

const DIR = "wick_examples";
const FFMPEG = process.platform === "darwin" ? "/opt/homebrew/bin/ffmpeg" : "/usr/bin/ffmpeg";

const copies = JSON.parse(fs.readFileSync(path.join(DIR, "copy.json"), "utf8"));
const captions = JSON.parse(fs.readFileSync(path.join(DIR, "captions.json"), "utf8"));

const SETS = [
  { key: "VERSUS",  prefix: "01_versus",  label: "VERSUS" },
  { key: "ORDER",   prefix: "02_order",   label: "ORDER" },
  { key: "COSTUME", prefix: "03_costume", label: "COSTUME" },
  { key: "LESSON",  prefix: "04_lesson",  label: "LESSON" },
];

// ─── CONTACT SHEETS ──────────────────────────────────────────────────────────
// hstack of every slide in the set, scaled down so the sheet stays openable.
for (const s of SETS) {
  const slides = fs.readdirSync(DIR)
    .filter((f) => f.startsWith(s.prefix) && f.endsWith(".jpg"))
    .sort();
  if (!slides.length) { console.warn(`no slides for ${s.label}`); continue; }

  const out = path.join(DIR, `_sheet_${s.prefix}.jpg`);
  const args = ["-y"];
  for (const f of slides) args.push("-i", path.join(DIR, f));
  const scaled = slides.map((_, i) => `[${i}:v]scale=540:675[s${i}]`).join(";");
  const chain = slides.map((_, i) => `[s${i}]`).join("");
  args.push("-filter_complex", `${scaled};${chain}hstack=inputs=${slides.length}[v]`,
            "-map", "[v]", "-q:v", "3", out);
  execFileSync(FFMPEG, args, { stdio: "pipe" });
  console.log(`sheet: ${path.basename(out)} (${slides.length} slides)`);
}

// ─── README ──────────────────────────────────────────────────────────────────
const lines = [
  "# Wick's Wisdom — Format Examples",
  "",
  "One complete carousel per format, generated from the 30 episode registry.",
  "Every slide is exactly 1080x1350 so Instagram will not crop the set.",
  "All label text is composited after generation, never drawn by the image model,",
  "so copy can be corrected without paying to re-roll art.",
  "",
  "| Format | Episode | Lane | Slides |",
  "| --- | --- | --- | --- |",
];
for (const s of SETS) {
  const c = copies[s.key];
  if (!c) continue;
  const n = fs.readdirSync(DIR).filter((f) => f.startsWith(s.prefix) && f.endsWith(".jpg")).length;
  lines.push(`| ${s.label} | #${c.topic.id} ${c.topic.title} | ${c.topic.lane} | ${n} |`);
}

for (const s of SETS) {
  const entry = copies[s.key];
  if (!entry) continue;
  const c = entry.copy;
  lines.push("", "---", "", `## ${s.label} — ${entry.topic.title}`, "");
  lines.push(`**Episode** #${entry.topic.id} · **Lane** ${entry.topic.lane}`);
  lines.push(`**Mechanic** ${entry.topic.hook} · **Lands on** ${entry.topic.payoff}`);
  if (c.pillar_link) lines.push(`**Pillar link** ${c.pillar_link}`);
  if (c.hidden_rule) lines.push("", `> ${c.hidden_rule}`);
  lines.push("", `![${s.label}](_sheet_${s.prefix}.jpg)`, "", "### Slides", "");

  if (c.pairs) {
    c.pairs.forEach((p, i) => lines.push(`${i + 1}. **${p.top_label}** / *${p.bottom_label}*`));
  } else if (c.roles) {
    c.roles.forEach((r, i) => lines.push(`${i + 1}. **${r.label}** — ${r.note}`));
  } else if (c.items) {
    lines.push(`1. **COVER:** ${c.cover_headline}`);
    c.items.forEach((it) => lines.push(`${it.number + 1}. **${it.title}** — ${it.problem}`));
  }
  lines.push(`${(c.pairs?.length ?? c.roles?.length ?? c.items?.length ?? 0) + 1}. **CTA:** ${c.closing_line} (keyword ${c.keyword})`);

  lines.push("", "### Caption", "", "```", captions[s.key] ?? "(none)", "```");
}

fs.writeFileSync(path.join(DIR, "README.md"), lines.join("\n") + "\n");
console.log("wrote README.md");
