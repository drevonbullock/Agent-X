import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";
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
const SHEET_BG = "0xF2E3C3";

// ─── CONTENT-AWARE CELL CROP ────────────────────────────────────────────────
// Dre, 2026-08-10: "the images for the reels are terrible and off centered."
//
// The old crop assumed each character sat centred inside its 581x778 grid cell
// and took a SQUARE 581x581 window out of it. Both assumptions were wrong.
// Extracting a raw cell shows the figure sitting well RIGHT of centre with a
// wide band of empty cream on the left, and its feet running into the bottom
// edge. So the square window cut the legs off AND framed what was left off
// centre. That is exactly what shipped on the reels.
//
// Now the character is FOUND rather than assumed. Calibrated against real
// pixels from the sheet:
//   black rubber limbs  max 31-51, saturation 6-15   -> neutral and very dark
//   vignetted corners   max 112,   saturation 76     -> dark but BROWN
//   flame gold          max 254,   saturation 213    -> very saturated
//   cream background    max 239+,  saturation 74-82
// so "neutral dark" catches the limbs without catching the vignette, and "very
// saturated" catches the flame. Between them they bound the whole figure: flame
// at the top, feet at the bottom, hands at the sides.
const bboxCache = new Map();

function cellBBox(sheetPath, i) {
  const key = `${sheetPath}#${i}`;
  if (bboxCache.has(key)) return bboxCache.get(key);

  // canvas is already a dependency (chartjs-node-canvas), so no new install.
  const { createCanvas, loadImageSync } = requireCanvas();
  const img = loadImageSync(sheetPath);
  const cw = Math.floor(img.width / 3), ch = Math.floor(img.height / 3);
  const cx = (i % 3) * cw, cy = Math.floor(i / 3) * ch;

  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(cx, cy, cw, ch).data;

  let minX = cw, maxX = 0, minY = ch, maxY = 0, hits = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const o = (y * cw + x) * 4;
      const r = d[o], g = d[o + 1], b = d[o + 2];
      const mx = Math.max(r, g, b), sat = mx - Math.min(r, g, b);
      const isLimb  = mx < 90 && sat < 40;    // neutral black, not brown vignette
      const isFlame = sat > 150;              // saturated gold
      if (isLimb || isFlame) {
        hits++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }

  // Too few hits means the detector missed; fall back to the whole cell rather
  // than crop to noise.
  const box = hits < 500
    ? { x: cx, y: cy, w: cw, h: ch }
    : (() => {
        const pad = Math.floor(cw * 0.06);        // breathing room, not a tight cut
        const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
        const x1 = Math.min(cw - 1, maxX + pad), y1 = Math.min(ch - 1, maxY + pad);
        return { x: cx + x0, y: cy + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      })();
  bboxCache.set(key, box);
  return box;
}

// Lazy require so a missing canvas never breaks a text-only render path.
function requireCanvas() {
  // eslint-disable-next-line
  const mod = createRequire(import.meta.url)("canvas");
  return { createCanvas: mod.createCanvas, loadImageSync: (p) => {
    const img = new mod.Image();
    img.src = fs.readFileSync(p);
    return img;
  } };
}

export function cropCell(i, outPath, { square = true, sheet = SHEET } = {}) {
  const src = path.isAbsolute(sheet) ? sheet : path.join(process.cwd(), sheet);
  let box;
  try {
    box = cellBBox(src, i);
  } catch (err) {
    console.warn(`[WickReels] bbox detect failed (${err.message}), using whole cell`);
    const cw = Math.floor(1744 / 3), ch = Math.floor(2336 / 3);
    box = { x: (i % 3) * cw, y: Math.floor(i / 3) * ch, w: cw, h: ch };
  }

  // Letterbox into the target so the WHOLE figure survives, dead centre, and the
  // pad matches the sheet so the fill is invisible.
  const [tw, th] = square ? [460, 460] : [560, 750];
  const filter = `crop=${box.w}:${box.h}:${box.x}:${box.y},` +
    `scale=${tw}:${th}:force_original_aspect_ratio=decrease,` +
    `pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:${SHEET_BG}`;

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
.head h1{font-family:'Anton',sans-serif;font-size:76px;line-height:0.94;color:#000;
  text-transform:uppercase;letter-spacing:-0.5px;}
.foot{flex-shrink:0;padding:14px ${PAD}px 0;text-align:center;}
.foot .kick{font-family:'Anton',sans-serif;font-size:46px;line-height:1.04;color:#fff;
  text-transform:uppercase;margin-bottom:10px;}
.foot .cta{font-family:'DM Sans',sans-serif;font-weight:700;font-size:32px;color:#fff;line-height:1.25;}
.foot .cta b{color:#F5A524;}
.wm{position:absolute;top:${SAFE_TOP - 40}px;left:0;right:0;text-align:center;
  font-family:'DM Sans',sans-serif;font-size:15px;letter-spacing:5px;font-weight:500;
  color:rgba(255,255,255,0.34);}
`;

// ─── LAYOUT 1 — NUMBERED RULES ──────────────────────────────────────────────
export async function compositeStepsReel({ title, steps, kicker, sendTo, figurePath }) {
  const rules = steps;
  const n = rules.length;
  const size = n <= 5 ? 46 : n === 6 ? 42 : 38;
  const items = rules.map((r, i) => `
    <li><span class="n">${i + 1}.</span><span class="t"><b>${esc(r.rule)}</b> ${esc(r.why)}</span></li>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE}
/* space-between, not flex-start: the list and the badge share the band instead
   of collapsing to its two ends and leaving a hole between them. */
.body{flex:1;padding:26px ${PAD}px 0;display:flex;flex-direction:column;justify-content:space-between;}
ol{list-style:none;max-width:980px;margin:0 auto;}
li{display:flex;gap:16px;margin-bottom:${n <= 5 ? 22 : 16}px;align-items:baseline;}
li .n{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${size}px;color:#F5A524;min-width:52px;}
li .t{font-family:'DM Sans',sans-serif;font-weight:400;font-size:${size}px;line-height:1.24;color:#e8e2d8;}
li .t b{font-weight:700;color:#fff;}
/* The figure is small and inline at the base of the list, not a hero image:
   at reel size the list is the content and a large figure just pushed the CTA
   into the caption overlay. The sheet cell is cropped round so its cream
   backing reads as a deliberate badge rather than a pasted rectangle. */
.figwrap{text-align:center;padding-bottom:6px;}
.figwrap img{width:250px;height:250px;border-radius:50%;object-fit:cover;
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
