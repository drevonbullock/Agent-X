// N01 rebuilt · cold open + chapter 1 (0 → 111 s). Infographic-first, word-synced builds,
// one continuous camera per canvas, characters always on real ground.
//   OPEN   ocean column → rise to the surface → the village beach (one world)
//   MAP    ink map of the western Pacific + pinned infographic boards (one world)
//   VILLAGE a real island path: pushing the stone, the ownership network, stones today
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, pose, sweat, sparkle, title, label, makeStage, chartLine, drawRing, burst } from "../../lib2d/ink.js";
import { stone, coin, phone, canoe, waves } from "../../lib2d/props.js";

const TAU = Math.PI * 2;
let LIVE = 0;
const zl = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
// camera keyframes: [[t, x, y, z], ...] eased between, zoom in log space
function camKF(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, x0, y0, z0] = keys[i - 1], [b, x1, y1, z1] = keys[i], k = easeInOut((t - a) / (b - a));
    return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), z: zl(z0, z1, k) };
  }
  const L = keys[keys.length - 1]; return { x: L[1], y: L[2], z: L[3] };
}
const pk = (t, t0, dur = 0.45) => backOut(seg(t, t0, t0 + dur));   // pop-in progress
function popAt(c, x, y, k, fn) { if (k <= 0.001) return; c.save(); c.translate(x, y); c.scale(k, k); fn(c); c.restore(); }
function arrowV(c, x, y0, y1, lab, col = "#f3f7fb") {  // dimension arrow with end caps
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.moveTo(x - 18, y0); c.lineTo(x + 18, y0); c.moveTo(x - 18, y1); c.lineTo(x + 18, y1); c.stroke();
  for (const [yy, d] of [[y0, 1], [y1, -1]]) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x - 10, yy + 16 * d); c.lineTo(x + 10, yy + 16 * d); c.closePath(); c.fill(); }
  c.restore();
}
function person(c, x, y, h, dashed = true) {   // a plain human outline for scale
  c.save(); c.translate(x, y); c.strokeStyle = "rgba(243,247,251,0.9)"; c.lineWidth = 4; if (dashed) c.setLineDash([12, 9]);
  const u = h / 8; c.beginPath(); c.arc(0, -7 * u, u, 0, TAU); c.moveTo(0, -6 * u); c.lineTo(0, -3 * u); c.moveTo(-1.6 * u, -5 * u); c.lineTo(0, -5.4 * u); c.lineTo(1.6 * u, -5 * u); c.moveTo(0, -3 * u); c.lineTo(-1.1 * u, 0); c.moveTo(0, -3 * u); c.lineTo(1.1 * u, 0); c.stroke(); c.restore();
}
function checkBubble(c, x, y, k, ch = "✓") {
  popAt(c, x, y, k, (g) => { g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = "#efe9d6"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke();
    g.beginPath(); g.moveTo(-8, 30); g.lineTo(0, 46); g.lineTo(8, 30); g.fill(); g.font = "900 38px Serif4"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ch === "✓" ? "#2f8a45" : "#1b2440"; g.fillText(ch, 0, 3); });
}
function hut(c, x, y, w) {   // thatched house standing on ground y
  c.save(); c.translate(x, y);
  c.fillStyle = "#8a5d33"; c.fillRect(-w * 0.4, -w * 0.45, w * 0.8, w * 0.45); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(-w * 0.4, -w * 0.45, w * 0.8, w * 0.45);
  c.fillStyle = "#3b2512"; c.fillRect(-w * 0.1, -w * 0.3, w * 0.2, w * 0.3);
  const roof = (k) => { k.moveTo(-w * 0.62, -w * 0.4); k.lineTo(0, -w * 0.95); k.lineTo(w * 0.62, -w * 0.4); k.closePath(); };
  c.beginPath(); roof(c); c.fillStyle = "#c9a45a"; c.fill(); hatch(c, roof, { gap: 7, width: 1.4, color: "rgba(90,60,20,0.5)", angle: 70, cx: 0, cy: -w * 0.6, R: w }); c.beginPath(); roof(c); c.stroke();
  c.restore();
}
function palm(c, x, y, h, t, seed = 0) {
  c.save(); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - h / 2, x + 14, y - h); c.lineWidth = 12; c.strokeStyle = "#5a3b20"; c.stroke();
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.5 + 0.05 * Math.sin(t + k + seed); c.beginPath(); c.moveTo(x + 14, y - h); c.quadraticCurveTo(x + 14 + Math.cos(a) * 80, y - h + Math.sin(a) * 80 - 24, x + 14 + Math.cos(a) * 150, y - h + Math.sin(a) * 120 + 36); c.lineWidth = 10; c.strokeStyle = k % 2 ? "#3f7431" : "#4f8a3a"; c.stroke(); }
  c.restore();
}
function lei(c, x, y, s) {   // flower garland resting on the wax rim
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); c.beginPath(); c.arc(x - Math.cos(a) * s * 0.5, y - s * 1.3 + Math.sin(a) * s * 0.16, s * 0.07, 0, TAU); c.fillStyle = ["#e8563a", "#f7c21e", "#f28bb5"][i % 3]; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.ink; c.stroke(); }
}
function card(c, x, y, w, h, fill = "#efe9d6") { c.save(); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x - w / 2 + 10, y - h / 2 + 12, w, h); c.fillStyle = fill; c.fillRect(x - w / 2, y - h / 2, w, h); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(x - w / 2, y - h / 2, w, h); c.beginPath(); c.arc(x, y - h / 2 + 4, 10, 0, TAU); c.fillStyle = "#c0392b"; c.fill(); c.stroke(); c.restore(); }
function serif(c, txt, x, y, size, col = "#1b2440", align = "center") { c.save(); c.font = `900 ${size}px Serif4`; c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(txt, x, y); c.restore(); }

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const words = await (await fetch("films/n01b/words.json")).json();
  const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
  const C = {};
  ["taller", "sank", "nobody", "generations", "not", "spend", "everyone", "strange", "end", "bank", "learn", "yap", "group", "unlike", "giant", "hand", "twelve", "car", "wild", "carved", "palau", "miles", "sailed", "months", "floated", "journey", "hard", "risked", "carry", "changed", "stayed", "knew", "ceremonies", "oldest"].forEach((w) => (C[w] = cue(w)));
  C.pacific = cue("pacific", C.group); C.story = cue("story", C.risked); C.think = cue("think", C.story); C.still = cue("still", C.knew);
  const END = 112.2;
  const P = { navy: paper(W, H, PAL.navy, 11), mustard: paper(W, H, PAL.mustard, 31), green: paper(W, H, PAL.green, 23) };

  // =============== OPEN: ocean column + village beach (one world) ===============
  // surface at y 0; seabed at y 2600; the island shore begins at x 2300
  const SEA = 2600, SHORE = 2300, STONE = [960, SEA - 175];
  const openCam = [[0, 960, -260, 1.0], [C.taller - 0.1, 960, SEA - 380, 1.0], [C.not - 0.2, 900, SEA - 330, 1.14], [C.not + 1.9, 1400, -80, 0.9], [C.spend + 0.2, 3350, -330, 1.0], [C.everyone + 0.3, 3450, -380, 0.82], [C.strange + 0.2, 3350, -430, 0.95], [C.yap - 0.9, 3350, -420, 0.95], [C.yap + 0.1, 3350, -200, 0.4]];
  const VX = [2600, 2880, 3800, 4180, 4560, 0, 0];
  const villagers = Array.from({ length: 7 }, (_, i) => { const q = rng(60 + i); return { x: VX[i], s: 95 + q() * 35, face: ["happy", "curious", "calm", "joy", "proud", "curious", "happy"][i], pose: ["present", "wave", "rest", "cheer", "hips", "chin", "crossed"][i], flip: i > 3, seed: i * 1.7 }; });
  function openArt(c, t) {
    // sky and sun
    const sky = c.createLinearGradient(0, -1400, 0, 0); sky.addColorStop(0, "#f2b98f"); sky.addColorStop(1, "#fbe3bd");
    c.fillStyle = sky; c.fillRect(-2000, -2400, 9000, 2400);
    c.fillStyle = "#fff1c9"; c.beginPath(); c.arc(2600, -900, 110, 0, TAU); c.fill();
    // water column
    const wg = c.createLinearGradient(0, 0, 0, SEA); wg.addColorStop(0, "#2d8aa0"); wg.addColorStop(0.35, "#1c5f73"); wg.addColorStop(1, "#071b28");
    c.fillStyle = wg; c.fillRect(-2000, 0, SHORE + 2000 + 400, SEA + 600);
    c.save(); c.fillStyle = "rgba(191,243,255,0.08)";
    for (const [x0, w] of [[100, 150], [600, 90], [1100, 180], [1600, 90], [2000, 140]]) { const s = 40 * Math.sin(LIVE * 0.6 + x0); c.beginPath(); c.moveTo(x0 + s, 0); c.lineTo(x0 + w + s, 0); c.lineTo(x0 + w * 2.6 - 260, SEA); c.lineTo(x0 - 260, SEA); c.closePath(); c.fill(); }
    c.strokeStyle = "rgba(210,245,255,0.5)"; c.lineWidth = 1.8;
    for (let i = 0; i < 60; i++) { const q = rng(700 + i), x = q() * 2200, y = ((q() * SEA - t * (60 + q() * 90)) % SEA + SEA) % SEA; c.beginPath(); c.arc(x + 9 * Math.sin(LIVE * 2 + i), y, 3 + q() * 10, 0, TAU); c.stroke(); }
    // a school of fish crossing once, never looping
    const fk = seg(t, 1.5, 12), fx0 = lerp(-300, 2300, fk);
    c.fillStyle = "#e0a03a"; for (let i = 0; i < 9; i++) { const q = rng(i + 30), x = fx0 + q() * 260, y = 1500 + q() * 260 + 20 * Math.sin(LIVE * 3 + i); c.beginPath(); c.ellipse(x, y, 22, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x - 36, y - 10); c.lineTo(x - 36, y + 10); c.fill(); }
    // seabed
    c.fillStyle = "#3a3a2c"; c.beginPath(); c.moveTo(-2000, SEA); for (let x = -2000; x <= SHORE + 400; x += 40) c.lineTo(x, SEA + 16 * Math.sin(x * 0.006)); c.lineTo(SHORE + 400, SEA + 800); c.lineTo(-2000, SEA + 800); c.closePath(); c.fill();
    c.lineCap = "round";
    for (let i = 0; i < 26; i++) { const x = -200 + i * 90 + (i % 3) * 20, h = 70 + (i * 37) % 100; c.beginPath(); c.moveTo(x, SEA + 4); c.quadraticCurveTo(x + 20 * Math.sin(LIVE + i), SEA - h / 2, x + 30 * Math.sin(LIVE * 0.8 + i), SEA - h); c.lineWidth = 6; c.strokeStyle = "#4f7a3a"; c.stroke(); }
    // the stone that sank
    stone(c, STONE[0], STONE[1], 170, { glow: 0.3 + 0.7 * seg(t, C.generations, C.generations + 1.5) });
    // "taller than a man": dimension arrows + a man's outline for scale
    const tk = seg(t, C.taller, C.taller + 0.8);
    if (tk > 0) { c.save(); c.globalAlpha = tk; arrowV(c, STONE[0] + 240, SEA - 345, SEA - 5); person(c, STONE[0] - 300, SEA, 250); arrowV(c, STONE[0] - 420, SEA - 250, SEA - 5); c.restore(); }
    // "sank more than a hundred years ago": a timeline draws along the seabed
    const sk = easeOut(seg(t, C.sank, C.sank + 1.2));
    if (sk > 0) { c.save(); c.strokeStyle = "#f3f7fb"; c.lineWidth = 5; c.beginPath(); c.moveTo(560, SEA + 90); c.lineTo(560 + 800 * sk, SEA + 90); c.stroke();
      for (const [f, yr] of [[0, "1900"], [1, "today"]]) if (sk >= f) { c.beginPath(); c.moveTo(560 + 800 * f, SEA + 70); c.lineTo(560 + 800 * f, SEA + 110); c.stroke(); } c.restore(); }
    // "nobody could reach it": a rope from the surface that stops short
    const nk = easeOut(seg(t, C.nobody, C.nobody + 1.0));
    if (nk > 0) { c.save(); c.setLineDash([16, 12]); c.strokeStyle = "#efe9d6"; c.lineWidth = 5; c.beginPath(); c.moveTo(STONE[0] + 60, 1300); c.lineTo(STONE[0] + 60, 1300 + 700 * nk); c.stroke(); c.setLineDash([]);
      if (nk > 0.95) { c.strokeStyle = "#e8563a"; c.lineWidth = 12; const y = 2010; c.beginPath(); c.moveTo(STONE[0] + 30, y - 30); c.lineTo(STONE[0] + 90, y + 30); c.moveTo(STONE[0] + 90, y - 30); c.lineTo(STONE[0] + 30, y + 30); c.stroke(); } c.restore(); }
    // the island: sand shore rising out of the water, huts, palms, the village
    c.fillStyle = "#e8d29a"; c.beginPath(); c.moveTo(SHORE - 200, 80); c.quadraticCurveTo(SHORE, 0, SHORE + 300, 0); c.lineTo(7000, 0); c.lineTo(7000, SEA + 800); c.lineTo(SHORE + 400, SEA + 800); c.lineTo(SHORE + 300, 1200); c.closePath(); c.fill();
    c.fillStyle = "#c9b27a"; c.fillRect(SHORE + 300, 0, 4700, 40); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(SHORE - 200, 80); c.quadraticCurveTo(SHORE, 0, SHORE + 300, 0); c.lineTo(7000, 0); c.stroke();
    waves(c, 6, LIVE, "rgba(255,255,255,0.35)");
    palm(c, 2600, 0, 330, LIVE, 1); palm(c, 4300, 0, 380, LIVE, 2); palm(c, 4600, 0, 300, LIVE, 3);
    hut(c, 3050, 0, 330); hut(c, 3900, 0, 280);
    // the family's doorstep: a dotted outline where their stone would stand
    c.save(); c.setLineDash([14, 10]); c.lineWidth = 5; c.strokeStyle = "rgba(60,40,20,0.8)"; c.beginPath(); c.ellipse(3330, -150, 125, 150, 0, 0, TAU); c.stroke(); c.restore();
    // the rich family + the rest of the village
    const fam = [[3240, 150, "proud", "hips"], [3430, 120, "happy", "present"]];
    fam.forEach(([x, s, f, p], i) => { inkWick(c, x, 0, s, { ...mood(t, [[0, f], [C.spend, "joy"]]), arms: pose(t, [[0, p], [C.spend + i * 0.2, "cheer"], [C.spend + 2, p]]), t: LIVE, seed: i + 9 }); lei(c, x, 0, s); });
    villagers.forEach((v, i) => { if (i > 4) return; const x = v.x, back = i % 2 ? -34 : 0; inkWick(c, x, back, v.s * (back ? 0.82 : 1), { ...mood(t, [[0, v.face], [C.everyone + i * 0.15, "happy"]]), arms: pose(t, [[0, v.pose], [C.everyone + i * 0.15, "present"]]), t: LIVE, seed: v.seed, flip: x > 3330 }); });
    // "they could spend it": goods travel along arrows to the family
    [["fish", 2350, -120], ["basket", 4150, -180], ["canoe", 4450, -60]].forEach(([k, x0, y0], i) => {
      const f = easeInOut(seg(t, C.spend + i * 0.35, C.spend + 1.3 + i * 0.35)); if (f <= 0 || f >= 1) return;
      const x = lerp(x0, 3330, f), y = lerp(y0, -260, f) - 120 * Math.sin(f * Math.PI);
      c.save(); c.translate(x, y); if (k === "fish") { c.fillStyle = "#e0a03a"; c.beginPath(); c.ellipse(0, 0, 40, 16, 0, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); } else if (k === "basket") { c.fillStyle = "#c9a45a"; c.beginPath(); c.ellipse(0, 0, 44, 30, 0, 0, Math.PI); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); } else canoe(c, 0, 0, 120, LIVE); c.restore();
    });
    // "everyone agreed it still counted": a check pops over each villager
    villagers.forEach((v, i) => { if (i > 4) return; const x = v.x; checkBubble(c, x, -v.s * 3.3 + (i % 2 ? -30 : 0), pk(t, C.everyone + 0.25 + i * 0.22)); });
    // "the money in your bank account works exactly like that stone": stone = phone, in the sky
    const ek = pk(t, C.bank);
    popAt(c, 3050, -620, ek, (g) => stone(g, 0, 0, 120));
    popAt(c, 3350, -620, pk(t, C.bank + 0.5), (g) => serif(g, "=", 0, 0, 120, "#1b2440"));
    popAt(c, 3650, -620, pk(t, C.bank + 1.0), (g) => phone(g, 0, 0, 280, "$4,812.30"));
    // "the one thing money can never buy more of": a locked box with a question mark
    popAt(c, 3950, -300 + 6 * Math.sin(LIVE * 5), pk(t, C.learn + 0.8), (g) => { g.fillStyle = "#8a5d33"; g.fillRect(-80, -70, 160, 140); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.strokeRect(-80, -70, 160, 140); serif(g, "?", 0, 4, 100, "#efe9d6"); g.beginPath(); g.arc(0, -84, 26, Math.PI, 0); g.stroke(); g.fillStyle = PAL.gold; g.fillRect(-32, -86, 64, 50); g.strokeRect(-32, -86, 64, 50); });
    // narrator Wick walks in along the beach for the question
    const nx = lerp(4700, 3900, easeOut(seg(t, C.strange - 0.5, C.strange + 2)));
    if (t > C.strange - 0.6) inkWick(c, nx, 0, 170, { ...mood(t, [[0, "curious"], [C.bank, "thinking"], [C.learn + 0.8, "curious", "?"]]), arms: pose(t, [[0, "rest"], [C.strange + 2, "chin"], [C.bank, "point"], [C.learn, "present"]]), t: LIVE, flip: true, walk: t < C.strange + 2 ? t * 1.7 : null, dy: t < C.strange + 2 ? -0.04 * Math.abs(Math.sin(t * 1.7 * Math.PI * 2)) : 0 });
  }
  function openText(c, t) {
    const tk = seg(t, C.taller, C.taller + 0.8);
    if (tk > 0) { label(c, "12 ft", STONE[0] + 300, SEA - 180, 44, "#f3f7fb", "left", tk); label(c, "6 ft", STONE[0] - 480, SEA - 120, 44, "#f3f7fb", "right", tk); }
    const sk = seg(t, C.sank + 0.4, C.sank + 1); if (sk > 0) { label(c, "sank", 560, SEA + 150, 36, "#f3f7fb", "center", sk); label(c, "today", 1360, SEA + 150, 36, "#f3f7fb", "center", sk); title(c, "100+ years", 960, SEA + 60, 52, PAL.gold, "center", sk); }
    if (t > C.nobody + 0.9) label(c, "out of reach", STONE[0] + 130, 2020, 40, "#efe9d6", "left", seg(t, C.nobody + 0.9, C.nobody + 1.3));
    title(c, "Rich for generations", 960, SEA - 470, 64, PAL.gold, "center", seg(t, C.generations + 0.3, C.generations + 0.8));
    title(c, "They could spend it", 3330, -520, 64, "#1b2440", "center", seg(t, C.spend, C.spend + 0.4) * (1 - seg(t, C.everyone + 2, C.everyone + 2.4)));
    // the question writes itself, letter by letter
    const q = "What is money, really?", n = Math.floor(q.length * clamp((t - C.strange - 1.5) / 2.2));
    if (n > 0) title(c, q.slice(0, n), 3350, -880, 90, "#1b2440");
  }

  // =============== MAP: the western Pacific + pinned boards (one world) ===============
  const YAP = [2500, 1150], PALAU = [2150, 1650];
  const land = [[900, 1000, 330, 520, 0.2, "PHILIPPINES"], [2600, 2350, 900, 200, 0, "NEW GUINEA"], [3350, 760, 40, 60, 0, "GUAM"], [1350, 120, 280, 90, -0.4, "JAPAN"], [300, 2100, 380, 300, 0.3, "BORNEO"]];
  const mapCam = [[C.yap - 0.9, 2500, 1150, 3.6], [C.group, 2500, 1150, 2.6], [C.pacific + 0.2, 2150, 1180, 0.62], [C.unlike - 0.2, 2150, 1180, 0.6], [C.giant - 0.3, 3300, 560, 1.05],
    [C.hand - 0.4, 2880, 560, 1.35], [C.twelve + 0.2, 3300, 560, 1.15], [C.car + 0.1, 3760, 560, 1.3], [C.wild + 0.2, 2500, 1150, 1.7], [C.carved + 0.4, 2330, 1400, 1.25],
    [C.floated + 2.2, 2330, 1400, 1.2], [C.journey + 0.3, 1250, 470, 1.05], [C.think - 0.6, 1250, 470, 1.08]];
  function mapArt(c, t) {
    // sea hatch + coastlines + labels
    c.save(); c.strokeStyle = "rgba(70,50,20,0.18)"; c.lineWidth = 1.5; for (let y = -400; y < 2800; y += 36) { c.beginPath(); for (let x = -600; x < 4600; x += 40) c.lineTo(x, y + 6 * Math.sin(x * 0.01 + y)); c.stroke(); } c.restore();
    for (const [x, y, rx, ry, rot] of land) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); for (let a = 0; a <= TAU; a += 0.2) { const r = 1 + 0.12 * Math.sin(a * 5 + x) + 0.07 * Math.sin(a * 11 + y); c.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); } c.closePath(); c.fillStyle = "#c9a45a"; c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); c.restore(); }
    const chains = [[3350, 760, 0, -1, 7, 60], [2750, 1250, 1, 0.1, 9, 110], [1700, 1650, 1, 0.3, 5, 90]];
    for (const [x0, y0, dx, dy, n, step] of chains) for (let i = 0; i < n; i++) { const q = rng(x0 + i); c.beginPath(); c.ellipse(x0 + i * dx * step + q() * 30, y0 + i * dy * step - (dx ? q() * 50 : 0), 10 + q() * 10, 7 + q() * 5, q(), 0, TAU); c.fillStyle = "#c9a45a"; c.fill(); c.lineWidth = 2.5; c.strokeStyle = PAL.ink; c.stroke(); }
    // Yap: a small cluster
    for (const [dx, dy, r] of [[0, 0, 26], [22, 28, 16], [-18, 30, 12], [8, -30, 10]]) { c.beginPath(); c.ellipse(YAP[0] + dx, YAP[1] + dy, r, r * 0.7, 0.5, 0, TAU); c.fillStyle = "#c9a45a"; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); }
    c.strokeStyle = "#f3f7fb"; c.lineWidth = 5; drawRing(c, YAP[0], YAP[1], 80, 70, easeOut(seg(t, C.yap, C.yap + 0.8)));
    const yp = 1 + 0.08 * Math.sin(LIVE * 4); c.beginPath(); c.arc(YAP[0], YAP[1], 110 * yp, 0, TAU); c.lineWidth = 2; c.strokeStyle = "rgba(243,247,251,0.4)"; c.stroke();
    // compass rose
    c.save(); c.translate(3700, 1950); c.rotate(0.05 * Math.sin(LIVE * 0.5)); c.fillStyle = "#1b2440"; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -110); c.lineTo(18, 0); c.lineTo(-18, 0); c.closePath(); c.fill(); } c.restore(); serif(c, "N", 3700, 1810, 44);
    // Palau
    const pk2 = pk(t, C.palau - 0.3);
    popAt(c, PALAU[0], PALAU[1], pk2, (g) => { for (const [dx, dy, r] of [[0, 0, 30], [-26, 30, 14], [24, -26, 12]]) { g.beginPath(); g.ellipse(dx, dy, r, r * 0.6, -0.6, 0, TAU); g.fillStyle = "#c9a45a"; g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.stroke(); } });
    // "no stone like this on Yap": limestone chunk, crossed out, beside Yap
    popAt(c, YAP[0] + 160, YAP[1] - 60, pk(t, C.wild + 0.9), (g) => { g.beginPath(); g.moveTo(-40, 20); g.lineTo(-30, -24); g.lineTo(10, -36); g.lineTo(40, -6); g.lineTo(30, 26); g.closePath(); g.fillStyle = "#d8cfb8"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); g.strokeStyle = "#c0392b"; g.lineWidth = 9; g.beginPath(); g.moveTo(-50, -44); g.lineTo(50, 40); g.moveTo(50, -44); g.lineTo(-50, 40); g.stroke(); });
    // the route: dashed line draws Palau → Yap
    const rk = easeInOut(seg(t, C.miles - 0.4, C.miles + 1.0));
    const route = (f) => [lerp(PALAU[0], YAP[0], f) + 90 * Math.sin(f * Math.PI), lerp(PALAU[1], YAP[1], f)];
    if (rk > 0) { c.save(); c.setLineDash([18, 12]); c.lineWidth = 6; c.strokeStyle = "#1b2440"; c.beginPath(); for (let f = 0; f <= rk; f += 0.02) c.lineTo(...route(f)); c.stroke(); c.restore(); }
    // canoe out (Yap → Palau), months of carving, then the raft home with the stone
    const out = easeInOut(seg(t, C.sailed, C.months - 0.1));
    if (out > 0 && out < 1) { const [x, y] = route(1 - out); canoe(c, x, y, 110, LIVE); }
    const carve = seg(t, C.months, C.floated);
    if (carve > 0 && carve < 1) { for (let i = 0; i < 3; i++) if (((LIVE * 3 + i / 3) % 1) < 0.15) burst(c, PALAU[0] + 50, PALAU[1] - 60, ((LIVE * 3 + i / 3) % 1) / 0.15, { r0: 6, r1: 60, n: 10, color: "rgba(255,240,200,0.9)" }); stone(c, PALAU[0] + 50, PALAU[1] - 60, 38 * carve); }
    const home = easeInOut(seg(t, C.floated, C.floated + 2.6));
    if (home > 0 && home < 1) { const [x, y] = route(home); canoe(c, x, y + 10, 120, LIVE); stone(c, x, y - 40, 36); }
    if (home >= 1) stone(c, YAP[0] - 50, YAP[1] + 70, 26);
    // storm crossing the route while the stone sails home
    const st = seg(t, C.floated + 0.6, C.floated + 2.4);
    if (st > 0 && st < 1) { const [x, y] = route(0.5); c.save(); c.globalAlpha = Math.sin(st * Math.PI); c.fillStyle = "#4a5260"; for (const [dx, r] of [[-40, 50], [10, 64], [60, 46]]) { c.beginPath(); c.arc(x + dx + 80, y - 150, r, 0, TAU); c.fill(); } if (((LIVE * 2) % 1) < 0.3) { c.strokeStyle = "#ffe08a"; c.lineWidth = 7; c.beginPath(); c.moveTo(x + 90, y - 110); c.lineTo(x + 70, y - 60); c.lineTo(x + 100, y - 60); c.lineTo(x + 76, y - 10); c.stroke(); } c.restore(); }
    // ---- pinned board 1: how big is rai? ----
    const bk = seg(t, C.giant - 0.6, C.giant);
    if (bk > 0) {
      card(c, 3300, 560, 1560, 760, "#efe9d6");
      c.save(); c.strokeStyle = "rgba(27,36,64,0.5)"; c.lineWidth = 3; c.beginPath(); c.moveTo(2560, 860); c.lineTo(4040, 860); c.stroke(); c.restore();
      popAt(c, 2880, 800, pk(t, C.hand - 0.6), (g) => { stone(g, 0, 0, 34); g.fillStyle = PAL.ink; g.beginPath(); g.ellipse(-14, 50, 70, 30, 0.1, 0, TAU); g.fill(); });
      popAt(c, 3300, 860, pk(t, C.twelve - 0.4), (g) => { stone(g, 0, -240, 230); person(g, -380, 0, 160, false); });
      const bal = seg(t, C.car + 0.3, C.car + 1.3), tilt = -0.28 * easeOut(bal);
      popAt(c, 3790, 800, pk(t, C.car - 0.3), (g) => { g.save(); g.lineWidth = 6; g.strokeStyle = PAL.ink; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -120); g.stroke(); g.fillStyle = PAL.ink; g.beginPath(); g.moveTo(-40, 60); g.lineTo(40, 60); g.lineTo(0, 20); g.closePath(); g.fill(); g.translate(0, -120); g.rotate(tilt); g.beginPath(); g.moveTo(-190, 0); g.lineTo(190, 0); g.stroke();
        stone(g, -160, -70, 60); g.fillStyle = "#c0392b"; g.beginPath(); g.roundRect(100, -70, 130, 50, 16); g.fill(); g.stroke(); g.fillStyle = PAL.ink; for (const wx of [125, 205]) { g.beginPath(); g.arc(wx, -18, 16, 0, TAU); g.fill(); } g.restore(); });
    }
    // ---- pinned board 2: where value comes from ----
    const eq = seg(t, C.journey - 0.2, C.journey + 0.3);
    if (eq > 0) {
      card(c, 1250, 470, 1500, 520, "#efe9d6");
      popAt(c, 700, 460, pk(t, C.hard), (g) => { g.save(); g.setLineDash([12, 9]); g.lineWidth = 6; g.strokeStyle = "#1b2440"; g.beginPath(); g.moveTo(-90, 50); g.quadraticCurveTo(0, -90, 90, 40); g.stroke(); g.restore(); canoe(g, 0, 30, 90, LIVE); });
      popAt(c, 880, 460, pk(t, C.hard + 0.3), (g) => serif(g, "+", 0, 0, 80));
      popAt(c, 1060, 440, pk(t, C.risked), (g) => { g.fillStyle = "#4a5260"; for (const [dx, r] of [[-40, 44], [10, 58], [60, 40]]) { g.beginPath(); g.arc(dx, -10, r, 0, TAU); g.fill(); } g.strokeStyle = "#e0a03a"; g.lineWidth = 8; g.beginPath(); g.moveTo(10, 30); g.lineTo(-10, 80); g.lineTo(20, 80); g.lineTo(0, 130); g.stroke(); });
      popAt(c, 1240, 460, pk(t, C.risked + 0.3), (g) => serif(g, "+", 0, 0, 80));
      popAt(c, 1420, 450, pk(t, C.story - 0.9), (g) => { g.fillStyle = "#fff"; g.fillRect(-70, -80, 140, 160); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.strokeRect(-70, -80, 140, 160); g.fillStyle = "#c0392b"; g.fillRect(-70, -80, 140, 40); g.strokeRect(-70, -80, 140, 40); serif(g, "months", 0, 30, 30); });
      popAt(c, 1600, 460, pk(t, C.story - 0.4), (g) => serif(g, "=", 0, 0, 90));
      popAt(c, 1820, 440, pk(t, C.story), (g) => { stone(g, 0, 0, 120, { glow: 1 }); });
    }
  }
  function mapText(c, t) {
    if (!((t > C.giant - 0.7 && t < C.wild + 0.2) || t > C.journey - 0.4)) label(c, "YAP", YAP[0], YAP[1] - 110, 56, "#1b2440", "center", seg(t, C.yap + 0.2, C.yap + 0.6));
    const boardUp = (t > C.giant - 0.7 && t < C.wild + 0.2) || t > C.journey - 0.4;
    if (!boardUp) for (const [x, y, , , , n] of land) label(c, n, x, y + 10, 46, "#5a3b20", "center", seg(t, C.pacific - 0.3, C.pacific + 0.3));
    if (!boardUp) title(c, "PACIFIC OCEAN", 3300, 1500, 90, "rgba(90,60,20,0.55)", "center", seg(t, C.pacific, C.pacific + 0.5));
    label(c, "PALAU", PALAU[0] - 20, PALAU[1] + 90, 50, "#1b2440", "center", seg(t, C.palau - 0.2, C.palau + 0.2));
    label(c, "no rock like this here", YAP[0] + 170, YAP[1] + 30, 34, "#8a2f2a", "center", seg(t, C.wild + 1.1, C.wild + 1.5));
    if (t > C.miles) title(c, "≈ 250 miles", 2420, 1420, 60, "#1b2440", "center", seg(t, C.miles + 0.3, C.miles + 0.7));
    const carve = seg(t, C.months, C.floated);
    if (carve > 0 && carve < 1) { const m = 1 + Math.floor(carve * 6); title(c, `month ${m}`, PALAU[0] - 260, PALAU[1] - 120, 54, "#1b2440"); }
    if (t > C.giant - 0.3 && t < C.wild) { title(c, "How big is rai?", 3300, 270, 70, "#1b2440", "center", seg(t, C.giant - 0.3, C.giant + 0.1)); label(c, "fits in a hand", 2880, 920, 38, "#1b2440", "center", seg(t, C.hand - 0.3, C.hand)); label(c, "12 ft across", 3300, 920, 38, "#1b2440", "center", seg(t, C.twelve, C.twelve + 0.3)); label(c, "≈ 4 tons", 3790, 920, 38, "#1b2440", "center", seg(t, C.car, C.car + 0.3)); }
    if (t > C.journey - 0.2) { title(c, "Where the value came from", 1250, 290, 60, "#1b2440", "center", seg(t, C.journey, C.journey + 0.4)); label(c, "far", 700, 600, 36, "#1b2440", "center", seg(t, C.hard, C.hard + 0.3)); label(c, "dangerous", 1060, 600, 36, "#1b2440", "center", seg(t, C.risked, C.risked + 0.3)); label(c, "hard work", 1420, 600, 36, "#1b2440", "center", seg(t, C.story - 0.9, C.story - 0.6)); label(c, "VALUE", 1820, 600, 44, "#8a5d10", "center", seg(t, C.story, C.story + 0.3)); }
  }

  // =============== VILLAGE: ground at y 900 ===============
  const G = 900;
  const vilCam = [[C.think - 0.6, 900, 560, 1.05], [C.carry + 1.5, 1000, 560, 1.12], [C.changed - 0.5, 2600, 520, 0.92], [C.knew + 0.2, 2600, 500, 0.8], [C.still - 0.3, 4300, 560, 1.0], [C.ceremonies + 0.3, 4500, 580, 1.05], [END, 4500, 540, 1.12]];
  const net = Array.from({ length: 8 }, (_, i) => { const q = rng(300 + i); return { x: 1850 + i * 215 + (q() - 0.5) * 50, s: 80 + q() * 40, face: ["curious", "happy", "calm", "proud", "joy", "curious", "happy", "calm"][i], pose: ["rest", "present", "crossed", "hips", "wave", "chin", "rest", "present"][i], seed: i * 2.3 }; });
  function vilArt(c, t) {
    const sky = c.createLinearGradient(0, -400, 0, G); sky.addColorStop(0, "#f2b98f"); sky.addColorStop(1, "#fbe3bd"); c.fillStyle = sky; c.fillRect(-1000, -1000, 8000, G + 1000);
    c.fillStyle = "#fff1c9"; c.beginPath(); c.arc(3600, 120, 110, 0, TAU); c.fill();
    c.fillStyle = "#6f9a4f"; c.beginPath(); c.moveTo(-1000, G - 160); for (let x = -1000; x <= 7000; x += 60) c.lineTo(x, G - 170 - 60 * Math.sin(x * 0.002) - 30 * Math.sin(x * 0.006)); c.lineTo(7000, G); c.lineTo(-1000, G); c.closePath(); c.fill();
    c.fillStyle = "#e8d29a"; c.fillRect(-1000, G, 8000, 800); c.fillStyle = "#c9b27a"; c.fillRect(-1000, G, 8000, 30); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-1000, G); c.lineTo(7000, G); c.stroke();
    palm(c, 300, G, 360, LIVE, 1); palm(c, 1700, G, 300, LIVE, 2); palm(c, 3500, G, 380, LIVE, 3); palm(c, 5400, G, 340, LIVE, 4);
    hut(c, 2300, G, 300);
    // 1) pushing the stone: it will not move
    stone(c, 1120, G - 205, 200);
    const strain = t < C.carry + 1.2;
    inkWick(c, strain ? 830 : 760, G, 190, { ...mood(t, [[0, "determined"], [C.think + 1.2, "grimace", "sweat"], [C.carry + 1.2, "weary"]]), arms: pose(t, [[0, "reach"], [C.carry + 1.2, "shrug"]]), t: LIVE, rot: strain ? 0.16 : 0, sq: strain ? 0.03 * Math.sin(LIVE * 18) : 0, seed: 1 });
    // 2) the ownership network: the stone stays, the record changes
    stone(c, 2800, G - 180, 175);
    const flip = seg(t, C.changed + 0.8, C.changed + 1.3), sx = Math.abs(Math.cos(flip * Math.PI));
    popAt(c, 2800, 330, pk(t, C.changed - 0.6), (g) => { g.save(); g.scale(Math.max(0.05, sx), 1); card(g, 0, 0, 430, 130); serif(g, flip < 0.5 ? "OWNER: FAMILY A" : "OWNER: FAMILY B", 0, 8, 40); g.restore(); });
    if (t > C.changed - 1) { inkWick(c, 2520, G, 150, { ...mood(t, [[0, "happy"]]), arms: pose(t, [[0, "reach"]]), t: LIVE, seed: 4 }); inkWick(c, 3080, G, 150, { ...mood(t, [[0, "curious"], [C.changed + 1.3, "joy"]]), arms: pose(t, [[0, "reach"]]), t: LIVE, flip: true, seed: 5 }); }
    const pin = pk(t, C.stayed);
    popAt(c, 2800, G - 440, pin * (1 + 0.05 * Math.sin(LIVE * 6)), (g) => { g.beginPath(); g.arc(0, -40, 34, Math.PI, 0); g.lineTo(0, 30); g.closePath(); g.fillStyle = "#c0392b"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); g.beginPath(); g.arc(0, -40, 12, 0, TAU); g.fillStyle = "#fff"; g.fill(); });
    // villagers ring the stone; lines tie each to the record; each bubble flips A → B in a wave
    const nk = seg(t, C.knew - 1.2, C.knew);
    net.forEach((v, i) => {
      if (i % 2 === 1 && i !== 5) return;
      const vx = v.x < 2800 ? v.x - 230 : v.x + 230;
      if (nk > 0) { c.save(); c.globalAlpha = 0.5 * nk; c.setLineDash([8, 8]); c.strokeStyle = "#1b2440"; c.lineWidth = 3; c.beginPath(); c.moveTo(vx, G - v.s * 3.4); c.lineTo(2800, 395); c.stroke(); c.restore(); }
      inkWick(c, vx, G, v.s, { ...mood(t, [[0, v.face]]), arms: pose(t, [[0, v.pose]]), t: LIVE, seed: v.seed, flip: vx > 2800 });
      checkBubble(c, vx, G - v.s * 3.4, pk(t, C.knew - 1.2 + i * 0.1), t < C.knew + i * 0.15 ? "A" : "B");
    });
    // 3) today: stones along a path by the meeting house; a ceremony carries one in
    hut(c, 4700, G, 460);
    for (let i = 0; i < 6; i++) { stone(c, 3950 + i * 150 - (i > 2 ? 0 : 0), G - 120 - (i % 2) * 14, 110 - (i % 3) * 14, { tilt: 0.75 }); }
    const walk = seg(t, C.ceremonies - 0.3, C.ceremonies + 3.4), wx = lerp(5900, 4950, easeOut(walk));
    if (walk > 0) {
      c.save(); c.lineWidth = 10; c.strokeStyle = "#5a3b20"; c.beginPath(); c.moveTo(wx - 170, G - 330); c.lineTo(wx + 170, G - 330); c.stroke(); c.restore();
      stone(c, wx, G - 250, 70);
      for (const [dx, s, f, sd] of [[-170, 140, "joy", 11], [170, 140, "happy", 12]]) { inkWick(c, wx + dx, G, s, { face: f, arms: pose(t, [[0, "cheer"]]), t: LIVE, flip: true, seed: sd, walk: walk < 1 ? t * 1.6 + (dx > 0 ? 0.25 : 0) : null, dy: walk < 1 ? -0.035 * Math.abs(Math.sin(t * 1.6 * TAU)) : 0 }); lei(c, wx + dx, G, s); }
    }
  }
  function vilText(c, t) {
    label(c, "≈ 4 tons", 1120, 520, 52, "#1b2440", "center", seg(t, C.think + 0.8, C.think + 1.2) * (1 - seg(t, C.changed - 1, C.changed - 0.6)));
    title(c, "Owned, not moved", 2800, 150, 70, "#1b2440", "center", seg(t, C.stayed + 0.4, C.stayed + 0.8) * (1 - seg(t, C.still - 0.6, C.still - 0.2)));
    title(c, "Everyone simply knew", 2800, 1010, 56, "#1b2440", "center", seg(t, C.knew + 0.2, C.knew + 0.6));
    title(c, "Still used today", 4500, 150, 70, "#1b2440", "center", seg(t, C.still + 0.5, C.still + 0.9));
    const sk = seg(t, C.oldest + 0.4, C.oldest + 0.75);
    if (sk > 0) { c.save(); c.translate(4500, 380); c.rotate(-0.12); const s = lerp(2.2, 1, easeOut(sk)); c.scale(s, s); c.globalAlpha = sk; c.lineWidth = 8; c.strokeStyle = "#c0392b"; c.strokeRect(-260, -60, 520, 120); c.font = "900 64px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#c0392b"; c.fillText("STILL VALID", 0, 4); c.restore(); }
  }

  const scene = {
    open: (t) => ({ bg: P.navy, cam: camKF(openCam, t), art: (c) => openArt(c, t), text: (c) => openText(c, t) }),
    map: (t) => ({ bg: P.mustard, cam: camKF(mapCam, t), art: (c) => mapArt(c, t), text: (c) => mapText(c, t) }),
    vil: (t) => ({ bg: P.navy, cam: camKF(vilCam, t), art: (c) => vilArt(c, t), text: (c) => vilText(c, t),
      over: (c) => { const f = seg(t, END - 1.2, END); if (f > 0) { c.fillStyle = `rgba(8,10,20,${f})`; c.fillRect(0, 0, 1920, 1080); } } }),
  };
  // screen-space depth gauge while we're underwater
  const gauge = (t, sc) => ({ ...sc, over: (c) => { const cam = camKF(openCam, t); const d = clamp(cam.y / (SEA - 380)); const a = clamp(Math.min(cam.y / 300, 1)) * (1 - seg(t, C.not, C.not + 1)); if (a <= 0) return; c.save(); c.globalAlpha = a; c.strokeStyle = "#f3f7fb"; c.fillStyle = "#f3f7fb"; c.lineWidth = 4; c.beginPath(); c.moveTo(90, 160); c.lineTo(90, 920); c.stroke(); for (let i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(90, 160 + i * 76); c.lineTo(i % 5 ? 108 : 124, 160 + i * 76); c.stroke(); } c.beginPath(); c.moveTo(80, 160 + 760 * d); c.lineTo(52, 146 + 760 * d); c.lineTo(52, 174 + 760 * d); c.closePath(); c.fill(); c.font = "500 26px Fira"; c.fillText("surface", 130, 168); c.fillText("seabed", 130, 928); c.restore(); } });

  return {
    duration: END, fps: 30, out,
    renderAt(t) {
      LIVE = t;
      const tMap = C.yap - 0.9, tVil = C.think - 0.6;
      if (t < tMap) stage.frame(gauge(t, scene.open(t)), t);
      else if (t < C.yap + 0.1) stage.mix(scene.open(t), scene.map(t), smooth(seg(t, tMap, C.yap + 0.1)), t);
      else if (t < tVil) stage.frame(scene.map(t), t);
      else if (t < tVil + 0.7) stage.hatchIn(scene.map(t), scene.vil(t), seg(t, tVil, tVil + 0.7), t);
      else stage.frame(scene.vil(t), t);
    },
  };
}
