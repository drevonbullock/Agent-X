// Shared scene kit for Wick episodes (from the approved N01 opening): camera keyframes,
// pop-ins, dimension arrows, scale figure, bubbles, huts, palms, leis, pinned cards, islands, type.
import { rng, seg, lerp, clamp, easeInOut, backOut } from "./ease.js";
import { PAL, hatch } from "./ink.js";
const TAU = Math.PI * 2;
const zl = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
// camera keyframes: [[t, x, y, z], ...] eased between, zoom in log space
export function camKF(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, x0, y0, z0] = keys[i - 1], [b, x1, y1, z1] = keys[i], k = easeInOut((t - a) / (b - a));
    return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), z: zl(z0, z1, k) };
  }
  const L = keys[keys.length - 1]; return { x: L[1], y: L[2], z: L[3] };
}
export const pk = (t, t0, dur = 0.45) => backOut(seg(t, t0, t0 + dur));   // pop-in progress
export function popAt(c, x, y, k, fn) { if (k <= 0.001) return; c.save(); c.translate(x, y); c.scale(k, k); fn(c); c.restore(); }
export function arrowV(c, x, y0, y1, lab, col = "#f3f7fb") {  // dimension arrow with end caps
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.moveTo(x - 18, y0); c.lineTo(x + 18, y0); c.moveTo(x - 18, y1); c.lineTo(x + 18, y1); c.stroke();
  for (const [yy, d] of [[y0, 1], [y1, -1]]) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x - 10, yy + 16 * d); c.lineTo(x + 10, yy + 16 * d); c.closePath(); c.fill(); }
  c.restore();
}
export function person(c, x, y, h, dashed = true, col = "rgba(243,247,251,0.9)") {   // a plain human outline for scale
  c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = dashed ? 4 : 7; if (dashed) c.setLineDash([12, 9]);
  const u = h / 8; c.beginPath(); c.arc(0, -7 * u, u, 0, TAU); c.moveTo(0, -6 * u); c.lineTo(0, -3 * u); c.moveTo(-1.6 * u, -5 * u); c.lineTo(0, -5.4 * u); c.lineTo(1.6 * u, -5 * u); c.moveTo(0, -3 * u); c.lineTo(-1.1 * u, 0); c.moveTo(0, -3 * u); c.lineTo(1.1 * u, 0); c.stroke(); c.restore();
}
export function checkBubble(c, x, y, k, ch = "✓") {
  popAt(c, x, y, k, (g) => { g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = "#efe9d6"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke();
    g.beginPath(); g.moveTo(-8, 30); g.lineTo(0, 46); g.lineTo(8, 30); g.fill(); g.font = "900 38px Serif4"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ch === "✓" ? "#2f8a45" : "#1b2440"; g.fillText(ch, 0, 3); });
}
export function hut(c, x, y, w) {   // thatched house standing on ground y
  c.save(); c.translate(x, y);
  c.fillStyle = "#8a5d33"; c.fillRect(-w * 0.4, -w * 0.45, w * 0.8, w * 0.45); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(-w * 0.4, -w * 0.45, w * 0.8, w * 0.45);
  c.fillStyle = "#3b2512"; c.fillRect(-w * 0.1, -w * 0.3, w * 0.2, w * 0.3);
  const roof = (k) => { k.moveTo(-w * 0.62, -w * 0.4); k.lineTo(0, -w * 0.95); k.lineTo(w * 0.62, -w * 0.4); k.closePath(); };
  c.beginPath(); roof(c); c.fillStyle = "#c9a45a"; c.fill(); hatch(c, roof, { gap: 7, width: 1.4, color: "rgba(90,60,20,0.5)", angle: 70, cx: 0, cy: -w * 0.6, R: w }); c.beginPath(); roof(c); c.stroke();
  c.restore();
}
export function palm(c, x, y, h, t, seed = 0) {
  c.save(); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - h / 2, x + 14, y - h); c.lineWidth = 12; c.strokeStyle = "#5a3b20"; c.stroke();
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.5 + 0.05 * Math.sin(t + k + seed); c.beginPath(); c.moveTo(x + 14, y - h); c.quadraticCurveTo(x + 14 + Math.cos(a) * 80, y - h + Math.sin(a) * 80 - 24, x + 14 + Math.cos(a) * 150, y - h + Math.sin(a) * 120 + 36); c.lineWidth = 10; c.strokeStyle = k % 2 ? "#3f7431" : "#4f8a3a"; c.stroke(); }
  c.restore();
}
export function lei(c, x, y, s) {   // flower garland resting on the wax rim
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); c.beginPath(); c.arc(x - Math.cos(a) * s * 0.5, y - s * 1.3 + Math.sin(a) * s * 0.16, s * 0.07, 0, TAU); c.fillStyle = ["#e8563a", "#f7c21e", "#f28bb5"][i % 3]; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.ink; c.stroke(); }
}
export function card(c, x, y, w, h, fill = "#efe9d6") { c.save(); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x - w / 2 + 10, y - h / 2 + 12, w, h); c.fillStyle = fill; c.fillRect(x - w / 2, y - h / 2, w, h); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(x - w / 2, y - h / 2, w, h); c.beginPath(); c.arc(x, y - h / 2 + 4, 10, 0, TAU); c.fillStyle = "#c0392b"; c.fill(); c.stroke(); c.restore(); }
export function island(c, x, y, r, { seed = 1, ex = 1, rot = 0, palms = 0, reef = true } = {}) {
  const q = rng(seed), s1 = q() * 6, s2 = q() * 6, s3 = q() * 6, s4 = q() * 6;
  const shape = (k, f) => { k.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.06) { const rr = r * f * (1 + 0.24 * Math.sin(2 * a + s1) + 0.14 * Math.sin(3 * a + s2) + 0.08 * Math.sin(7 * a + s3) + 0.04 * Math.sin(13 * a + s4)); k.lineTo(Math.cos(a) * rr * ex, Math.sin(a) * rr); } k.closePath(); };
  c.save(); c.translate(x, y); c.rotate(rot);
  if (reef) { shape(c, 1.45); c.fillStyle = "rgba(150,225,235,0.35)"; c.fill(); c.setLineDash([6, 8]); c.lineWidth = Math.max(1.5, r * 0.03); c.strokeStyle = "rgba(235,250,255,0.6)"; c.stroke(); c.setLineDash([]); }
  shape(c, 1.1); c.fillStyle = "#ead7a0"; c.fill(); c.lineWidth = Math.max(2.5, r * 0.035); c.strokeStyle = PAL.ink; c.stroke();
  shape(c, 0.95); c.fillStyle = "#5f9a45"; c.fill();
  hatch(c, (k) => shape(k, 0.95), { gap: Math.max(4, r * 0.06), width: Math.max(1, r * 0.012), color: "rgba(20,60,20,0.35)", cx: r * 0.3, cy: r * 0.3, R: r * 2 });
  for (let i = 0; i < palms; i++) { const a = q() * TAU, d = q() * r * 0.6, px = Math.cos(a) * d * ex, py = Math.sin(a) * d; c.fillStyle = "#2f6b2f"; c.beginPath(); c.arc(px, py, r * 0.07, 0, TAU); c.fill(); c.strokeStyle = "#5a3b20"; c.lineWidth = Math.max(1.5, r * 0.018); c.beginPath(); c.moveTo(px, py); c.lineTo(px + r * 0.02, py + r * 0.1); c.stroke(); }
  c.restore();
}
export function serif(c, txt, x, y, size, col = "#1b2440", align = "center") { c.save(); c.font = `900 ${size}px Serif4`; c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(txt, x, y); c.restore(); }


