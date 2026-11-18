// N02 kit: scenery and infographic pieces shared by films n02b and n02c (n02a has its own copies, approved as is).
import { rng, seg, lerp, clamp, easeOut, backOut } from "../../lib2d/ease.js";
import { PAL } from "../../lib2d/ink.js";
import { serif } from "../../lib2d/scene.js";
export const TAU = Math.PI * 2, G = 900, CREAM = "#f3ecd6", RED = "#e0402a", GOLD = "#f7b21b", INKBLUE = "#1b2440";

// the city street: night (rain scenes) or day (morning errands); lamps at the given x
export function cityBack(c, live, { day = false, lamps = [300, 1300, 2150, 3300], x0 = -2000, x1 = 6000 } = {}) {
  const sky = c.createLinearGradient(0, -900, 0, G);
  if (day) { sky.addColorStop(0, "#9fc3dc"); sky.addColorStop(1, "#f2e2c2"); } else { sky.addColorStop(0, "#0a1226"); sky.addColorStop(1, "#1e2d4f"); }
  c.fillStyle = sky; c.fillRect(x0, -2400, x1 - x0, G + 2400);
  for (let i = 0; i < 18; i++) {
    const q = rng(i + 40), bx = -600 + i * 330 + q() * 60, bw = 220 + q() * 120, bh = 320 + q() * 420;
    c.fillStyle = day ? (i % 2 ? "#8e9db3" : "#a3aec0") : (i % 2 ? "#141d36" : "#18223f"); c.fillRect(bx, G - bh, bw, bh);
    for (let wy = G - bh + 30; wy < G - 70; wy += 56) for (let wx = bx + 22; wx < bx + bw - 30; wx += 48) { const r = q(); if (r < 0.42) { c.fillStyle = day ? "rgba(220,235,245,0.75)" : (r < 0.2 ? "rgba(245,201,106,0.85)" : "rgba(245,201,106,0.4)"); c.fillRect(wx, wy, 22, 30); } }
  }
  c.fillStyle = day ? "#b9b2a2" : "#3a4256"; c.fillRect(x0, G, x1 - x0, 70); c.fillStyle = day ? "#6d7280" : "#232a3b"; c.fillRect(x0, G + 70, x1 - x0, 1400);
  c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(x0, G); c.lineTo(x1, G); c.moveTo(x0, G + 70); c.lineTo(x1, G + 70); c.stroke();
  for (const lx of lamps) {
    if (!day) { c.save(); c.strokeStyle = "rgba(245,201,106,0.22)"; c.lineWidth = 10; c.beginPath(); for (let y = G + 80; y < G + 420; y += 12) c.lineTo(lx + 60 + 8 * Math.sin(y * 0.08 + live * 3), y); c.stroke(); c.restore(); }
    c.fillStyle = "#1a1f2c"; c.fillRect(lx - 7, G - 520, 14, 520); c.fillRect(lx, G - 520, 60, 10); c.strokeStyle = PAL.ink; c.lineWidth = 3; c.strokeRect(lx - 7, G - 520, 14, 520);
    c.fillStyle = day ? "#d8d2c0" : "#ffe6a8"; c.beginPath(); c.moveTo(lx + 40, G - 510); c.lineTo(lx + 80, G - 510); c.lineTo(lx + 70, G - 488); c.lineTo(lx + 50, G - 488); c.closePath(); c.fill();
    if (!day) { c.save(); c.globalCompositeOperation = "screen"; const gl = c.createRadialGradient(lx + 60, G - 490, 0, lx + 60, G - 490, 260); gl.addColorStop(0, "rgba(255,220,150,0.45)"); gl.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 60, G - 490, 260, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,225,160,0.07)"; c.beginPath(); c.moveTo(lx + 45, G - 488); c.lineTo(lx + 75, G - 488); c.lineTo(lx + 230, G); c.lineTo(lx - 110, G); c.closePath(); c.fill(); c.restore(); }
  }
}
// a parked side-view car (toe of the hood to the right). opts: col, smoke 0..1 (engine trouble), hood (raised)
export function parkedCar(c, x, y, live, { col = "#5a6b8c", smoke = 0, hood = 0, s = 1 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.ellipse(0, 4, 300, 18, 0, 0, TAU); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(-270, -30); c.lineTo(-262, -95); c.lineTo(-130, -105); c.lineTo(-70, -170); c.lineTo(120, -170); c.lineTo(185, -105); c.lineTo(262, -92); c.lineTo(272, -30); c.closePath(); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = "#cfe0ee"; c.beginPath(); c.moveTo(-58, -158); c.lineTo(20, -158); c.lineTo(20, -110); c.lineTo(-110, -110); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(36, -158); c.lineTo(112, -158); c.lineTo(166, -110); c.lineTo(36, -110); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#ffe6a8"; c.fillRect(248, -90, 18, 14); c.fillStyle = "#c0392b"; c.fillRect(-268, -88, 12, 14);
  if (hood > 0) { c.save(); c.translate(185, -105); c.rotate(-0.9 * hood); c.fillStyle = col; c.fillRect(0, -8, 90, 12); c.strokeRect(0, -8, 90, 12); c.restore(); }
  for (const wx of [-160, 160]) { c.fillStyle = "#0c0f18"; c.beginPath(); c.arc(wx, -22, 42, 0, TAU); c.fill(); c.fillStyle = "#8a93a6"; c.beginPath(); c.arc(wx, -22, 16, 0, TAU); c.fill(); }
  if (smoke > 0) for (let i = 0; i < 7; i++) { const ph = (live * 0.5 + i / 7) % 1, sx = 220 + 30 * Math.sin(ph * 6 + i) + ph * 60, sy = -120 - ph * 260, r = 30 + ph * 70;
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(120,120,125,${0.5 * smoke * Math.sin(ph * Math.PI)})`); g.addColorStop(1, "rgba(120,120,125,0)"); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); }
  c.restore();
}
// the BROKE TAX strip pinned to the top of the screen (screen space): Wick's running total vs Dee's
export function brokeHud(c, k, wick, dee, flash = 0) {
  if (k <= 0.001) return;
  c.save(); c.translate(960, lerp(-90, 62, backOut(k)));
  c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.roundRect(-468, -40, 944, 92, 16); c.fill();
  c.fillStyle = "#2d4536"; c.beginPath(); c.roundRect(-472, -46, 944, 92, 16); c.fill(); c.lineWidth = 7; c.strokeStyle = "#6b4a2a"; c.stroke();
  serif(c, "BROKE TAX", -330, 0, 40, GOLD);
  serif(c, "WICK", -90, 0, 34, CREAM); serif(c, "$" + Math.round(wick).toLocaleString("en-US"), 70, 0, 50, flash > 0 ? `rgb(255,${Math.round(178 + 60 * (1 - flash))},${Math.round(27 + 200 * flash)})` : GOLD);
  serif(c, "DEE", 250, 0, 34, CREAM); serif(c, "$" + Math.round(dee), 380, 0, 50, CREAM);
  c.restore();
}
// a tiny person icon (for 100-people grids)
export function personIcon(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 0.62, s * 0.22, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x, y, s * 0.3, s * 0.36, 0, Math.PI, TAU); c.fill(); }
// a tiny house icon; banked houses carry a small $ on the door
export function houseIcon(c, x, y, s, { col = "#c9a45a", dollar = true } = {}) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - s * 0.4, y); c.lineTo(x - s * 0.4, y - s * 0.45); c.lineTo(x, y - s * 0.8); c.lineTo(x + s * 0.4, y - s * 0.45); c.lineTo(x + s * 0.4, y); c.closePath(); c.fill();
  if (dollar) serif(c, "$", x, y - s * 0.25, s * 0.38, "#2d4536");
}
// a semicircle gauge 0..max with the needle at v
export function gauge(c, x, y, r, v, max, { ticks = [0, 100, 200, 300, 400], unit = "%" } = {}) {
  c.save(); c.translate(x, y); c.lineWidth = 12; c.strokeStyle = CREAM; c.beginPath(); c.arc(0, 0, r, Math.PI, TAU); c.stroke();
  c.strokeStyle = RED; c.beginPath(); c.arc(0, 0, r, Math.PI + Math.PI * 0.75, TAU); c.stroke();
  ticks.forEach((tv) => { const a = Math.PI + Math.PI * tv / max; c.lineWidth = 4; c.strokeStyle = CREAM; c.beginPath(); c.moveTo(Math.cos(a) * (r - 22), Math.sin(a) * (r - 22)); c.lineTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); c.stroke(); serif(c, tv + unit, Math.cos(a) * (r + 46), Math.sin(a) * (r + 40), 28, CREAM); });
  const a = Math.PI + Math.PI * clamp(v / max, 0, 1.02); c.lineWidth = 9; c.strokeStyle = GOLD; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * (r - 30), Math.sin(a) * (r - 30)); c.stroke();
  c.fillStyle = GOLD; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill(); c.restore();
}
// a farmer's straw hat: a wide brim around the base of the flame, so the tip always shows
export function strawHat(c, x, y, s, dy = 0) {
  const hy = y + (dy - 1.5) * s; c.save(); c.fillStyle = "#e3c06a"; c.lineWidth = 0.035 * s; c.strokeStyle = PAL.ink;
  c.beginPath(); c.ellipse(x, hy, 0.95 * s, 0.16 * s, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = "#b0442e"; c.beginPath(); c.ellipse(x, hy - 0.03 * s, 0.5 * s, 0.07 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = "rgba(120,80,20,0.45)"; c.lineWidth = 0.015 * s; for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(x + k * 0.13 * s, hy - 0.1 * s); c.lineTo(x + k * 0.15 * s, hy + 0.12 * s); c.stroke(); }
  c.restore();
}
// a takeaway coffee cup
export function coffeeCup(c, x, y, h) { c.save(); c.translate(x, y); c.fillStyle = "#f3ecd6"; c.beginPath(); c.moveTo(-h * 0.3, -h); c.lineTo(h * 0.3, -h); c.lineTo(h * 0.24, 0); c.lineTo(-h * 0.24, 0); c.closePath(); c.fill(); c.lineWidth = Math.max(2, h * 0.05); c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = "#8a5d33"; c.fillRect(-h * 0.29, -h * 0.68, h * 0.58, h * 0.26); c.fillStyle = "#3b2a1c"; c.beginPath(); c.roundRect(-h * 0.34, -h * 1.1, h * 0.68, h * 0.14, h * 0.05); c.fill(); c.restore(); }
// a stack of bills on a desk that "shout": each one shakes and glows a little more than the last
export function shoutingBill(c, x, y, w, live, k, seed) { const q = rng(seed), sh = k * 4 * Math.sin(live * 40 + seed);
  c.save(); c.translate(x + sh, y); c.rotate((q() - 0.5) * 0.2); c.fillStyle = "#f6f1e3"; c.fillRect(-w / 2, -w * 0.64, w, w * 1.28); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-w / 2, -w * 0.64, w, w * 1.28);
  c.fillStyle = "rgba(40,30,20,0.5)"; for (let i = 0; i < 5; i++) c.fillRect(-w * 0.36, -w * 0.45 + i * w * 0.18, w * (0.5 + q() * 0.22), 4);
  c.fillStyle = RED; c.fillRect(-w * 0.36, w * 0.38, w * 0.4, w * 0.14); c.restore(); }
// a checkered farm shawl worn over the wax (never near the face or the flame tip)
export function shawl(c, x, y, s, col = "#2f7a5a", dy = 0) {
  const top = y + (dy - 1.1) * s, bot = y + (dy - 0.55) * s;
  c.save(); c.beginPath(); c.moveTo(x - 0.53 * s, top); c.lineTo(x + 0.53 * s, top); c.lineTo(x + 0.5 * s, bot); c.quadraticCurveTo(x, bot + 0.12 * s, x - 0.5 * s, bot); c.closePath();
  c.fillStyle = col; c.fill(); c.save(); c.clip(); c.fillStyle = "rgba(255,240,200,0.35)"; for (let k = -5; k <= 5; k++) { c.fillRect(x + k * 0.16 * s - 0.03 * s, top, 0.06 * s, bot - top + 0.2 * s); c.fillRect(x - 0.6 * s, top + (k + 5) * 0.1 * s, 1.2 * s, 0.035 * s); } c.restore();
  c.lineWidth = 0.04 * s; c.strokeStyle = PAL.ink; c.stroke(); c.restore();
}
