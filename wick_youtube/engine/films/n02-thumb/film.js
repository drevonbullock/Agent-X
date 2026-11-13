// N02 THUMBNAILS: three variants for YouTube Test & Compare, one per second of "film time".
//   node render.mjs --film n02-thumb --scale 2 --stills 0.5,1.5,2.5     3840x2160 PNGs (A, B, C)
// Recipe (SKILL thumbnails): bright background, 1-3 word ALL-CAPS headline that is NOT the title, one huge hero
// object, Wick with a strong closed-mouth emotion, one red arrow or ring. Max 3 elements. No stacked piles (Dre).
import { PAL, paper, inkWick, makeStage, pose } from "../../lib2d/ink.js";
import { boot } from "../../lib2d/props.js";
import { coat, serif } from "../../lib2d/scene.js";
const TAU = Math.PI * 2;
const RED = "#e0402a", GOLD = "#f7b21b", INKBLUE = "#1b2440";

// headline: words = [[text, fill]], centred on x, thick ink outline so it reads at phone size
function headline(c, words, x, y, size, gapK = 0.28) {
  c.save(); c.font = `900 ${size}px Serif4`; c.textBaseline = "middle"; c.lineJoin = "round";
  const gap = size * gapK, ws = words.map(([w]) => c.measureText(w).width), total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let cx = x - total / 2;
  words.forEach(([w, fill], i) => {
    c.textAlign = "left";
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillText(w, cx + size * 0.05, y + size * 0.06);       // drop shadow
    c.lineWidth = size * 0.16; c.strokeStyle = fill === PAL.ink ? "#fffaf0" : PAL.ink; c.strokeText(w, cx, y);
    c.fillStyle = fill; c.fillText(w, cx, y);
    cx += ws[i] + gap;
  });
  c.restore();
}
// fat red arrow along a curve (a → b), Kurzgesagt-style, with an ink edge
function arrow(c, ax, ay, bx, by, bend = 0.25) {
  const mx = (ax + bx) / 2 - (by - ay) * bend, my = (ay + by) / 2 + (bx - ax) * bend;
  const ang = Math.atan2(by - my, bx - mx), hl = 70;
  const ex = bx - Math.cos(ang) * hl * 0.8, ey = by - Math.sin(ang) * hl * 0.8;
  c.save(); c.lineCap = "round";
  for (const [w, col] of [[40, PAL.ink], [28, RED]]) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); }
  c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(ang - 0.5) * hl, by - Math.sin(ang - 0.5) * hl); c.lineTo(bx - Math.cos(ang + 0.5) * hl, by - Math.sin(ang + 0.5) * hl); c.closePath();
  c.fillStyle = RED; c.fill(); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.lineJoin = "round"; c.stroke();
  c.restore();
}

