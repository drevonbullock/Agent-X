// Shared ink-style props for Wick episodes: rai stone, coin, bill, phone, hourglass, canoe, sailship, waves.
import { rng, clamp } from "./ease.js";
import { PAL, hatch } from "./ink.js";
const TAU = Math.PI * 2;
// ---------- props ----------
export function stone(c, x, y, r, { tilt = 0.82, cross = 0, glow = 0, shadow = true } = {}) {
  // stands on the ground: the wheel's bottom (y + r) is the contact point, and the shadow hugs it
  c.save(); c.translate(x, y);
  if (shadow) { c.fillStyle = "rgba(0,0,0,0.28)"; c.beginPath(); c.ellipse(r * 0.12, r * 0.985, r * tilt * 1.15, r * 0.06, 0, 0, TAU); c.fill(); }
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
export function canoe(c, x, y, w, t, { sail = true } = {}) {
  // Micronesian outrigger canoe: bird-tail ends, outrigger float behind, crab-claw sail
  c.save(); c.translate(x, y + 6 * Math.sin(t * 1.5)); c.rotate(0.03 * Math.sin(t * 1.2)); c.lineJoin = "round"; c.lineCap = "round";
  const lw = Math.max(2, w * 0.012);
  // outrigger: float log behind the hull, two booms tying it on
  c.strokeStyle = PAL.ink; c.lineWidth = lw; c.beginPath(); c.moveTo(-w * 0.18, -w * 0.03); c.lineTo(-w * 0.16, -w * 0.11); c.moveTo(w * 0.18, -w * 0.03); c.lineTo(w * 0.16, -w * 0.11); c.stroke();
  c.fillStyle = "#6b4424"; c.beginPath(); c.roundRect(-w * 0.26, -w * 0.13, w * 0.52, w * 0.035, w * 0.02); c.fill(); c.stroke();
  if (sail) {
    const sw = 0.035 * Math.sin(t * 2.1);
    c.save(); c.rotate(sw);
    // mast
    c.strokeStyle = "#5a3b20"; c.lineWidth = lw * 1.6; c.beginPath(); c.moveTo(0, -w * 0.02); c.lineTo(-w * 0.02, -w * 0.5); c.stroke();
    // crab-claw sail: tack at the bow, yard and boom spread up and back, the claw edge curves in
    const A = [w * 0.3, -w * 0.04], T = [-w * 0.16, -w * 0.74], B = [-w * 0.4, -w * 0.2];
    c.beginPath(); c.moveTo(...A); c.quadraticCurveTo(w * 0.02, -w * 0.5, ...T); c.quadraticCurveTo(-w * 0.12 + w * 0.02 * Math.sin(t * 2.4), -w * 0.34, ...B); c.quadraticCurveTo(-w * 0.04, -w * 0.08, ...A); c.closePath();
    c.fillStyle = "#efe3c4"; c.fill();
    c.save(); c.clip(); c.strokeStyle = "rgba(120,90,50,0.35)"; c.lineWidth = Math.max(1, lw * 0.5); for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(...A); c.lineTo(-w * 0.3 + k * w * 0.05, -w * 0.9); c.stroke(); } c.restore();
    c.strokeStyle = PAL.ink; c.lineWidth = lw; c.stroke();
    c.strokeStyle = "#5a3b20"; c.lineWidth = lw * 1.7; c.beginPath(); c.moveTo(...A); c.quadraticCurveTo(w * 0.02, -w * 0.5, ...T); c.moveTo(...A); c.quadraticCurveTo(-w * 0.04, -w * 0.08, ...B); c.stroke();
    c.restore();
  }
  // hull: slim, both ends sweep up into bird-tail points
  c.beginPath(); c.moveTo(-w / 2, -w * 0.09); c.quadraticCurveTo(-w * 0.44, w * 0.05, -w * 0.2, w * 0.06); c.lineTo(w * 0.2, w * 0.06); c.quadraticCurveTo(w * 0.44, w * 0.05, w / 2, -w * 0.09);
  c.lineTo(w * 0.42, -w * 0.02); c.lineTo(-w * 0.42, -w * 0.02); c.closePath();
  c.fillStyle = "#8a5d33"; c.fill(); c.lineWidth = lw * 1.2; c.strokeStyle = PAL.ink; c.stroke();
  c.save(); c.clip(); c.fillStyle = "#b0442e"; c.fillRect(-w / 2, -w * 0.005, w, w * 0.018); c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(-w / 2, w * 0.03, w, w * 0.05); c.restore();
  c.restore();
}
// A three-masted sailing ship, side view, bow to the left. wreck: torn sails, snapped mainmast, a hole in the hull.
export function sailship(c, x, y, w, t, { wreck = false, heel = 0 } = {}) {
  const h = w * 0.24, lw = Math.max(2, w * 0.007);
  c.save(); c.translate(x, y); c.rotate(heel); c.lineJoin = "round"; c.lineCap = "round";
  const deckY = (px) => -h * 0.45 + h * 0.18 * Math.pow(px / (w * 0.5), 2);  // the sheer: low amidships, high at the ends
  const masts = [[-w * 0.26, w * 0.78], [w * 0.02, w * 0.92], [w * 0.28, w * 0.66]];  // [x, height]
  const flap = (k) => Math.sin(t * 2.2 + k) * 0.5 + 0.5;
  // rigging behind the sails: stays from masthead to masthead, bowsprit, stern
  const top = (i) => [masts[i][0], deckY(masts[i][0]) - masts[i][1] * (wreck && i === 1 ? 0.52 : 1)];
  const bow = [-w * 0.72, -h * 1.05];
  c.strokeStyle = "rgba(40,30,20,0.75)"; c.lineWidth = lw * 0.6; c.beginPath();
  c.moveTo(...bow); c.lineTo(...top(0)); c.moveTo(...top(0)); c.lineTo(...top(1)); c.moveTo(...top(1)); c.lineTo(...top(2)); c.moveTo(...top(2)); c.lineTo(w * 0.5, deckY(w * 0.5) - h * 0.3);
  masts.forEach(([mx], i) => { const [tx, ty] = top(i); for (const s of [-1, 1]) { c.moveTo(tx, ty); c.lineTo(mx + s * w * 0.09, deckY(mx + s * w * 0.09)); } });
  c.stroke();
  // masts + yards + square sails
  masts.forEach(([mx, mh], i) => {
    const base = deckY(mx), snapped = wreck && i === 1, H = snapped ? mh * 0.52 : mh;
    c.strokeStyle = "#4a2f18"; c.lineWidth = lw * 2.2; c.beginPath(); c.moveTo(mx, base); c.lineTo(mx, base - H); c.stroke();
    if (snapped) {   // the broken top hangs over the side, still tangled in its rigging
      c.beginPath(); c.moveTo(mx + w * 0.01, base - H); c.lineTo(mx + w * 0.2, base - H * 0.25); c.stroke();
      c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(mx + w * 0.06, base - H * 0.8); c.lineTo(mx + w * 0.16, base - H * 0.42); c.stroke();
      c.fillStyle = "#e6d8b4"; c.beginPath(); c.moveTo(mx + w * 0.02, base - H * 0.92); c.lineTo(mx + w * 0.12, base - H * 0.55); c.lineTo(mx + w * 0.07, base - H * 0.4 + 6 * flap(i)); c.lineTo(mx + w * 0.03, base - H * 0.6); c.closePath(); c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.ink; c.stroke();
      // splinters at the break
      c.strokeStyle = "#4a2f18"; c.lineWidth = lw; c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(mx, base - H); c.lineTo(mx + k * w * 0.006, base - H - w * 0.02 - Math.abs(k) * 2); } c.stroke();
      return;
    }
    const tiers = [0.34, 0.62, 0.86];
    tiers.forEach((f, k) => {
      const yT = base - H * f, yB = base - H * (k === 0 ? 0.1 : tiers[k - 1] + 0.02), half = w * (0.11 - k * 0.022), halfB = half * 1.12;
      c.strokeStyle = "#4a2f18"; c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(mx - half - w * 0.012, yT); c.lineTo(mx + half + w * 0.012, yT); c.stroke();
      const torn = wreck && (k + i) % 2 === 0, billow = w * 0.03 * (0.7 + 0.3 * flap(i * 3 + k));
      c.beginPath(); c.moveTo(mx - half, yT); c.lineTo(mx + half, yT);
      if (torn) {  // ragged: the lower edge is shredded and one corner has let go
        c.lineTo(mx + halfB * 0.7, yB - (yB - yT) * 0.35 + 8 * flap(k));
        for (let j = 0; j <= 6; j++) { const fx = mx + halfB * 0.7 - (j / 6) * halfB * 1.7, fy = yB - (j % 2 ? (yB - yT) * 0.28 : 0) + 6 * flap(j + k); c.lineTo(fx, fy); }
        c.lineTo(mx - halfB, yB - (yB - yT) * 0.1);
      } else { c.lineTo(mx + halfB, yB); c.quadraticCurveTo(mx, yB + billow, mx - halfB, yB); }
      c.closePath(); c.fillStyle = torn ? "#e6d8b4" : "#efe3c4"; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.ink; c.stroke();
      c.save(); c.clip(); c.strokeStyle = "rgba(120,90,50,0.28)"; c.lineWidth = lw * 0.6; for (let sx = mx - half; sx < mx + halfB; sx += w * 0.03) { c.beginPath(); c.moveTo(sx, yT); c.lineTo(sx, yB + billow); c.stroke(); } c.restore();
      if (torn && k === 1) { c.fillStyle = "#f6d2ac";   // sky through the rip
         c.beginPath(); c.ellipse(mx + half * 0.2, (yT + yB) / 2, half * 0.22, (yB - yT) * 0.16, 0.4, 0, TAU); c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = PAL.ink; c.stroke(); }
    });
    // a pennant on the top of each standing mast
    c.fillStyle = "#b0442e"; c.beginPath(); c.moveTo(mx, base - H); c.lineTo(mx + w * 0.06, base - H + w * 0.01 + 4 * Math.sin(t * 5 + i)); c.lineTo(mx, base - H + w * 0.022); c.closePath(); c.fill();
  });
  // bowsprit + jib
  c.strokeStyle = "#4a2f18"; c.lineWidth = lw * 2; c.beginPath(); c.moveTo(-w * 0.48, deckY(-w * 0.48)); c.lineTo(...bow); c.stroke();
  c.beginPath(); c.moveTo(-w * 0.66, -h * 1.0); c.lineTo(masts[0][0] - w * 0.01, deckY(masts[0][0]) - masts[0][1] * 0.74); c.lineTo(masts[0][0] - w * 0.03, deckY(masts[0][0]) - h * 0.2); c.closePath();
  c.fillStyle = wreck ? "#e6d8b4" : "#efe3c4"; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.ink; c.stroke();
  // hull
  const hull = () => { c.beginPath(); c.moveTo(-w * 0.52, deckY(-w * 0.52) - h * 0.1); for (let px = -w * 0.5; px <= w * 0.44; px += w * 0.04) c.lineTo(px, deckY(px)); c.lineTo(w * 0.5, deckY(w * 0.5) - h * 0.3); c.lineTo(w * 0.52, deckY(w * 0.5) - h * 0.28);
    c.quadraticCurveTo(w * 0.5, h * 0.35, w * 0.3, h * 0.55); c.quadraticCurveTo(-w * 0.12, h * 0.72, -w * 0.36, h * 0.3); c.quadraticCurveTo(-w * 0.47, h * 0.05, -w * 0.52, deckY(-w * 0.52) - h * 0.1); c.closePath(); };
  hull(); c.fillStyle = "#6b4424"; c.fill();
  c.save(); hull(); c.clip();
  c.strokeStyle = "rgba(20,12,6,0.45)"; c.lineWidth = lw * 0.7; for (let k = 1; k < 8; k++) { c.beginPath(); for (let px = -w * 0.55; px <= w * 0.55; px += w * 0.05) c.lineTo(px, deckY(px) + k * h * 0.13); c.stroke(); }
  c.fillStyle = "#c9a45a"; c.beginPath(); for (let px = -w * 0.55; px <= w * 0.55; px += w * 0.05) c.lineTo(px, deckY(px) + h * 0.22); for (let px = w * 0.55; px >= -w * 0.55; px -= w * 0.05) c.lineTo(px, deckY(px) + h * 0.34); c.closePath(); c.fill();
  c.fillStyle = "#1c140c"; for (let k = 0; k < 7; k++) { const px = -w * 0.34 + k * w * 0.1; c.fillRect(px - w * 0.012, deckY(px) + h * 0.245, w * 0.024, h * 0.07); }
  if (wreck) {   // the hole the reef tore, planks splintered around it
    c.fillStyle = "#1c140c"; c.beginPath(); const hx = w * 0.12, hy = h * 0.1; c.moveTo(hx - w * 0.07, hy); for (let j = 0; j <= 10; j++) { const a = (j / 10) * TAU, rr = (j % 2 ? 0.55 : 1); c.lineTo(hx + Math.cos(a) * w * 0.07 * rr, hy + Math.sin(a) * h * 0.22 * rr); } c.closePath(); c.fill();
    c.strokeStyle = "#8a5d33"; c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(hx - w * 0.05, hy - h * 0.1); c.lineTo(hx - w * 0.01, hy + h * 0.05); c.moveTo(hx + w * 0.04, hy - h * 0.14); c.lineTo(hx + w * 0.01, hy + h * 0.02); c.stroke();
  }
  c.restore();
  hull(); c.lineWidth = lw * 1.5; c.strokeStyle = PAL.ink; c.stroke();
  // rail + stern window
  c.strokeStyle = "#4a2f18"; c.lineWidth = lw; c.beginPath(); for (let px = -w * 0.5; px <= w * 0.44; px += w * 0.04) c.lineTo(px, deckY(px) - h * 0.1); c.stroke();
  c.fillStyle = "#f2c14e"; c.fillRect(w * 0.44, deckY(w * 0.44) - h * 0.02, w * 0.03, h * 0.08);
  c.restore();
}
export function waves(c, y, t, col = "rgba(190,230,255,0.35)") {
  c.save(); c.strokeStyle = col; c.lineWidth = 3;
  for (let j = 0; j < 5; j++) { c.beginPath(); for (let x = -40; x <= 1960; x += 24) c.lineTo(x, y + j * 38 + 10 * Math.sin(x * 0.012 + t * 1.3 + j)); c.stroke(); }
  c.restore();
}

