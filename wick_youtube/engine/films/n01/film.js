// N01 · The Illusion of Money. Scenes are driven by beats.json (timed off the VO pauses).
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, pose, sweat, sparkle, title, label, kicker, makeStage, chartLine, drawRing, burst } from "../../lib2d/ink.js";

const TAU = Math.PI * 2;
let LIVE = 0;

// ---------- props ----------
function stone(c, x, y, r, { tilt = 0.82, cross = 0, glow = 0 } = {}) {
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
function coin(c, x, y, r, spin = 0) {
  c.save(); c.translate(x, y); c.scale(Math.max(0.08, Math.abs(Math.cos(spin))), 1);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.lineWidth = 2; c.strokeStyle = "rgba(120,60,0,0.7)"; c.stroke();
  c.font = `900 ${r}px Serif4`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(120,60,0,0.85)"; c.fillText("$", 0, r * 0.05);
  c.restore();
}
function bill(c, x, y, w, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = "#8fd07e"; c.fillRect(-w / 2, -w * 0.22, w, w * 0.44); c.lineWidth = 3.5; c.strokeStyle = PAL.ink; c.strokeRect(-w / 2, -w * 0.22, w, w * 0.44);
  c.strokeStyle = "rgba(20,70,20,0.8)"; c.lineWidth = 1.5; c.strokeRect(-w / 2 + 10, -w * 0.22 + 8, w - 20, w * 0.44 - 16);
  c.beginPath(); c.ellipse(0, 0, w * 0.1, w * 0.13, 0, 0, TAU); c.stroke();
  c.font = `700 ${w * 0.12}px Serif4`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(20,70,20,0.9)"; c.fillText("20", -w * 0.33, -w * 0.1); c.fillText("20", w * 0.33, w * 0.1);
  c.restore();
}
function phone(c, x, y, h, text = "$4,812.30") {
  c.save(); c.translate(x, y);
  c.fillStyle = "#1b1d24"; c.beginPath(); c.roundRect(-h * 0.26, -h / 2, h * 0.52, h, h * 0.07); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.fillStyle = "#e9f2ff"; c.beginPath(); c.roundRect(-h * 0.22, -h * 0.44, h * 0.44, h * 0.86, h * 0.04); c.fill();
  c.font = `700 ${h * 0.07}px Fira`; c.textAlign = "center"; c.fillStyle = "#6a7a90"; c.fillText("Balance", 0, -h * 0.12);
  c.font = `900 ${h * 0.085}px Serif4`; c.fillStyle = "#15203a"; c.fillText(text, 0, 0);
  c.restore();
}
function hourglass(c, x, y, h, t) {
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
function canoe(c, x, y, w, t) {
  c.save(); c.translate(x, y + 6 * Math.sin(t * 1.5)); c.rotate(0.03 * Math.sin(t * 1.2));
  c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, w * 0.18, w / 2, 0); c.lineTo(w * 0.42, -w * 0.05); c.lineTo(-w * 0.42, -w * 0.05); c.closePath();
  c.fillStyle = "#8a5d33"; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
  c.beginPath(); c.moveTo(-w * 0.3, -w * 0.02); c.lineTo(-w * 0.3, -w * 0.2); c.moveTo(w * 0.3, -w * 0.02); c.lineTo(w * 0.3, -w * 0.2); c.moveTo(-w * 0.35, -w * 0.2); c.lineTo(w * 0.35, -w * 0.2); c.lineWidth = 3; c.stroke();
  c.restore();
}
function waves(c, y, t, col = "rgba(190,230,255,0.35)") {
  c.save(); c.strokeStyle = col; c.lineWidth = 3;
  for (let j = 0; j < 5; j++) { c.beginPath(); for (let x = -40; x <= 1960; x += 24) c.lineTo(x, y + j * 38 + 10 * Math.sin(x * 0.012 + t * 1.3 + j)); c.stroke(); }
  c.restore();
}

// ---------- backdrops ----------
function oceanBg(c, t) {
  const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, "#1c5f73"); g.addColorStop(1, "#071b28");
  c.fillStyle = g; c.fillRect(-500, -500, 2920, 2080);
  c.save(); c.fillStyle = "rgba(191,243,255,0.09)";
  for (const [x0, w] of [[300, 140], [760, 90], [1250, 170], [1650, 80]]) { const s = 40 * Math.sin(t * 0.6 + x0); c.beginPath(); c.moveTo(x0 + s, -60); c.lineTo(x0 + w + s, -60); c.lineTo(x0 + w * 2.4 - 200, 1140); c.lineTo(x0 - 200, 1140); c.closePath(); c.fill(); }
  c.strokeStyle = "rgba(210,245,255,0.5)"; c.lineWidth = 1.6;
  for (let i = 0; i < 36; i++) { const q = rng(700 + i), x = q() * 1920, y = ((q() * 1400 - t * (40 + q() * 80)) % 1400 + 1400) % 1400 - 100; c.beginPath(); c.arc(x + 8 * Math.sin(t * 2 + i), y, 3 + q() * 9, 0, TAU); c.stroke(); }
  c.fillStyle = "#3a3a2c"; c.beginPath(); c.moveTo(-500, 900); for (let x = -500; x <= 2420; x += 40) c.lineTo(x, 900 + 18 * Math.sin(x * 0.006)); c.lineTo(2420, 1600); c.lineTo(-500, 1600); c.closePath(); c.fill();
  c.strokeStyle = "#4f7a3a"; c.lineWidth = 5; c.lineCap = "round";
  for (let i = 0; i < 22; i++) { const x = 60 + i * 88 + (i % 3) * 20, h = 70 + (i * 37) % 90; c.beginPath(); c.moveTo(x, 905); c.quadraticCurveTo(x + 20 * Math.sin(t + i), 905 - h / 2, x + 30 * Math.sin(t * 0.8 + i), 905 - h); c.stroke(); }
  c.restore();
}
function islandBg(c, t, tone = "day") {
  const g = c.createLinearGradient(0, 0, 0, 1080);
  if (tone === "night") { g.addColorStop(0, "#0e1330"); g.addColorStop(1, "#1f2a52"); } else if (tone === "storm") { g.addColorStop(0, "#1a1d26"); g.addColorStop(1, "#2b3442"); } else { g.addColorStop(0, "#f6d7a8"); g.addColorStop(1, "#8fc6d1"); }
  c.fillStyle = g; c.fillRect(-500, -500, 2920, 2080);
  if (tone === "night") { c.fillStyle = "#fff6e0"; for (let i = 0; i < 120; i++) { const q = rng(40 + i); c.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + i)); c.beginPath(); c.arc(q() * 1920, q() * 620, 0.8 + q() * 1.8, 0, TAU); c.fill(); } c.globalAlpha = 1; }
  if (tone === "day") { c.fillStyle = "#fff1c9"; c.beginPath(); c.arc(1500, 250, 90, 0, TAU); c.fill(); }
  c.fillStyle = tone === "day" ? "#2d8aa0" : "#16304a"; c.fillRect(-500, 640, 2920, 1000);
  waves(c, 660, t, tone === "day" ? "rgba(255,255,255,0.35)" : "rgba(160,200,255,0.25)");
  if (tone !== "storm") {
    c.fillStyle = tone === "day" ? "#e8d29a" : "#3a3a2c"; c.beginPath(); c.ellipse(1450, 655, 420, 50, 0, Math.PI, 0); c.fill();
    c.strokeStyle = PAL.ink; c.lineWidth = 3; c.stroke();
    for (const [px, h] of [[1300, 230], [1420, 280], [1560, 210]]) {
      c.beginPath(); c.moveTo(px, 640); c.quadraticCurveTo(px + 25, 640 - h / 2, px + 10, 640 - h); c.lineWidth = 9; c.strokeStyle = "#5a3b20"; c.stroke();
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55 + 0.05 * Math.sin(t + k); c.beginPath(); c.moveTo(px + 10, 640 - h); c.quadraticCurveTo(px + 10 + Math.cos(a) * 70, 640 - h + Math.sin(a) * 70 - 20, px + 10 + Math.cos(a) * 130, 640 - h + Math.sin(a) * 110 + 30); c.lineWidth = 8; c.strokeStyle = "#3f7431"; c.stroke(); }
    }
  }
}
function groundBg(c, col = "rgba(0,0,0,0.18)") { c.fillStyle = col; c.fillRect(-500, 905, 2920, 700); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(-500, 903, 2920, 4); }

