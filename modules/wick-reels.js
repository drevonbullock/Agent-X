import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { launchBrowser } from "../images/browser.js";

// ─── WICK'S WISDOM — REEL COVERS ─────────────────────────────────────────────
// 9:16 (1080x1920), NOT the 4:5 the feed carousels use. These are Reels covers
// and thumbnails, so they get the full vertical frame.
//
// Two layouts, both taken from references Dre supplied:
//   STEPS  — white header bar, a numbered sequence, Wick at the base
//   TIERS  — white header bar, a 3x3 badge grid where the EXPRESSION escalates
//
// Reels are locked to the 10% lanes (MIND_BEHAVIOUR / MONEY_SYSTEMS). Dre:
// "the reels should never be the 80". The mixture lane is for feed carousels.
//
// Every badge and the standing figure are CROPPED FROM THE CHARACTER SHEET that
// was already paid for, so a full set of reels costs nothing to illustrate.

const W = 1080, H = 1920;

// ─── REELS SAFE ZONE ────────────────────────────────────────────────────────
// Instagram draws its own UI OVER a reel, so the full 1080x1920 is not usable.
// Roughly: the top 250px carries the status bar and profile row, the bottom
// 420px carries the caption, handle, audio track and progress bar, and the right
// 200px is the like/comment/share/save column. Anything placed outside the
// middle is covered, which is why a correctly sized 9:16 reel can still look
// cropped and oversized on the phone.
//
// A feed carousel has none of this, which is why 4:5 posts read edge to edge.
// Only the VERTICAL band is reserved. An earlier version also inset the right
// edge for the action-button column, but that made every centred element centre
// inside an off-centre box and everything drifted left. The reference centres on
// the full frame and simply stays clear of the top and bottom, and the button
// icons are semi-transparent, so centred text reads fine underneath them.
const SAFE_TOP = 250;
const SAFE_BOTTOM = 420;
const SAFE_H = H - SAFE_TOP - SAFE_BOTTOM;   // 1250px of usable height
const PAD = 46;                              // symmetric, so centre is true centre
const FFMPEG = process.platform === "darwin" ? "/opt/homebrew/bin/ffmpeg" : "/usr/bin/ffmpeg";
const SHEET = path.join(process.cwd(), "wick_examples", "00_character_sheet.png");
const WATERMARK = "@WICKSWISDOM";

// The sheet is a 3x3 grid, 1744x2336, so each cell is ~581x779. Index 0-8,
// reading order. Expressions run roughly: content, serene, surprised / stern,
// determined, pleased / sad, weary, anxious.
export const SHEET_CELLS = 9;
export function cropCell(i, outPath, { square = true, sheet = SHEET } = {}) {
  const src = path.isAbsolute(sheet) ? sheet : path.join(process.cwd(), sheet);
  const cw = Math.floor(1744 / 3), ch = Math.floor(2336 / 3);
  const x = (i % 3) * cw, y = Math.floor(i / 3) * ch;
  // A square crop centred on the character reads better in a circular badge.
  const side = Math.min(cw, ch);
  const sx = x + Math.floor((cw - side) / 2);
  const sy = y + Math.floor((ch - side) * 0.12); // bias up: the head matters most
  const filter = square
    ? `crop=${side}:${side}:${sx}:${sy},scale=420:420`
    : `crop=${cw}:${ch}:${x}:${y},scale=560:750`;
  execFileSync(FFMPEG, ["-y", "-i", src, "-vf", filter, "-q:v", "2", outPath],
    { stdio: "pipe", timeout: 60_000 });
  return outPath;
}

function fontFace(family, file, weight = "400") {
  try {
    const b64 = fs.readFileSync(path.join(process.cwd(), "assets", "fonts", file)).toString("base64");
    return `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;` +
           `src:url(data:font/truetype;charset=utf-8;base64,${b64}) format('truetype');}`;
  } catch { return ""; }
}
const FONTS = `<style>
${fontFace("Anton", "Anton-Regular.ttf")}
${fontFace("DM Sans", "DMSans.ttf", "100 900")}
</style>`;

const dataUri = (p) => `data:image/${p.endsWith(".png") ? "png" : "jpeg"};base64,${fs.readFileSync(p).toString("base64")}`;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function render(html) {
  const browser = await launchBrowser({ protocolTimeout: 180_000 });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 30_000 }).catch(() => {});
    return Buffer.from(await page.screenshot({ type: "jpeg", quality: 92 }));
  } finally { await browser.close().catch(() => {}); }
}

const BASE = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000;font-family:'DM Sans',sans-serif;}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#000;}
/* Everything lives inside the safe band. The bands above and below are left
   deliberately empty because Instagram is going to draw on them. */
.safe{position:absolute;left:0;right:0;top:${SAFE_TOP}px;height:${SAFE_H}px;
  display:flex;flex-direction:column;}