const sky = (c, top, bottom) => { const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, top); g.addColorStop(1, bottom); c.save(); c.globalAlpha = 0.92; c.fillStyle = g; c.fillRect(0, 0, 1920, 1080); c.restore(); };
const floor = (c, y, col) => { c.fillStyle = col; c.fillRect(0, y, 1920, 1080 - y); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(0, y); c.lineTo(1920, y); c.stroke(); };
const priceTag = (c, x, y, txt, fill) => { c.save(); c.translate(x, y); c.rotate(-0.08); c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.roundRect(-110, -54, 230, 116, 18); c.fill(); c.fillStyle = fill; c.beginPath(); c.roundRect(-118, -62, 230, 116, 18); c.fill(); c.lineWidth = 7; c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = PAL.ink; c.beginPath(); c.arc(-88, -4, 12, 0, TAU); c.fill(); serif(c, txt, 14, -2, 76, INKBLUE); c.restore(); };

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const cream = paper(W, H, "#fbe8c4", 7);
  const arms = (n) => pose(10, [[0, n]]);

  // ---------- A · BROKE TAX: the cheap boot splitting open, water pouring in ----------
  const A = { bg: cream, art(c) {
    sky(c, "#fffaf0", "#ffe2b0"); floor(c, 930, "#d9c49a");
    c.save(); c.translate(1150, 930); c.rotate(-0.06); boot(c, 0, 0, 430, { cheap: true, split: 1, crack: 1 }); c.restore();
    c.fillStyle = "#5fb3e0"; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(1430 + (i % 3) * 40 - i * 6, 980 + Math.floor(i / 3) * 26, 34, 12, 0, 0, TAU); c.fill(); }
    c.fillStyle = "#7cc6f2"; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(1300 + i * 36, 870 + (i % 2) * 20, 9, 16, 0.3, 0, TAU); c.fill(); }
    inkWick(c, 470, 930, 175, { face: "worried", arms: arms("scratch"), t: 0.3, boots: "cheap", split: 0.8, glow: 1.2 }); coat(c, 470, 930, 175, "guard");
    arrow(c, 1760, 540, 1480, 880, -0.25);
  }, text(c) { headline(c, [["BROKE", PAL.ink], ["TAX", RED]], 960, 160, 200); } };

  // ---------- B · WHO PAYS MORE?: $10 boots vs $50 boots ----------
  const B = { bg: cream, art(c) {
    sky(c, "#e9fbff", "#9fe0ec"); floor(c, 930, "#c9e6e0");
    c.save(); c.translate(470, 930); boot(c, 0, 0, 320, { cheap: true, split: 0.7, crack: 1 }); c.restore();
    c.save(); c.translate(1420, 930); boot(c, 0, 0, 320, {}); c.restore();
    priceTag(c, 400, 480, "$10", "#fff3c4"); priceTag(c, 1490, 480, "$50", "#fff3c4");
    inkWick(c, 1010, 930, 140, { face: "skeptical", arms: arms("shrug"), t: 0.9, boots: "cheap", split: 0.4, glow: 1.1 }); coat(c, 1010, 930, 140, "guard");
    c.save(); c.strokeStyle = RED; c.lineWidth = 16; c.lineCap = "round"; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(500 + k * 6, 770 - k * 6, 300 + k * 12, 220 - k * 8, -0.1 + k * 0.05, 0.15 + k * 0.3, TAU - 0.2 + k * 0.3); c.stroke(); } c.restore();
  }, text(c) { headline(c, [["WHO", PAL.ink], ["PAYS", PAL.ink], ["MORE?", RED]], 960, 150, 170, 0.22); } };

  // ---------- C · NOT LAZY: the night guard and his 50-hour time card ----------
  const C = { bg: cream, art(c) {
    sky(c, "#fffaf0", "#ffe6b8"); floor(c, 950, "#d9c49a");
    c.save(); c.translate(1260, 600); c.rotate(0.06); c.fillStyle = "rgba(0,0,0,0.22)"; c.fillRect(-250, -300, 520, 640); c.fillStyle = "#fbf8ef"; c.fillRect(-260, -310, 520, 640); c.lineWidth = 8; c.strokeStyle = PAL.ink; c.strokeRect(-260, -310, 520, 640);
      serif(c, "TIME CARD", 0, -250, 50, INKBLUE); c.strokeStyle = "rgba(27,36,64,0.35)"; c.lineWidth = 3; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-220, -180 + k * 62); c.lineTo(220, -180 + k * 62); c.stroke(); }
      ["MON", "TUE", "WED", "THU", "FRI"].forEach((d, k) => { serif(c, d, -150, -150 + k * 62, 34, INKBLUE); serif(c, "10 h", 120, -150 + k * 62, 36, "#8a2f2a"); });
      serif(c, "50 HRS", 0, 220, 96, RED); c.restore();
    c.save(); c.strokeStyle = RED; c.lineWidth = 16; c.lineCap = "round"; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(1270 + k * 6, 820 - k * 6, 240 + k * 10, 80 - k * 6, 0.05, 0.1 + k * 0.3, TAU - 0.2 + k * 0.3); c.stroke(); } c.restore();
    inkWick(c, 560, 950, 185, { face: "determined", arms: arms("crossed"), t: 0.2, boots: "cheap", split: 0.5, glow: 1.3 }); coat(c, 560, 950, 185, "guard");
  }, text(c) { headline(c, [["NOT", PAL.ink], ["LAZY", RED]], 960, 150, 210); } };

  return { duration: 3, fps: 30, out, renderAt(t) { stage.frame([A, B, C][Math.min(2, Math.floor(t))], t); } };
}