// ---------- the beats ----------
// each: bg (paper key), art(c, lt, d, t), text(c, lt, d), cam(lt, d)
const W = (c, x, y, s, lt, faces, poses, extra = {}) => inkWick(c, x, y, s, { ...mood(lt, faces), arms: pose(lt, poses || [[0, "rest"]]), t: LIVE, ...extra });
const push = (lt, d, z0 = 1, z1 = 1.08, x = 960, y = 540) => ({ x, y, z: lerp(z0, z1, smooth(clamp(lt / d))) });

const B = [
  // COLD OPEN
  { bg: "navy", art: (c, lt) => { oceanBg(c, LIVE); stone(c, 980, 780, 170, { glow: 0.6 }); c.fillStyle = "#e0a03a"; const fx = 700 + ((lt * 60) % 700); c.beginPath(); c.ellipse(fx, 770, 26, 12, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(fx - 24, 770); c.lineTo(fx - 44, 758); c.lineTo(fx - 44, 782); c.fill(); }, text: (c, lt) => title(c, "A fortune nobody could reach", 960, 170, 64, PAL.paperText, "center", seg(lt, 3, 3.4)), cam: (lt, d) => ({ x: 960, y: lerp(300, 620, smooth(clamp(lt / 6))), z: lerp(1.25, 1.02, smooth(clamp(lt / 8))) }), sfx: "whoosh" },
  { bg: "navy", art: (c, lt) => { islandBg(c, LIVE, "day"); canoe(c, 800, 700, 420, LIVE); W(c, 800, 690, 150, lt, [[0, "curious"], [5, "thinking"]], [[0, "reach"], [5, "chin"]], { look: 0.5 }); }, text: (c, lt, d) => title(c, "What is money, really?", 960, 180, 72, PAL.ink === "" ? "" : "#1b2440", "center", seg(lt, d - 4, d - 3.6)), cam: (lt, d) => push(lt, d, 1.0, 1.1, 900, 600) },
  { bg: "navy", art: (c, lt) => { groundBg(c); c.save(); c.globalAlpha = 0.35 * seg(lt, 1, 2); stone(c, 1250, 560, 300); c.restore(); phone(c, 1250, 560, 260, "$4,812.30"); W(c, 620, 905, 220, lt, [[0, "thinking"], [4, "curious", "?"]], [[0, "chin"], [4, "present"]]); }, cam: (lt, d) => push(lt, d) },
  // CH1
  { bg: "mustard", art: (c, lt) => { const k = easeInOut(seg(lt, 0.5, 4)); c.save(); c.translate(960, 540); c.scale(lerp(1, 3, k), lerp(1, 3, k)); c.translate(-960 - 250 * k / 3, -540 + 60 * k / 3);
      c.fillStyle = "#c9a45a"; for (const [x, y, rx, ry] of [[300, 300, 180, 90], [700, 760, 260, 120], [1500, 320, 220, 110], [1300, 800, 160, 70], [1160, 470, 26, 16], [1190, 500, 18, 12], [1140, 505, 12, 9]]) { c.beginPath(); c.ellipse(x, y, rx, ry, 0.3, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); }
      c.strokeStyle = "#f3f7fb"; c.lineWidth = 4; drawRing(c, 1165, 490, 60, 44, easeOut(seg(lt, 3.5, 4.3))); c.restore(); }, text: (c, lt) => title(c, "Yap, western Pacific", 960, 170, 70, PAL.paperText, "center", seg(lt, 4, 4.4)), cam: (lt, d) => push(lt, d, 1, 1.04), sfx: "whoosh" },
  { bg: "navy", art: (c, lt) => { groundBg(c); const sizes = [22, 50, 110, 190]; sizes.forEach((r, i) => { const k = backOut(seg(lt, 0.4 + i * 0.9, 1.0 + i * 0.9)); if (k > 0) stone(c, 260 + i * 330 + (i === 3 ? 80 : 0), 905 - r * k, r * k); }); W(c, 1720, 905, 150, lt, [[0, "curious"], [4, "starstruck", "spark"]], [[0, "rest"], [4, "cheer"]]); }, text: (c, lt) => title(c, "Up to 12 feet across", 960, 170, 70, PAL.paperText, "center", seg(lt, 3.5, 3.9)), cam: (lt, d) => push(lt, d), sfx: "pops4" },
  { bg: "navy", art: (c, lt, d) => { const night = lt < d * 0.55; islandBg(c, LIVE, night ? "night" : "day"); if (night) { canoe(c, 700 + lt * 40, 700, 460, LIVE); for (let i = 0; i < 3; i++) W(c, 560 + lt * 40 + i * 140, 690, 90, lt, [[0, "determined"]], [[0, "reach"]], { seed: i }); } else { stone(c, 900, 520, 170); for (let i = 0; i < 2; i++) W(c, 620 + i * 560, 700, 130, lt, [[0, "determined"]], [[0, "reach"]], { seed: i + 4, flip: i === 1, dy: -0.05 * Math.abs(Math.sin(LIVE * 6 + i)) }); } }, text: (c, lt) => title(c, "Carved 250 miles away", 960, 150, 68, "#1b2440", "center", seg(lt, 1, 1.4)), cam: (lt, d) => push(lt, d, 1.05, 1.12) },
  { bg: "navy", art: (c, lt) => { groundBg(c); stone(c, 960, 520, 250, { glow: 0.5 }); const icons = ["storm", "canoe", "hands", "home"]; for (let i = 0; i < 4; i++) { const k = backOut(seg(lt, 1 + i * 1.2, 1.5 + i * 1.2)); if (k <= 0) continue; const a = -Math.PI / 2 + i * TAU / 4; c.save(); c.translate(960 + Math.cos(a) * 420, 520 + Math.sin(a) * 330); c.scale(k, k); c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fillStyle = "#efe9d6"; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.font = "900 30px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1b2440"; c.fillText(icons[i], 0, 4); c.restore(); } }, text: (c, lt, d) => title(c, "Hard to get = worth more", 960, 1000, 60, PAL.paperText, "center", seg(lt, d - 4, d - 3.6)), cam: (lt, d) => push(lt, d, 1, 1.06) },
  { bg: "green", art: (c, lt) => { groundBg(c); stone(c, 960, 640, 230); const who = lt < 6 ? 0 : 1; W(c, 560, 905, 170, lt, [[0, "happy"], [6, "joy"]], [[0, "present"], [3, "reach"]], { seed: 1 }); W(c, 1360, 905, 170, lt, [[0, "curious"], [6, "proud"]], [[0, "rest"], [3, "reach"]], { flip: true, seed: 2 }); c.save(); c.translate(960, 330); c.beginPath(); c.roundRect(-150, -40, 300, 80, 16); c.fillStyle = "#efe9d6"; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.font = "900 38px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1b2440"; c.fillText(who ? "owner: B" : "owner: A", 0, 2); c.restore(); }, text: (c, lt) => title(c, "Owned, not moved", 960, 170, 72, PAL.paperText, "center", seg(lt, 2, 2.4)), cam: (lt, d) => push(lt, d), sfx: "pop" },
  { bg: "navy", art: (c, lt) => { islandBg(c, LIVE, "day"); for (let i = 0; i < 4; i++) stone(c, 250 + i * 190, 560 - i * 10, 90 - i * 8); stone(c, 820 + lt * 25, 590, 50); W(c, 740 + lt * 25, 700, 110, lt, [[0, "joy"]], [[0, "reach"]], { seed: 1 }); W(c, 900 + lt * 25, 700, 110, lt, [[0, "happy"]], [[0, "reach"]], { seed: 2, flip: true }); }, cam: (lt, d) => push(lt, d, 1, 1.06, 900, 600) },
  // CH2
  { bg: "navy", art: (c, lt) => { islandBg(c, LIVE, "storm"); c.save(); c.strokeStyle = "rgba(200,210,230,0.35)"; c.lineWidth = 2; for (let i = 0; i < 90; i++) { const q = rng(i), x = (q() * 2200 + LIVE * 300) % 2200 - 140, y = (q() * 1100 + LIVE * 900) % 1100; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 18, y + 40); c.stroke(); } c.restore(); const tilt = 0.12 * Math.sin(LIVE * 1.7); c.save(); c.translate(960, 640); c.rotate(tilt); canoe(c, 0, 20, 560, LIVE); stone(c, 0, -120, 150); c.restore(); for (let i = 0; i < 2; i++) W(c, 760 + i * 400, 640, 110, lt, [[0, "alarmed"]], [[0, "cheer"]], { seed: i, rot: tilt }); const fl = (LIVE % 2.3) < 0.12 ? 0.55 : 0; if (fl) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(-500, -500, 2920, 2080); } }, cam: (lt, d) => ({ x: 960 + 8 * Math.sin(LIVE * 13), y: 560, z: 1.05 }), sfx: "thunder" },
  { bg: "navy", art: (c, lt, d) => { if (lt < d * 0.55) { oceanBg(c, LIVE); const k = easeIn(seg(lt, 0.5, d * 0.5)); stone(c, 960, lerp(-200, 760, k), 170); } else { islandBg(c, LIVE, "day"); for (let i = 0; i < 5; i++) W(c, 420 + i * 270, 760, 120, lt, [[0, i < 2 ? "sad" : "curious"]], [[0, i < 2 ? "shrug" : "rest"]], { seed: i }); } }, cam: (lt, d) => push(lt, d), sfx: "splash" },
  { bg: "navy", art: (c, lt) => { groundBg(c); c.save(); c.setLineDash([14, 12]); c.lineWidth = 4; c.strokeStyle = "rgba(240,235,220,0.8)"; c.beginPath(); c.ellipse(1250, 640, 70, 230, 0, 0, TAU); c.stroke(); c.restore(); W(c, 700, 905, 220, lt, [[0, "proud"]], [[0, "hips"]], { crown: true, cape: true }); c.save(); c.beginPath(); c.arc(1600, 280, 150, 0, TAU); c.clip(); oceanBg(c, LIVE); stone(c, 1600, 330, 90); c.restore(); c.beginPath(); c.arc(1600, 280, 150, 0, TAU); c.lineWidth = 8; c.strokeStyle = PAL.ink; c.stroke(); }, cam: (lt, d) => push(lt, d) },
  { bg: "navy", art: () => {}, text: (c, lt) => { title(c, "The agreement", 960, 500, 110, PAL.paperText, "center", seg(lt, 0.2, 0.6)); title(c, "was the money.", 960, 640, 110, PAL.gold, "center", seg(lt, 0.8, 1.2)); }, cam: (lt, d) => push(lt, d, 1, 1.05), sfx: "chime" },
  // CH3
  { bg: "mustard", art: (c, lt) => { groundBg(c, "rgba(60,40,10,0.25)"); c.save(); c.strokeStyle = "#5a3b20"; c.lineWidth = 16; c.beginPath(); c.moveTo(100, 960); c.bezierCurveTo(600, 900, 1200, 1000, 1850, 940); c.stroke(); c.restore(); W(c, 600, 905, 200, lt, [[0, "determined"]], [[0, "point"]]); for (let i = 0; i < 2; i++) W(c, 1200 + i * 260, 905, 170, lt, [[0, "skeptical"]], [[0, "crossed"]], { flip: true, seed: i }); }, text: (c, lt) => title(c, "Around 1900: fix the paths", 960, 170, 64, PAL.paperText, "center", seg(lt, 0.5, 0.9)), cam: (lt, d) => push(lt, d), sfx: "whoosh" },
  { bg: "mustard", art: (c, lt, d) => { groundBg(c, "rgba(60,40,10,0.25)"); for (let i = 0; i < 4; i++) stone(c, 330 + i * 420, 640, 170, { cross: seg(lt, 2 + i * 2.2, 2.4 + i * 2.2) }); W(c, 330 + Math.min(3, Math.floor((lt - 1.5) / 2.2)) * 420 + 200, 905, 140, lt, [[0, "determined"]], [[0, "reach"]], { seed: 5 }); }, text: (c, lt) => title(c, "These belong to us now", 960, 170, 64, PAL.paperText, "center", seg(lt, 9, 9.4)), cam: (lt, d) => push(lt, d), sfx: "slaps" },
  { bg: "mustard", art: (c, lt) => { groundBg(c, "rgba(60,40,10,0.25)"); const k = clamp(lt / 9); c.save(); c.strokeStyle = "#c9a45a"; c.lineWidth = 60; c.lineCap = "round"; c.beginPath(); c.moveTo(100, 950); c.lineTo(100 + 1720 * k, 950); c.stroke(); c.restore(); for (let i = 0; i < 4; i++) W(c, 250 + i * 420 + ((lt * 60) % 80), 905, 140, lt, [[0, "worried"], [5, "determined"]], [[0, "reach"]], { seed: i, dy: -0.06 * Math.abs(Math.sin(LIVE * 7 + i)) }); }, text: (c, lt) => title(c, "Same stone. Same spot.", 960, 170, 64, PAL.paperText, "center", seg(lt, 0.5, 0.9)), cam: (lt, d) => push(lt, d) },
  { bg: "mustard", art: (c, lt) => { groundBg(c, "rgba(60,40,10,0.25)"); for (let i = 0; i < 4; i++) stone(c, 330 + i * 420, 600, 150, { cross: 1 - seg(lt, 0.5 + i * 0.8, 1 + i * 0.8), glow: seg(lt, 0.5 + i * 0.8, 1 + i * 0.8) }); for (let i = 0; i < 4; i++) W(c, 330 + i * 420, 905, 110, lt, [[0, "sad"], [1 + i * 0.8, "joy"]], [[0, "rest"], [1 + i * 0.8, "cheer"]], { seed: i }); }, cam: (lt, d) => push(lt, d), sfx: "chime" },
  { bg: "navy", art: (c, lt) => { stone(c, 620, 540, 220, { cross: 1 }); stone(c, 1300, 540, 220); c.strokeStyle = "#f3f7fb"; c.lineWidth = 6; drawRing(c, 620, 540, 120, 180, easeOut(seg(lt, 1, 1.6))); }, text: (c, lt) => title(c, "Only the story changed.", 960, 950, 80, PAL.paperText, "center", seg(lt, 1.5, 1.9)), cam: (lt, d) => push(lt, d) },
  // CH4
  { bg: "navy", art: (c, lt) => { islandBg(c, LIVE, "day"); c.save(); c.translate(1400, 600); c.rotate(-0.3); c.fillStyle = "#5a3b20"; c.beginPath(); c.moveTo(-200, 0); c.lineTo(200, 0); c.lineTo(160, 70); c.lineTo(-160, 70); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.fillRect(-6, -200, 12, 200); c.restore(); W(c, 700, 760, 170, lt, [[0, "weary"], [5, "curious"], [9, "starstruck", "spark"]], [[0, "rest"], [5, "chin"], [9, "cheer"]], { seed: 3 }); }, text: (c, lt) => title(c, "Captain David O'Keefe", 960, 160, 64, "#1b2440", "center", seg(lt, 2, 2.4)), cam: (lt, d) => push(lt, d, 1, 1.08, 900, 600), sfx: "whoosh" },
  { bg: "navy", art: (c, lt) => { islandBg(c, LIVE, "day"); const x = lerp(2300, 900, easeOut(seg(lt, 0, 6))); c.save(); c.translate(x, 600); c.fillStyle = "#2b2f3a"; c.beginPath(); c.moveTo(-420, 0); c.lineTo(420, 0); c.lineTo(360, 90); c.lineTo(-360, 90); c.closePath(); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = "#8a2f2a"; c.fillRect(150, -150, 70, 150); c.strokeRect(150, -150, 70, 150); c.fillStyle = "rgba(90,90,100,0.5)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(185 + i * 30 + LIVE * 20 % 30, -180 - i * 40, 26 + i * 8, 0, TAU); c.fill(); } for (let i = 0; i < 5; i++) stone(c, -300 + i * 110, -60, 60); c.restore(); W(c, 1650, 760, 140, lt, [[0, "money"]], [[0, "cheer"]], { seed: 4 }); }, cam: (lt, d) => push(lt, d), sfx: "coins" },
  { bg: "mustard", art: (c, lt, d) => { const n = Math.floor(lerp(3, 60, easeIn(clamp(lt / (d * 0.8))))); c.fillStyle = "#c9a45a"; c.beginPath(); c.ellipse(960, 620, 700, 280, 0, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); for (let i = 0; i < n; i++) { const q = rng(90 + i), a = q() * TAU, r = Math.sqrt(q()) ; stone(c, 960 + Math.cos(a) * r * 600, 620 + Math.sin(a) * r * 220, 22); } }, text: (c, lt, d) => { const yr = Math.round(lerp(1840, 1929, easeIn(clamp(lt / (d * 0.8))))); title(c, String(yr), 960, 200, 110, PAL.paperText, "center"); label(c, yr < 1929 ? "stones on Yap" : "13,000+ stones", 960, 280, 40); }, cam: (lt, d) => push(lt, d), sfx: "ticks" },
  { bg: "navy", art: (c, lt) => { groundBg(c); stone(c, 600, 700, 90, { glow: seg(lt, 3, 4) }); stone(c, 1250, 560, 260); const v = 1 - 0.7 * seg(lt, 2, 8); c.fillStyle = "#2a3150"; c.fillRect(760, 120, 400, 40); c.fillStyle = mixV(v); c.fillRect(760, 120, 400 * v, 40); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(760, 120, 400, 40); }, text: (c, lt) => { label(c, "value of each stone", 960, 200, 34); title(c, "Easy money buys less", 960, 1000, 64, PAL.paperText, "center", seg(lt, 6, 6.4)); }, cam: (lt, d) => push(lt, d) },
  { bg: "green", art: (c, lt) => { c.save(); c.strokeStyle = "rgba(200,225,210,0.22)"; c.lineWidth = 1.5; for (let i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(300 + i * 130, 880); c.lineTo(300 + i * 130, 280); c.stroke(); } for (let j = 0; j <= 6; j++) { c.beginPath(); c.moveTo(300, 880 - j * 100); c.lineTo(1600, 880 - j * 100); c.stroke(); } c.restore(); const pts = Array.from({ length: 26 }, (_, i) => [300 + i * 52, 880 - 560 * ((Math.pow(1.87, i / 25) - 1) / 0.87) - 8 * Math.sin(i * 1.3)]); chartLine(c, pts, { width: 12, p: easeInOut(seg(lt, 1, 6)) }); bill(c, 1720, 600, 220 * lerp(1, 0.55, seg(lt, 4, 10)), -0.1); }, text: (c, lt) => { title(c, "Prices since 2000: almost 2x", 960, 170, 64, PAL.paperText, "center", seg(lt, 1, 1.4)); label(c, "2000", 300, 930, 32); label(c, "2025", 1600, 930, 32); }, cam: (lt, d) => push(lt, d), sfx: "whoosh" },
  // TURN — the montage: stone → coin → bill → phone → web of light → hourglass
  { bg: "navy", art: (c, lt, d) => { const st = d / 5, i = Math.min(4, Math.floor(lt / st)), k = backOut(seg(lt - i * st, 0, 0.5)); burst(c, 960, 540, seg(lt - i * st, 0, 1), { r0: 80, r1: 900 }); c.save(); c.translate(960, 540); c.scale(k, k); c.translate(-960, -540);
      if (i === 0) stone(c, 960, 540, 230, { glow: 1 }); else if (i === 1) coin(c, 960, 540, 200, LIVE * 3); else if (i === 2) bill(c, 960, 540, 620, 0.05 * Math.sin(LIVE * 2)); else if (i === 3) phone(c, 960, 540, 520, "$4,812.30"); else { c.save(); c.globalCompositeOperation = "screen"; for (let j = 0; j < 60; j++) { const q = rng(j + 200), a = q() * TAU, r = 120 + q() * 360; c.strokeStyle = `rgba(120,200,255,${0.3 + 0.4 * q()})`; c.lineWidth = 2; c.beginPath(); c.moveTo(960, 540); c.quadraticCurveTo(960 + Math.cos(a + 0.4) * r * 0.6, 540 + Math.sin(a + 0.4) * r * 0.6, 960 + Math.cos(a) * r, 540 + Math.sin(a) * r); c.stroke(); } c.restore(); c.beginPath(); c.arc(960, 540, 160, 0, TAU); c.fillStyle = "#1d4f8a"; c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); }
      c.restore(); }, text: (c, lt, d) => { const st = d / 5, i = Math.min(4, Math.floor(lt / st)); label(c, ["stones", "metal", "paper", "a number on a screen", "a story we all agree on"][i], 960, 960, 44); }, cam: (lt, d) => push(lt, d, 1, 1.1), sfx: "whooshes5" },
  { bg: "navy", art: (c, lt) => { groundBg(c); bill(c, 1250, 480, 380 * backOut(seg(lt, 0.3, 0.8)), -0.05); c.save(); c.globalCompositeOperation = "screen"; const g = c.createRadialGradient(1250, 480, 0, 1250, 480, 300); g.addColorStop(0, "rgba(255,240,200,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(900, 150, 700, 700); c.restore(); W(c, 620, 905, 210, lt, [[0, "skeptical"], [7, "curious"], [12, "alarmed", "!"]], [[0, "reach"], [7, "chin"], [12, "shrug"]]); }, text: (c, lt, d) => title(c, "It works because we trust it", 960, 170, 64, PAL.paperText, "center", seg(lt, 6, 6.4)), cam: (lt, d) => push(lt, d) },
  { bg: "navy", art: (c, lt) => { hourglass(c, 1250, 500, 360 * backOut(seg(lt, 0.3, 0.9)), LIVE); W(c, 620, 905, 210, lt, [[0, "calm"]], [[0, "present"]]); }, text: (c, lt, d) => title(c, "Your time.", 1250, 860, 90, PAL.gold, "center", seg(lt, d - 1.6, d - 1.2)), cam: (lt, d) => push(lt, d, 1, 1.1), sfx: "chime" },
  { bg: "navy", art: (c, lt) => { hourglass(c, 700, 520, 320, LIVE); const k = easeOut(seg(lt, 1, 4)); c.save(); c.translate(1250, 280 + 80 * k); c.fillStyle = "#f5f0e2"; c.beginPath(); c.moveTo(-160, 0); c.lineTo(160, 0); c.lineTo(160, 420 * k); for (let x = 160; x >= -160; x -= 20) c.lineTo(x, 420 * k + (x / 20 % 2 ? 12 : 0)); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.font = "700 34px Fira"; c.textAlign = "center"; c.fillStyle = "#333"; if (k > 0.5) { c.fillText("RECEIPT", 0, 60); c.fillText("1 hour of", 0, 180); c.fillText("your life", 0, 225); } c.restore(); }, text: (c, lt, d) => title(c, "Money is the receipt for your time.", 960, 1000, 60, PAL.paperText, "center", seg(lt, d - 5, d - 4.6)), cam: (lt, d) => push(lt, d) },
  { bg: "navy", art: (c, lt) => { const f = seg(lt, 2, 2.6), sx = Math.cos(f * Math.PI); c.save(); c.translate(960, 520); c.scale(Math.max(0.05, Math.abs(sx)), 1); c.fillStyle = "#efe9d6"; c.beginPath(); c.roundRect(-240, -140, 480, 280, 24); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); c.font = "900 110px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1b2440"; c.fillText(sx > 0 ? "$1,000" : "50 hrs", 0, 6); c.restore(); }, cam: (lt, d) => push(lt, d), sfx: "pop" },
  // PAYOFF
  { bg: "green", art: (c, lt) => { phone(c, 1250, 520, 460, "$1,000"); const k = seg(lt, 3, 6); c.save(); c.translate(1250, 860); c.font = "900 90px Serif4"; c.textAlign = "center"; c.fillStyle = PAL.gold; if (k > 0) c.fillText(`${Math.round(50 * k)} hours`, 0, 0); c.restore(); W(c, 560, 905, 210, lt, [[0, "curious"], [6, "shocked", "!"]], [[0, "present"], [6, "cheer"]]); }, text: (c, lt) => title(c, "$1,000 = 50 hours of your life", 960, 170, 64, PAL.paperText, "center", seg(lt, 6, 6.4)), cam: (lt, d) => push(lt, d), sfx: "ticks" },
  { bg: "green", art: (c, lt) => { groundBg(c); stone(c, 360, 640, 200, { glow: 0.5 }); W(c, 620, 905, 190, lt, [[0, "proud"]], [[0, "hips"]], { seed: 1 }); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(958, 120, 4, 840); W(c, 1400, 905, 190, lt, [[0, "calm"]], [[0, "rest"]], { seed: 2 }); }, text: (c) => { label(c, "Wick A: looks rich", 520, 200, 40); label(c, "Wick B: stays free", 1400, 200, 40); }, cam: (lt, d) => push(lt, d) },
  { bg: "green", art: (c, lt, d) => { const n = Math.min(12, Math.floor(lt / (d / 12))); c.save(); c.translate(1250, 560); c.fillStyle = "rgba(220,240,255,0.25)"; c.beginPath(); c.roundRect(-190, -250, 380, 500, 40); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); for (let i = 0; i < n; i++) hourglass(c, -110 + (i % 3) * 110, 180 - Math.floor(i / 3) * 120, 90, LIVE + i); c.restore(); W(c, 620, 905, 200, lt, [[0, "determined"], [d * 0.6, "happy"]], [[0, "reach"], [d * 0.6, "present"]], { seed: 2 }); }, text: (c, lt, d) => { const n = Math.min(12, Math.floor(lt / (d / 12))); label(c, `${n} month${n === 1 ? "" : "s"} of freedom`, 1250, 900, 40); title(c, "Real wealth = months of freedom", 960, 150, 60, PAL.paperText, "center", seg(lt, d - 5, d - 4.6)); }, cam: (lt, d) => push(lt, d), sfx: "coins" },
  { bg: "green", art: (c, lt) => { groundBg(c); for (let i = 0; i < 6; i++) { const q = rng(i + 50); c.save(); c.translate(300 + q() * 400, 600 + q() * 200); c.rotate(q() - 0.5); c.fillStyle = "#f5f0e2"; c.fillRect(-60, -80, 120, 160); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-60, -80, 120, 160); c.fillStyle = "#c0392b"; c.font = "900 26px Fira"; c.textAlign = "center"; c.fillText("DUE", 0, -30); c.restore(); } W(c, 520, 905, 180, lt, [[0, "weary"]], [[0, "rest"]], { seed: 1 }); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(958, 120, 4, 840); c.save(); c.fillStyle = "rgba(255,236,190,0.35)"; c.beginPath(); c.moveTo(1500, 200); c.lineTo(1900, 200); c.lineTo(1900, 1000); c.lineTo(1300, 1000); c.closePath(); c.fill(); c.restore(); W(c, lerp(1300, 1600, seg(lt, 6, 12)), 905, 180, lt, [[0, "happy"], [6, "joy"]], [[0, "rest"], [6, "wave"]], { seed: 2 }); }, text: (c, lt, d) => title(c, "The choice to say no.", 960, 160, 70, PAL.paperText, "center", seg(lt, d - 6, d - 5.6)), cam: (lt, d) => push(lt, d) },
  // CLOSE
  { bg: "navy", art: (c, lt, d) => { groundBg(c); c.fillStyle = "#8a5d33"; c.fillRect(900, 700, 800, 30); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(900, 700, 800, 30); c.save(); c.translate(1300, 520); c.fillStyle = "#efe9d6"; c.beginPath(); c.roundRect(-300, -120, 600, 240, 20); c.fill(); c.stroke(); c.font = "900 64px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1b2440"; c.fillText(lt < d * 0.5 ? "paycheck ÷ hours" : "= your hour", 0, 4); c.restore(); W(c, 620, 905, 210, lt, [[0, "thinking"], [d * 0.5, "determined"]], [[0, "chin"], [d * 0.5, "point"]]); }, text: (c, lt) => title(c, "Tonight: price it in hours", 960, 170, 64, PAL.paperText, "center", seg(lt, 1, 1.4)), cam: (lt, d) => push(lt, d), sfx: "pop" },
  { bg: "navy", art: (c, lt) => { groundBg(c); for (let i = 0; i < 5; i++) { const f = seg(lt, 0.3 + i * 0.25, 0.6 + i * 0.25); c.save(); c.translate(560 + i * 250, 520); c.scale(Math.max(0.05, Math.abs(Math.cos(f * Math.PI))), 1); c.fillStyle = "#efe9d6"; c.beginPath(); c.roundRect(-90, -60, 180, 120, 12); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.font = "900 44px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#1b2440"; c.fillText(f < 0.5 ? ["$40", "$120", "$9", "$300", "$65"][i] : ["2h", "6h", "½h", "15h", "3h"][i], 0, 4); c.restore(); } W(c, 960, 905, 150, lt, [[0, "wink"]], [[0, "present"]]); }, cam: (lt, d) => push(lt, d), sfx: "pops4" },
  { bg: "navy", art: (c, lt, d) => { if (lt < d * 0.45) { oceanBg(c, LIVE); stone(c, 960, 760, 170, { glow: 0.7 }); } else { islandBg(c, LIVE, "night"); canoe(c, 960, 700, 420, LIVE); W(c, 960, 690, 150, lt, [[0, "calm"]], [[0, "rest"]], { glow: 1.4 }); hourglass(c, 1150, 640, 90, LIVE); } }, text: (c, lt, d) => { title(c, "Spend your time like it's real.", 960, 170, 64, PAL.paperText, "center", seg(lt, d - 8, d - 7.6)); title(c, "Wick's Wisdom", 960, 980, 50, PAL.gold, "center", seg(lt, d - 2, d - 1.6)); }, cam: (lt, d) => lt < d * 0.45 ? push(lt, d * 0.45, 1.05, 1.2) : push(lt - d * 0.45, d * 0.55, 1.2, 1.0, 960, 600), sfx: "chime" },
];
function mixV(v) { return v > 0.6 ? PAL.gold : v > 0.35 ? "#e0a03a" : "#c0392b"; }