// ---- costumes that never cover the flame tip ----
// head band (chief): a ring of feathers around the forehead
export function headband(c, x, y, s, dy = 0) {
  const hy = y + (dy - 2.32) * s;
  c.save(); c.lineWidth = 3; c.strokeStyle = PAL.ink;
  for (let i = -3; i <= 3; i++) { if (Math.abs(i) < 1) continue; c.save(); c.translate(x + i * 0.13 * s, hy - 0.02 * s); c.rotate(i * 0.18); c.beginPath(); c.ellipse(0, -0.2 * s, 0.07 * s, 0.22 * s, 0, 0, TAU); c.fillStyle = ["#c0392b", "#f7c21e", "#2f8a45"][(i + 3) % 3]; c.fill(); c.stroke(); c.restore(); }
  c.fillStyle = "#8a2f2a"; c.beginPath(); c.roundRect(x - 0.5 * s, hy - 0.05 * s, s, 0.12 * s, 0.05 * s); c.fill(); c.stroke();
  c.restore();
}
// coat over the lower wax (official = navy with a red sash, captain = dark blue with gold buttons)
export function coat(c, x, y, s, kind = "official", dy = 0) {
  const top = y + (dy - 1.08) * s, bot = y + (dy - 0.5) * s;
  c.save(); c.fillStyle = kind === "captain" ? "#1f2d4a" : kind === "guard" ? "#223257" : "#2b3342";
  c.beginPath(); c.moveTo(x - 0.52 * s, top); c.lineTo(x + 0.52 * s, top); c.lineTo(x + 0.53 * s, bot); c.quadraticCurveTo(x, bot + 0.09 * s, x - 0.53 * s, bot); c.closePath(); c.fill();
  c.lineWidth = 0.045 * s; c.strokeStyle = PAL.ink; c.stroke();
  if (kind === "official") { c.strokeStyle = "#c0392b"; c.lineWidth = 0.1 * s; c.beginPath(); c.moveTo(x - 0.45 * s, top + 0.04 * s); c.lineTo(x + 0.45 * s, bot - 0.05 * s); c.stroke(); }
  if (kind === "guard") {   // night-guard uniform: silver badge, shoulder patch, buttons
    c.fillStyle = "#cfd6de"; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.045 : 0.1) * s; c.lineTo(x - 0.24 * s + Math.cos(a) * r, top + 0.22 * s + Math.sin(a) * r); } c.closePath(); c.fill(); c.lineWidth = 0.02 * s; c.strokeStyle = PAL.ink; c.stroke();
    c.fillStyle = "#c9a45a"; c.beginPath(); c.roundRect(x + 0.32 * s, top + 0.06 * s, 0.14 * s, 0.1 * s, 0.02 * s); c.fill(); c.stroke();
    c.fillStyle = "#cfd6de"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 0.06 * s, top + (0.13 + i * 0.15) * s, 0.03 * s, 0, TAU); c.fill(); }
  } else { c.fillStyle = "#f7c21e"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + (kind === "captain" ? 0 : -0.25 * s), top + (0.12 + i * 0.16) * s, 0.04 * s, 0, TAU); c.fill(); } }
  c.restore();
}
// a knitted scarf at the wax rim, tail hanging down one side (Dee's red scarf)
export function scarf(c, x, y, s, col = "#c0392b", dy = 0, t = 0) {
  const ry = y + (dy - 1.12) * s, sway = 0.03 * Math.sin(t * 2.2);
  c.save(); c.fillStyle = col; c.lineWidth = 0.035 * s; c.strokeStyle = PAL.ink;
  c.beginPath(); c.roundRect(x - 0.56 * s, ry - 0.07 * s, 1.12 * s, 0.16 * s, 0.07 * s); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(x + 0.22 * s, ry + 0.05 * s); c.lineTo(x + 0.4 * s, ry + 0.05 * s); c.lineTo(x + (0.44 + sway) * s, ry + 0.52 * s); c.lineTo(x + (0.26 + sway) * s, ry + 0.52 * s); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 0.015 * s; for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(x + k * 0.12 * s, ry - 0.06 * s); c.lineTo(x + k * 0.12 * s, ry + 0.08 * s); c.stroke(); }
  c.fillStyle = col; for (let k = 0; k < 4; k++) c.fillRect(x + (0.27 + k * 0.045 + sway) * s, ry + 0.52 * s, 0.02 * s, 0.08 * s);
  c.restore();
}
// smooth camera: one continuous path through the keys (monotone cubic per axis, zoom in log space). It only comes to
// rest at the first and last key and where a key repeats (a hold), so it glides through every move instead of
// stopping at each key the way camKF's per-segment easing does. Use this for new episodes.
export function camSmooth(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  const L = keys[keys.length - 1]; if (t >= L[0]) return { x: L[1], y: L[2], z: L[3] };
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const T = keys.map((k) => k[0]), n = keys.length;
  const axis = (vals) => {
    const d = [], m = new Array(n).fill(0);
    for (let j = 0; j < n - 1; j++) d.push((vals[j + 1] - vals[j]) / Math.max(1e-6, T[j + 1] - T[j]));
    for (let j = 1; j < n - 1; j++) { if (d[j - 1] * d[j] <= 0) continue; const h0 = T[j] - T[j - 1], h1 = T[j + 1] - T[j]; m[j] = 3 * (h0 + h1) / ((2 * h1 + h0) / d[j - 1] + (h1 + 2 * h0) / d[j]); }
    const h = T[i + 1] - T[i], s = (t - T[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vals[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * vals[i + 1] + (s3 - s2) * h * m[i + 1];
  };
  return { x: axis(keys.map((k) => k[1])), y: axis(keys.map((k) => k[2])), z: Math.exp(axis(keys.map((k) => Math.log(k[3])))) };
}
