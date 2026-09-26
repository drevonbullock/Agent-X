// Shared ink-style props for Wick episodes: rai stone, coin, bill, phone, hourglass, canoe, waves.
import { rng, clamp } from "./ease.js";
import { PAL, hatch } from "./ink.js";
const TAU = Math.PI * 2;
// ---------- props ----------
export function stone(c, x, y, r, { tilt = 0.82, cross = 0, glow = 0 } = {}) {
  c.save(); c.translate(x, y);
  c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(r * 0.1, r * 1.02, r * 0.9, r * 0.12, 0, 0, TAU); c.fill();
  const disc = (k) => { k.ellipse(0, 0, r * tilt, r, 0, 0, TAU); };
  c.fillStyle = "#b9b09a"; c.beginPath(); c.ellipse(r * 0.08, 0, r * tilt, r, 0, 0, TAU); c.fill();           // thickness
  c.beginPath(); disc(c); c.fillStyle = "#d8cfb8"; c.fill();
  hatch(c, (k) => { k.ellipse(0, 0, r * tilt, r, 0, 0, TAU); }, { gap: 6, width: 1.2, color: "rgba(80,70,50,0.35)", cx: r * 0.2, cy: r * 0.3, R: r * 1.5, angle: -55 });
  c.fillStyle = "rgba(90,80,60,0.35)"; for (let i = 0; i < 14; i++) { const q = rng(i + 3); c.beginPath(); c.arc((q() - 0.5) * r * tilt * 1.4, (q() - 0.5) * r * 1.6, 2 + q() * 4, 0, TAU); c.fill(); }
  c.beginPath(); disc(c); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.beginPath(); c.ellipse(0, 0, r * tilt * 0.28, r * 0.24, 0, 0, TAU); c.fillStyle = "#3b3326"; c.fill(); c.stroke();   // the hole
  if (cross > 0) {
    c.save(); c.globalAlpha = clamp(cross); c.strokeStyle = "#141216"; c.lineCap = "round"; c.lineWidth = r * 0.12;
    c.beginPath(); c.moveTo(-r * tilt * 0.6, -r * 0.55); c.lineTo(r * tilt * 0.6, r * 0.55); c.moveTo(r * tilt * 0.6, -r * 0.55); c.lineTo(-r * tilt * 0.6, r * 0.55); c.stroke(); c.restore();
  }
  if (glow > 0) { c.save(); c.globalCompositeOperation = "screen"; const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); g.addColorStop(0, `rgba(255,210,120,${0.35 * glow})`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.6, 0, TAU); c.fill(); c.restore(); }
  c.restore();
}
export function coin(c, x, y, r, spin = 0) {
  c.save(); c.translate(x, y); c.scale(Math.max(0.08, Math.abs(Math.cos(spin))), 1);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.lineWidth = 2; c.strokeStyle = "rgba(120,60,0,0.7)"; c.stroke();
  c.font = `900 ${r}px Serif4`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(120,60,0,0.85)"; c.fillText("$", 0, r * 0.05);
  c.restore();
}
export function bill(c, x, y, w, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = "#8fd07e"; c.fillRect(-w / 2, -w * 0.22, w, w * 0.44); c.lineWidth = 3.5; c.strokeStyle = PAL.ink; c.strokeRect(-w / 2, -w * 0.22, w, w * 0.44);
  c.strokeStyle = "rgba(20,70,20,0.8)"; c.lineWidth = 1.5; c.strokeRect(-w / 2 + 10, -w * 0.22 + 8, w - 20, w * 0.44 - 16);
  c.beginPath(); c.ellipse(0, 0, w * 0.1, w * 0.13, 0, 0, TAU); c.stroke();
  c.font = `700 ${w * 0.12}px Serif4`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(20,70,20,0.9)"; c.fillText("20", -w * 0.33, -w * 0.1); c.fillText("20", w * 0.33, w * 0.1);
  c.restore();
}
export function phone(c, x, y, h, text = "$4,812.30") {
  c.save(); c.translate(x, y);
  c.fillStyle = "#1b1d24"; c.beginPath(); c.roundRect(-h * 0.26, -h / 2, h * 0.52, h, h * 0.07); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = "#e9f2ff"; c.beginPath(); c.roundRect(-h * 0.22, -h * 0.44, h * 0.44, h * 0.86, h * 0.04); c.fill();
  c.font = `700 ${h * 0.07}px Fira`; c.textAlign = "center"; c.fillStyle = "#6a7a90"; c.fillText("Balance", 0, -h * 0.12);
  c.font = `900 ${h * 0.085}px Serif4`; c.fillStyle = "#15203a"; c.fillText(text, 0, 0);
  c.restore();
}
export function hourglass(c, x, y, h, t) {
  c.save(); c.translate(x, y);
  const glass = (k) => { k.moveTo(-h * 0.3, -h / 2); k.lineTo(h * 0.3, -h / 2); k.quadraticCurveTo(h * 0.28, -h * 0.1, 0, 0); k.quadraticCurveTo(h * 0.28, h * 0.1, h * 0.3, h / 2); k.lineTo(-h * 0.3, h / 2); k.quadraticCurveTo(-h * 0.28, h * 0.1, 0, 0); k.quadraticCurveTo(-h * 0.28, -h * 0.1, -h * 0.3, -h / 2); k.closePath(); };
  c.beginPath(); glass(c); c.fillStyle = "rgba(220,240,255,0.25)"; c.fill();
  const f = (t * 0.08) % 1;
  c.save(); c.beginPath(); glass(c); c.clip(); c.fillStyle = PAL.gold;
  c.fillRect(-h, -h * 0.02 - h * 0.46 * (1 - f), h * 2, h * 0.46 * (1 - f)); c.fillRect(-h, h / 2 - h * 0.46 * f, h * 2, h); c.fillRect(-2, -h * 0.05, 4, h / 2); c.restore();
  c.beginPath(); glass(c); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = "#7a4e1a"; c.fillRect(-h * 0.38, -h / 2 - h * 0.06, h * 0.76, h * 0.06); c.fillRect(-h * 0.38, h / 2, h * 0.76, h * 0.06);
  c.restore();
}
export function canoe(c, x, y, w, t) {
  c.save(); c.translate(x, y + 6 * Math.sin(t * 1.5)); c.rotate(0.03 * Math.sin(t * 1.2));
  c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, w * 0.18, w / 2, 0); c.lineTo(w * 0.42, -w * 0.05); c.lineTo(-w * 0.42, -w * 0.05); c.closePath();
  c.fillStyle = "#8a5d33"; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.beginPath(); c.moveTo(-w * 0.3, -w * 0.02); c.lineTo(-w * 0.3, -w * 0.2); c.moveTo(w * 0.3, -w * 0.02); c.lineTo(w * 0.3, -w * 0.2); c.moveTo(-w * 0.35, -w * 0.2); c.lineTo(w * 0.35, -w * 0.2); c.lineWidth = 3; c.stroke();
  c.restore();
}
export function waves(c, y, t, col = "rgba(190,230,255,0.35)") {
  c.save(); c.strokeStyle = col; c.lineWidth = 3;
  for (let j = 0; j < 5; j++) { c.beginPath(); for (let x = -40; x <= 1960; x += 24) c.lineTo(x, y + j * 38 + 10 * Math.sin(x * 0.012 + t * 1.3 + j)); c.stroke(); }
  c.restore();
}