export async function create({ W: Wd, H, out }) {
  out.width = Wd; out.height = H;
  const stage = makeStage(out);
  const beats = (await (await fetch("films/n01/beats.json")).json());
  const P = { navy: paper(Wd, H, PAL.navy, 11), green: paper(Wd, H, PAL.green, 23), mustard: paper(Wd, H, PAL.mustard, 31) };
  const T = beats.beats;
  const at = (t) => { let i = 0; while (i + 1 < T.length && t >= T[i + 1].start) i++; return i; };
  const sceneFor = (i, t) => {
    const b = B[i], s = T[i].start, d = (i + 1 < T.length ? T[i + 1].start : beats.duration) - s, lt = t - s;
    return { bg: P[b.bg], cam: b.cam ? b.cam(lt, d) : null, art: (c) => b.art(c, lt, d, t), text: b.text ? (c) => b.text(c, lt, d) : null,
      over: (c) => { const fi = seg(lt, 0, 0.25), fo = seg(lt, d - 0.2, d); const a = Math.max(1 - fi, fo) * 0.55; if (a > 0.01) { c.fillStyle = `rgba(10,12,20,${a})`; c.fillRect(0, 0, 1920, 1080); } } };
  };
  return {
    duration: beats.duration, fps: 30, out,
    renderAt(t) {
      LIVE = t;
      const i = at(t), s = T[i].start;
      if (i > 0 && t - s < 0.5 && B[i].bg !== B[i - 1].bg) stage.hatchIn(sceneFor(i - 1, s - 0.001), sceneFor(i, t), seg(t, s, s + 0.5), t, t);
      else stage.frame(sceneFor(i, t), t, t);
    },
  };
}