.head{background:#fff;padding:26px ${PAD}px 22px;text-align:center;flex-shrink:0;}
.head h1{font-family:'Anton',sans-serif;font-size:68px;line-height:0.94;color:#000;
  text-transform:uppercase;letter-spacing:-0.5px;}
.foot{flex-shrink:0;padding:14px ${PAD}px 0;text-align:center;}
.foot .kick{font-family:'Anton',sans-serif;font-size:38px;line-height:1.04;color:#fff;
  text-transform:uppercase;margin-bottom:10px;}
.foot .cta{font-family:'DM Sans',sans-serif;font-weight:700;font-size:27px;color:#fff;line-height:1.25;}
.foot .cta b{color:#F5A524;}
.wm{position:absolute;top:${SAFE_TOP - 40}px;left:0;right:0;text-align:center;
  font-family:'DM Sans',sans-serif;font-size:15px;letter-spacing:5px;font-weight:500;
  color:rgba(255,255,255,0.34);}
`;

// ─── LAYOUT 1 — NUMBERED RULES ──────────────────────────────────────────────
export async function compositeStepsReel({ title, steps, kicker, sendTo, figurePath }) {
  const rules = steps;
  const n = rules.length;
  const size = n <= 5 ? 34 : n === 6 ? 31 : 28;
  const items = rules.map((r, i) => `
    <li><span class="n">${i + 1}.</span><span class="t"><b>${esc(r.rule)}</b> ${esc(r.why)}</span></li>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE}
.body{flex:1;padding:22px ${PAD}px 0;display:flex;flex-direction:column;justify-content:flex-start;}
ol{list-style:none;max-width:900px;margin:0 auto;}
li{display:flex;gap:14px;margin-bottom:16px;align-items:baseline;}
li .n{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${size}px;color:#F5A524;min-width:44px;}
li .t{font-family:'DM Sans',sans-serif;font-weight:400;font-size:${size}px;line-height:1.2;color:#e8e2d8;}
li .t b{font-weight:700;color:#fff;}
/* The figure is small and inline at the base of the list, not a hero image:
   at reel size the list is the content and a large figure just pushed the CTA
   into the caption overlay. The sheet cell is cropped round so its cream
   backing reads as a deliberate badge rather than a pasted rectangle. */
.figwrap{text-align:center;margin-top:auto;padding-bottom:8px;}
.figwrap img{width:210px;height:210px;border-radius:50%;object-fit:cover;
  border:5px solid #F5A524;box-shadow:0 0 30px rgba(245,165,36,0.32);}
</style></head><body>
<div class="slide">
  <div class="safe">
    <div class="head"><h1>${esc(title)}</h1></div>
    <div class="body">
      <ol>${items}</ol>
      ${figurePath ? `<div class="figwrap"><img src="${dataUri(figurePath)}"></div>` : ""}
    </div>
    <div class="foot">
      <div class="kick">${esc(kicker)}</div>
      <div class="cta">Send this to <b>${esc(sendTo)}</b><br>Repost it if it landed.</div>
    </div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return render(html);
}

// ─── LAYOUT 2 — TIER GRID ───────────────────────────────────────────────────
// Nine badges, expression escalating with the stat. The reference used cold
// showers; here the ladder is always a behavioural or structural one.
export async function compositeTiersReel({ titleLines, tiers, kicker, sendTo, badgePaths }) {
  const cells = tiers.map((t, i) => `
    <div class="cell">
      <div class="badge"><img src="${dataUri(badgePaths[i])}"></div>
      <div class="lbl">${esc(t.label)}</div>
      <div class="stat">${esc(t.stat)}</div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE}
.head h1{font-size:56px;}
.grid{flex:1;padding:20px ${PAD - 12}px 0;display:grid;grid-template-columns:repeat(3,1fr);
  grid-template-rows:repeat(3,1fr);gap:8px 12px;align-content:start;}
.cell{text-align:center;}
.badge{width:228px;height:228px;margin:0 auto 6px;border-radius:50%;overflow:hidden;
  border:4px solid #F5A524;box-shadow:0 0 26px rgba(245,165,36,0.34);background:#161208;}
.badge img{width:100%;height:100%;object-fit:cover;display:block;}
.lbl{font-family:'Anton',sans-serif;font-size:29px;color:#F5A524;text-transform:uppercase;
  letter-spacing:0.5px;line-height:1;}
.stat{font-family:'DM Sans',sans-serif;font-weight:500;font-size:21px;color:#cfc7bb;margin-top:2px;}
</style></head><body>
<div class="slide">
  <div class="safe">
    <div class="head"><h1>${titleLines.map(esc).join("<br>")}</h1></div>
    <div class="grid">${cells}</div>
    <div class="foot">
      <div class="kick">${esc(kicker)}</div>
      <div class="cta">Send this to <b>${esc(sendTo)}</b><br>Repost it if it landed.</div>
    </div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return render(html);
}

// A reel needs a still thumbnail as well as the cover. Same frame, scaled to the
// size Instagram shows on the profile grid, so the crop is checked not assumed.
// The reels tab shows a 9:16 still. Normalising every thumbnail to the same
// size and crop is what makes the tab look like one grid rather than a pile.
export function makeThumbnail(srcPath, outPath) {
  execFileSync(FFMPEG, ["-y", "-i", srcPath,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-q:v", "3", outPath], { stdio: "pipe", timeout: 60_000 });
  return outPath;
}
