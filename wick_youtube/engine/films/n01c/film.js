// N01 · chapters 2 → close (111.6 s → 420.5 s), in the approved n01b format:
// infographic builds on the narrator's words, one continuous camera per canvas,
// everyone on real ground, labels never on top of objects. Times are absolute.
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, pose, sweat, sparkle, title, label, makeStage, chartLine, drawRing, burst } from "../../lib2d/ink.js";
import { stone, coin, bill, phone, hourglass, canoe, sailship, waves } from "../../lib2d/props.js";
import { camKF, pk, popAt, arrowV, person, checkBubble, hut, palm, lei, card, island, serif, headband, coat } from "../../lib2d/scene.js";

const TAU = Math.PI * 2;
let LIVE = 0;
const G = 900;                      // the ground line in every ground scene
const W1 = (c, x, s, t, faces, poses, o = {}) => inkWick(c, x, o.y ?? G, s, { ...mood(t, faces), arms: pose(t, poses), t: LIVE, ...o });
const walkO = (t, t0, t1, speed = 1.7) => (t > t0 && t < t1 ? { walk: t * speed, dy: -0.035 * Math.abs(Math.sin(t * speed * TAU)) } : {});

// ---------- backdrops ----------
function daySky(c, top = -1600, bottom = G, warm = true) {
  const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, warm ? "#f2b98f" : "#9cc9e0"); g.addColorStop(1, warm ? "#fbe3bd" : "#e6f2f5");
  c.fillStyle = g; c.fillRect(-3000, top - 2000, 14000, bottom - top + 2000);
}
function beachGround(c, x0 = -3000, x1 = 11000) {
  c.fillStyle = "#e8d29a"; c.fillRect(x0, G, x1 - x0, 1600); c.fillStyle = "#c9b27a"; c.fillRect(x0, G, x1 - x0, 30);
  c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(x0, G); c.lineTo(x1, G); c.stroke();
}
function hills(c, col = "#6f9a4f") { c.fillStyle = col; c.beginPath(); c.moveTo(-3000, G - 150); for (let x = -3000; x <= 11000; x += 60) c.lineTo(x, G - 165 - 60 * Math.sin(x * 0.002) - 30 * Math.sin(x * 0.006)); c.lineTo(11000, G); c.lineTo(-3000, G); c.closePath(); c.fill(); }
function floorRoom(c, wall = "#e9dcc2", floor = "#b98a5a") {
  c.fillStyle = wall; c.fillRect(-3000, -2000, 14000, G + 2000);
  c.save(); c.strokeStyle = "rgba(120,90,50,0.18)"; c.lineWidth = 2; for (let x = -3000; x < 11000; x += 90) { c.beginPath(); c.moveTo(x, -2000); c.lineTo(x, G); c.stroke(); } c.restore();
  c.fillStyle = floor; c.fillRect(-3000, G, 14000, 1600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-3000, G); c.lineTo(11000, G); c.stroke();
}
function oceanSide(c, t, stormK = 0) {     // side view: sky, sea surface at y 0, seabed at 2600
  const sky = c.createLinearGradient(0, -1400, 0, 0); sky.addColorStop(0, stormK > 0.5 ? "#2b303c" : "#f2b98f"); sky.addColorStop(1, stormK > 0.5 ? "#4a5260" : "#fbe3bd");
  c.fillStyle = sky; c.fillRect(-3000, -3000, 14000, 3000);
  const wg = c.createLinearGradient(0, 0, 0, 2600); wg.addColorStop(0, "#2d8aa0"); wg.addColorStop(0.35, "#1c5f73"); wg.addColorStop(1, "#071b28");
  c.fillStyle = wg; c.fillRect(-3000, 0, 14000, 3400);
  c.save(); c.fillStyle = "rgba(191,243,255,0.07)"; for (const [x0, w] of [[0, 150], [500, 90], [1000, 180], [1500, 90]]) { const s = 40 * Math.sin(LIVE * 0.6 + x0); c.beginPath(); c.moveTo(x0 + s, 0); c.lineTo(x0 + w + s, 0); c.lineTo(x0 + w * 2.6 - 260, 2600); c.lineTo(x0 - 260, 2600); c.closePath(); c.fill(); } c.restore();
  c.fillStyle = "#3a3a2c"; c.beginPath(); c.moveTo(-3000, 2600); for (let x = -3000; x <= 11000; x += 40) c.lineTo(x, 2600 + 16 * Math.sin(x * 0.006)); c.lineTo(11000, 3400); c.lineTo(-3000, 3400); c.closePath(); c.fill();
  // the surface, choppier in the storm
  c.save(); c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 4;
  for (let j = 0; j < 4; j++) { c.beginPath(); for (let x = -3000; x <= 11000; x += 30) c.lineTo(x, j * 30 + (8 + 30 * stormK) * Math.sin(x * 0.01 + LIVE * (1.3 + stormK * 2) + j)); c.stroke(); }
  c.restore();
}
function bigTitle(c, txt, x, y, size, col, k) { title(c, txt, x, y, size, col, "center", k); }

// small brand watermark, bottom-right, every frame
export function watermark(out, t) {
  const g = out.getContext("2d"), k = out.width / 1920;
  g.save(); g.scale(k, k); g.globalAlpha = 0.55; g.font = "900 26px Serif4"; g.textAlign = "right"; g.textBaseline = "alphabetic";
  g.fillStyle = "rgba(0,0,0,0.5)"; g.fillText("Wick's Wisdom", 1882, 1052); g.fillStyle = "#fff6e0"; g.fillText("Wick's Wisdom", 1880, 1050); g.restore();
}

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const P = { navy: paper(W, H, PAL.navy, 11), green: paper(W, H, PAL.green, 23), ocean: paper(W, H, "#2b6f98", 41), mustard: paper(W, H, PAL.mustard, 31) };
  const T0 = 111.6, END = 420.5;

  // =================== CH2 · the stone at the bottom of the sea (111.6 → 152.8) ===================
  // one side-view world: the family's hut on the shore (x 3000+), the raft at sea (x ~900), the seabed below
  const ch2Cam = [[111.6, 3450, -330, 1.0], [114.0, 3450, -330, 1.05], [115.6, 1000, -260, 0.95], [119.2, 1000, -240, 1.0], [123.2, 1000, -200, 1.05], [124.0, 1000, 400, 1.0], [126.0, 1000, 2250, 1.0], [127.6, 1000, 2280, 1.02], [129.2, 3550, -330, 0.9], [133.2, 3550, -330, 0.9], [133.9, 3300, -1150, 1.0], [141.8, 3300, -1150, 1.0], [142.4, 4800, -1150, 1.0], [146.8, 4800, -1150, 1.0], [147.6, 4800, -2080, 1.0], [152.8, 4800, -2080, 1.03]];
  function ch2Art(c, t) {
    const storm = seg(t, 119.2, 120.2) * (1 - seg(t, 126.5, 128));
    oceanSide(c, t, storm);
    // rain + lightning during the storm
    if (storm > 0) { c.save(); c.globalAlpha = storm; c.strokeStyle = "rgba(210,220,240,0.5)"; c.lineWidth = 2; for (let i = 0; i < 160; i++) { const q = rng(i), x = -600 + (q() * 3200 + LIVE * 280) % 3200, y = -1400 + (q() * 1500 + LIVE * 900) % 1500; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 16, y + 40); c.stroke(); } c.restore();
      if (((LIVE * 1.3) % 1) < 0.07) { c.fillStyle = "rgba(255,255,255,0.45)"; c.fillRect(-3000, -3000, 9000, 3000); } }
    // shore + village on the right
    c.fillStyle = "#e8d29a"; c.beginPath(); c.moveTo(2100, 90); c.quadraticCurveTo(2300, 0, 2600, 0); c.lineTo(11000, 0); c.lineTo(11000, 3400); c.lineTo(2700, 3400); c.lineTo(2600, 1100); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(2100, 90); c.quadraticCurveTo(2300, 0, 2600, 0); c.lineTo(11000, 0); c.stroke();
    // in this world the shore's ground is y 0; draw village items relative to y 0
    palm(c, 2750, 0, 320, LIVE, 1); hut(c, 3200, 0, 320); palm(c, 5400, 0, 330, LIVE, 2); hut(c, 5000, 0, 260);
    c.save(); c.setLineDash([14, 10]); c.lineWidth = 5; c.strokeStyle = "rgba(60,40,20,0.8)"; c.beginPath(); c.ellipse(3500, -150, 125, 150, 0, 0, TAU); c.stroke(); c.restore();
    // the family at home (start and end of the chapter)
    const fam = (x, s, f, p, sd) => inkWick(c, x, 0, s, { ...mood(t, f), arms: pose(t, p), t: LIVE, seed: sd });
    fam(3380, 150, [[0, "proud"], [141.5, "joy"]], [[0, "hips"]], 1); fam(3630, 120, [[0, "happy"]], [[0, "present"]], 2); lei(c, 3380, 0, 150);
    // generations ago: the ancestor's raft, calm then storm; the rope snaps; the stone sinks
    const tilt = storm * 0.14 * Math.sin(LIVE * 2.1), bob = (8 + 30 * storm) * Math.sin(LIVE * 1.6);
    c.save(); c.translate(1000, bob); c.rotate(tilt);
    canoe(c, 0, -10, 620, LIVE);
    const cutK = seg(t, 122.8, 123.4), slide = easeIn(seg(t, 123.2, 124.2));
    if (t < 124.2) stone(c, lerp(0, 330, slide), lerp(-180, -40, slide), 150, { shadow: false });
    if (cutK < 1) { c.strokeStyle = "#5a3b20"; c.lineWidth = 5; c.beginPath(); c.moveTo(-200, -40); c.lineTo(-40, -250); c.stroke(); }
    if (cutK > 0 && cutK < 1) burst(c, -120, -140, cutK, { r0: 6, r1: 90, n: 14, color: "rgba(255,240,200,0.9)" });
    inkWick(c, -250, -40, 110, { ...mood(t, [[0, "determined"], [119.5, "alarmed", "!"], [122.8, "grimace"]]), arms: pose(t, [[0, "reach"], [119.5, "cheer"]]), t: LIVE, seed: 3 });
    inkWick(c, 250, -40, 110, { ...mood(t, [[0, "calm"], [119.5, "shocked"]]), arms: pose(t, [[0, "rest"], [119.5, "cheer"]]), t: LIVE, seed: 4, flip: true });
    c.restore();
    if (t >= 124.2) { const f = easeIn(seg(t, 124.2, 126.2)); stone(c, 1330, lerp(60, 2600 - 150, f), 150, { shadow: f > 0.98 }); if (f > 0.97) burst(c, 1330, 2560, seg(t, 126.2, 127.2), { r0: 60, r1: 380, n: 24, color: "rgba(200,200,170,0.6)" }); }
    // ---- the telling: the crew tell the village; the village decides ----
    const tellK = pk(t, 129.4) * (1 - seg(t, 133.2, 133.5));
    popAt(c, 3060, -560, tellK, (g) => { g.beginPath(); g.ellipse(0, 0, 230, 150, 0, 0, TAU); g.fillStyle = "#efe9d6"; g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); g.beginPath(); g.moveTo(-40, 140); g.lineTo(-90, 210); g.lineTo(20, 145); g.fill(); g.stroke();
      g.fillStyle = "#2d8aa0"; g.fillRect(-170, -20, 340, 120); g.strokeRect(-170, -20, 340, 120); stone(g, 0, lerp(-40, 60, (LIVE * 0.6) % 1), 40, { shadow: false }); canoe(g, 0, -40, 160, LIVE); });
    if (t > 127.5 && t < 134) { inkWick(c, 2850, 0, 120, { ...mood(t, [[0, "sad"]]), arms: pose(t, [[0, "present"]]), t: LIVE, seed: 5 }); }
    const vote = seg(t, 132.3, 133.3);
    if (t > 129.0) [[3930, 105, "curious", 0], [4210, 90, "calm", -26]].forEach(([x0, s, f, back], i) => { const x = lerp(x0 + 500, x0, easeOut(seg(t, 129.0, 131.4))); inkWick(c, x, back, s, { ...(t < 131.4 ? { walk: t * 1.7, dy: -0.035 * Math.abs(Math.sin(t * 1.7 * TAU)) } : {}), ...mood(t, [[0, f], [132.4 + i * 0.15, "happy"]]), arms: pose(t, [[0, "rest"], [132.4 + i * 0.15, "cheer"]]), t: LIVE, flip: true, seed: 6 + i }); checkBubble(c, x, back - s * 3.5, pk(t, 132.5 + i * 0.18)); });
    // ---- the record, pinned in the sky: the stone still counts ----
    const rk = seg(t, 133.4, 133.9);
    if (rk > 0) { c.save(); c.translate(0, -900); card(c, 3300, -300, 900, 470);
      [["Size: 12 ft", 135.0], ["Its story: known", 136.7], ["Owner: the family", 138.6]].forEach(([txt, tt], i) => { popAt(c, 3000, -390 + i * 110, pk(t, tt), (g) => { serif(g, txt, 20, 0, 44, "#1b2440", "left"); }); popAt(c, 2960, -390 + i * 110, pk(t, tt + 0.2), (g) => { g.strokeStyle = "#2f8a45"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-4, 16); g.lineTo(22, -16); g.stroke(); }); });
      popAt(c, 3560, -140, pk(t, 134.1), (g) => { g.strokeStyle = "#1b2440"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.stroke(); stone(g, 0, 0, 34, { shadow: false }); }); c.restore(); }
    // ---- richest on the island: a bar chart where the family's bar is a dotted outline ----
    const bk = seg(t, 141.8, 142.3);
    if (bk > 0) { c.save(); c.translate(0, -900); card(c, 4800, -300, 1100, 520);
      [[0.35, "#8a5d33"], [0.5, "#8a5d33"], [0.95, null], [0.42, "#8a5d33"], [0.3, "#8a5d33"]].forEach(([h, col], i) => { const k = easeOut(seg(t, 142.1 + i * 0.12, 142.8 + i * 0.12)), x = 4430 + i * 185, hh = 340 * h * k;
        if (col) { c.fillStyle = col; c.fillRect(x - 55, -110 - hh, 110, hh); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(x - 55, -110 - hh, 110, hh); }
        else { c.save(); c.setLineDash([12, 9]); c.lineWidth = 5; c.strokeStyle = "#c08a10"; c.strokeRect(x - 55, -110 - hh, 110, hh); c.restore(); } });
      c.strokeStyle = PAL.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(4330, -110); c.lineTo(5270, -110); c.stroke();
      // nobody could see, touch or move it
      [["see", 145.3], ["touch", 145.6], ["move", 146.4]].forEach(([w, tt], i) => popAt(c, 4600 + i * 200, 30, pk(t, tt), (g) => { g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.fillStyle = "#efe9d6"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); serif(g, w, 0, 2, 26); g.strokeStyle = "#c0392b"; g.lineWidth = 7; g.beginPath(); g.moveTo(-36, -36); g.lineTo(36, 36); g.stroke(); })); c.restore(); }
  }
  function ch2Text(c, t) {
    bigTitle(c, "Generations ago", 1000, -640, 64, "#1b2440", seg(t, 115.4, 115.8) * (1 - seg(t, 119, 119.4)));
    bigTitle(c, "A storm hit", 1000, -640, 72, "#f3f7fb", seg(t, 119.6, 120) * (1 - seg(t, 123.4, 123.8)));
    bigTitle(c, "It still counted", 3300, -1600, 70, "#1b2440", seg(t, 133.8, 134.2) * (1 - seg(t, 141.8, 142.2)));
    bigTitle(c, "The richest family", 4800, -1600, 64, "#1b2440", seg(t, 142.3, 142.7) * (1 - seg(t, 145, 145.3)));
    label(c, "their fortune", 4800, -960, 34, "#8a5d10", "center", seg(t, 143.5, 143.9));
    bigTitle(c, "The stone didn't need to be there.", 4800, -2180, 70, "#1b2440", seg(t, 149.2, 149.6));
    bigTitle(c, "The agreement did.", 4800, -2020, 96, "#b0700c", seg(t, 151.4, 151.8));
  }

  // =================== CH3 · the black crosses (152.8 → 201.8) ===================
  // an island village path; a pinned map of Yap above it for the "Germany" and "paths" beats
  const ch3Cam = [[152.8, 1000, -500, 0.9], [158.4, 1000, -500, 0.95], [161.0, 1000, 540, 1.0], [165.4, 2700, 540, 0.95], [176.5, 2700, 540, 1.0], [177.0, 2700, 540, 1.0], [181.4, 1000, -500, 0.95], [185.6, 2700, 540, 0.95], [190.8, 2700, 540, 1.0], [191.2, 4600, 300, 1.0], [201.8, 4600, 300, 1.03]];
  const stones3 = [[2150, 110, 1], [2470, 150, 1], [2780, 90, 0], [3060, 170, 1], [3380, 120, 0]];   // x, r, marked?
  function ch3Art(c, t) {
    daySky(c, -1600, G); hills(c); beachGround(c);
    palm(c, 400, G, 340, LIVE, 1); palm(c, 3700, G, 320, LIVE, 2); hut(c, 1650, G, 300);
    // the Yap map card up in the sky (Germany + the paths)
    const mk = seg(t, 152.8, 153.4) * (1 - seg(t, 185.6, 186.2) * 0);
    if (mk > 0) { c.save(); c.translate(0, -300); card(c, 1000, -200, 1300, 760, "#2b6f98");
      island(c, 1000, -180, 230, { seed: 7, ex: 0.62, rot: 0.5, palms: 10 });
      // the paths network across the island; broken bits until they're repaired
      const fix = easeInOut(seg(t, 182.0, 185.0));
      const path = [[830, -420], [900, -300], [980, -220], [1060, -120], [1120, 0], [1160, 90]];
      c.save(); c.lineWidth = 7; c.lineCap = "round"; c.setLineDash([16, 10]); c.strokeStyle = "#8a5d33"; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.restore();
      if (t > 160.2 && fix < 1) [[900, -300], [1060, -120]].forEach(([x, y], i) => popAt(c, x, y, pk(t, 160.3 + i * 0.2) * (1 - fix), (g) => { g.strokeStyle = "#c0392b"; g.lineWidth = 8; g.beginPath(); g.moveTo(-22, -22); g.lineTo(22, 22); g.moveTo(22, -22); g.lineTo(-22, 22); g.stroke(); }));
      if (fix > 0) { c.save(); c.lineWidth = 12; c.lineCap = "round"; c.strokeStyle = "#f3e2b0"; c.beginPath(); const n = Math.max(1, Math.floor(fix * (path.length - 1) * 10)); for (let i = 0; i <= n; i++) { const f = i / ((path.length - 1) * 10), seg0 = Math.min(path.length - 2, Math.floor(f * (path.length - 1))), lf = f * (path.length - 1) - seg0; const x = lerp(path[seg0][0], path[seg0 + 1][0], lf), y = lerp(path[seg0][1], path[seg0 + 1][1], lf); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore(); }
      // German flag planted
      popAt(c, 1150, -330, pk(t, 156.6), (g) => { g.strokeStyle = PAL.ink; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -120); g.stroke(); ["#1a1a1a", "#f3f7fb", "#c0392b"].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, -120 + i * 26, 110, 26); }); g.strokeRect(0, -120, 110, 78); });
      c.restore();
    }
    // the officials and the chiefs on the path
    const off = (x, s, f, p, o = {}) => { W1(c, x, s, t, f, p, o); coat(c, x, G, s, "official", o.dy || 0); };
    if (t < 176.6) {
      off(700, 170, [[0, "determined"], [164.6, "proud", "spark"]], [[0, "point"], [164.6, "chin"]], { seed: 1 });
      [[1150, 160, 2], [1420, 140, 3]].forEach(([x, s, sd]) => { W1(c, x, s, t, [[0, "skeptical"], [161.8, "calm"]], [[0, "crossed"]], { flip: true, seed: sd }); headband(c, x, G, s); });
    }
    // the stones along the path: nothing taken; crosses on the most valuable
    stones3.forEach(([x, r, marked], i) => { const tc = 171.1 + i * 0.5, wash = seg(t, 187.4 + i * 0.3, 187.9 + i * 0.3);
      stone(c, x, G - r, r, { cross: marked ? seg(t, tc, tc + 0.3) * (1 - wash) : 0, glow: marked ? wash * (1 - seg(t, 190, 191)) : 0 });
      if (marked && t > 174.8 && t < 187.4 + i * 0.3) popAt(c, x + r * 0.7, G - r * 2 - 20, pk(t, 175.0 + i * 0.12), (g) => { g.fillStyle = "#efe9d6"; g.fillRect(-60, -24, 120, 48); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.strokeRect(-60, -24, 120, 48); serif(g, "GOVT", 0, 2, 28, "#8a2f2a"); }); });
    // the painter walks the row with a bucket
    if (t > 167.5 && t < 176.6) { const k = seg(t, 167.6, 174.4), px = lerp(1900, 3250, k); off(px, 150, [[0, "determined"]], [[0, "reach"]], { seed: 7, ...walkO(t, 167.6, 174.4) }); c.fillStyle = "#555a66"; c.fillRect(px + 90, G - 110, 60, 70); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(px + 90, G - 110, 60, 70); }
    // the families: wealth gauges drop, then rise
    const poorK = seg(t, 180.6, 181.2), richK = seg(t, 189.6, 190.2);
    if (t > 176.6 && t < 191) [[1950, 150], [3620, 140]].forEach(([x, s], i) => {
      W1(c, x, s, t, [[0, "calm"], [180.6, "sad"], [182.0, "determined"], [189.6, "joy"]], [[0, "rest"], [182.0, "reach"], [189.6, "cheer"]], { seed: 10 + i, flip: i === 1, ...(t > 182 && t < 185 ? walkO(t, 182, 185) : {}) });
      const v = 0.85 - 0.7 * poorK + 0.7 * richK; const gx = x, gy = G - s * 3.9;
      c.save(); c.translate(gx, gy); c.beginPath(); c.arc(0, 0, 60, Math.PI, 0); c.fillStyle = "#efe9d6"; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
      [["#c0392b", Math.PI, Math.PI * 1.33], ["#f7c21e", Math.PI * 1.33, Math.PI * 1.66], ["#2f8a45", Math.PI * 1.66, TAU]].forEach(([col, a0, a1]) => { c.beginPath(); c.arc(0, 0, 50, a0, a1); c.lineWidth = 12; c.strokeStyle = col; c.stroke(); });
      const a = Math.PI + Math.PI * clamp(v); c.strokeStyle = PAL.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); c.stroke(); c.restore(); });
    // washing the crosses off
    if (t > 186.4 && t < 191) { const k = seg(t, 186.6, 189.4), px = lerp(3300, 2100, k); off(px, 150, [[0, "calm"]], [[0, "reach"]], { seed: 8, flip: true, ...walkO(t, 186.6, 189.4) }); for (let i = 0; i < 6; i++) { const q = rng(i + Math.floor(LIVE * 6)); c.fillStyle = "rgba(170,225,245,0.8)"; c.beginPath(); c.arc(px - 140 + q() * 60, G - 200 + q() * 80, 6 + q() * 8, 0, TAU); c.fill(); } }
    // the ledger: nothing moved, nothing added, only the story changed; felt-wealth line dips and recovers
    const lk = seg(t, 191.0, 191.4);
    if (lk > 0) { card(c, 4600, 300, 1300, 760);
      [["Stones moved", "0", 192.2], ["Stones added", "0", 194.2], ["Story changed", "1", 196.4]].forEach(([a, b, tt], i) => { popAt(c, 4050, 80 + i * 100, pk(t, tt - 0.4), (g) => serif(g, a, 0, 0, 44, "#1b2440", "left")); popAt(c, 5000, 80 + i * 100, pk(t, tt), (g) => serif(g, b, 0, 0, 56, i === 2 ? "#b0700c" : "#1b2440")); });
      const gk = easeInOut(seg(t, 197.8, 201.2));
      if (gk > 0) { const pts = Array.from({ length: 30 }, (_, i) => { const f = i / 29; return [4050 + f * 1100, 600 - 150 * (f < 0.5 ? 1 - f * 2 : (f - 0.5) * 2) - 40]; }); chartLine(c, pts, { width: 10, p: gk, arrow: true }); }
    }
  }
  function ch3Text(c, t) {
    bigTitle(c, "c. 1900: Germany takes control", 1000, -940, 60, "#1b2440", seg(t, 156.6, 157) * (1 - seg(t, 160.6, 161)));
    label(c, "broken paths", 1260, -550, 36, "#fff6e0", "left", seg(t, 160.4, 160.8) * (1 - seg(t, 160.9, 161.2)));
    bigTitle(c, "The chiefs ignored them", 1000, 150, 64, "#1b2440", seg(t, 161.8, 162.2) * (1 - seg(t, 164.4, 164.8)));
    bigTitle(c, "Stones taken: 0", 2700, 150, 64, "#1b2440", seg(t, 166.3, 166.7) * (1 - seg(t, 170.6, 171)));
    bigTitle(c, "Painted: \"these belong to us now\"", 2700, 150, 56, "#1b2440", seg(t, 171.2, 171.6) * (1 - seg(t, 176.4, 176.8)));
    bigTitle(c, "Same stone. Same spot.", 2700, 150, 64, "#1b2440", seg(t, 177.8, 178.2) * (1 - seg(t, 181.2, 181.6)));
    bigTitle(c, "Paths repaired: end to end", 1000, -940, 60, "#1b2440", seg(t, 182.2, 182.6) * (1 - seg(t, 185.6, 186)));
    bigTitle(c, "Crosses washed off", 2700, 150, 64, "#1b2440", seg(t, 187.5, 187.9) * (1 - seg(t, 190.6, 191)));
    label(c, "how rich they felt", 4600, 700, 34, "#1b2440", "center", seg(t, 198, 198.4));
    bigTitle(c, "Only the story changed.", 4600, -140, 70, "#1b2440", seg(t, 196.4, 196.8));
  }

  // =================== CH4 · the stranger with a steamship (201.8 → 265.4) ===================
  // beach world: the wreck on the reef, the trade; then the ocean map (routes, counters); then the green board
  const ch4BeachCam = [[201.8, 1150, 540, 0.9], [210.2, 1600, 540, 1.0], [213.8, 1600, 540, 1.0]];
  function ch4Beach(c, t) {
    // side view with a real horizon: sky, an even band of sea, the wreck out on the reef, one level beach in front
    const HZ = G - 280, WL = G - 90, WX = 600;
    daySky(c, -1600, HZ);
    const sea = c.createLinearGradient(0, HZ, 0, G); sea.addColorStop(0, "#1f6f8a"); sea.addColorStop(1, "#46a9b8");
    const ripples = (y0, y1) => { c.save(); c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 2.5; for (let y = HZ + 24, j = 0; y < G - 8; y += 34, j++) { if (y < y0 || y >= y1) continue; c.beginPath(); for (let x = -600; x <= 3600; x += 30) c.lineTo(x, y + (2 + j * 0.8) * Math.sin(x * 0.012 + LIVE * 1.2 + j * 1.7)); c.stroke(); } c.restore(); };
    c.fillStyle = sea; c.fillRect(-3000, HZ, 14000, G - HZ); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-3000, HZ); c.lineTo(11000, HZ); c.stroke();
    ripples(0, WL);
    // gulls over the wreck
    c.save(); c.strokeStyle = PAL.ink; c.lineWidth = 3.5; c.lineCap = "round"; for (let i = 0; i < 3; i++) { const gx = 700 + i * 260 + 60 * Math.sin(LIVE * 0.4 + i * 2), gy = 180 + i * 60 + 20 * Math.sin(LIVE * 0.7 + i), fl = 14 * Math.sin(LIVE * 6 + i * 1.3); c.beginPath(); c.moveTo(gx - 26, gy - fl); c.quadraticCurveTo(gx - 10, gy - 14, gx, gy); c.quadraticCurveTo(gx + 10, gy - 14, gx + 26, gy - fl); c.stroke(); } c.restore();
    // the wreck: a three-master run aground on the reef, heeling toward the shore
    sailship(c, WX, WL - 22, 620, LIVE, { wreck: true, heel: 0.1 + 0.012 * Math.sin(LIVE * 0.9) });
    c.fillStyle = sea; c.fillRect(-3000, WL, 14000, G - WL);   // the near water hides her keel (same gradient, no seam)
    // reef rocks and the surf breaking on them; a bigger wave on "shipwrecked"
    c.fillStyle = "#3a3a2c"; for (const [rx, rw, rh] of [[WX - 330, 70, 34], [WX - 250, 46, 22], [WX + 300, 80, 30], [WX + 380, 40, 18]]) { c.beginPath(); c.moveTo(rx - rw, WL + 6); c.lineTo(rx - rw * 0.4, WL - rh); c.lineTo(rx + rw * 0.2, WL - rh * 0.6); c.lineTo(rx + rw, WL + 6); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); }
    c.save(); c.fillStyle = "rgba(255,255,255,0.85)"; for (let i = 0; i < 9; i++) { const ph = (LIVE * 0.8 + i * 0.37) % 1, fx = WX - 360 + i * 90, r = 10 + 18 * Math.sin(ph * Math.PI); c.globalAlpha = 0.8 * Math.sin(ph * Math.PI); c.beginPath(); c.ellipse(fx, WL + 4, r * 1.8, r * 0.45, 0, Math.PI, TAU); c.fill(); } c.restore();
    const crash = seg(t, 207.1, 208.1); if (crash > 0 && crash < 1) burst(c, WX - 200, WL, crash, { r0: 20, r1: 240, n: 18, color: "rgba(255,255,255,0.9)" });
    ripples(WL, G);
    // the beach: one level line, wet sand at the edge, foam sliding up and back
    c.fillStyle = "#e8d29a"; c.fillRect(-3000, G, 14000, 1600); c.fillStyle = "#cdb47c"; c.fillRect(-3000, G, 14000, 26);
    const reach = 5 * Math.sin(LIVE * 1.1);
    c.save(); c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.moveTo(-3000, G - 8 + reach); for (let x = -3000; x <= 11000; x += 40) c.lineTo(x, G + 4 + reach + 4 * Math.sin(x * 0.03 + LIVE * 2)); c.lineTo(11000, G - 8 + reach); c.closePath(); c.fill(); c.restore();
    c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-3000, G); c.lineTo(11000, G); c.stroke();
    // what washed up with him: a barrel and a plank
    c.save(); c.translate(820, G - 44); c.rotate(-0.2); c.fillStyle = "#8a5d33"; c.beginPath(); c.roundRect(-34, -44, 68, 88, 18); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.lineWidth = 5; c.strokeStyle = "#3a3a2c"; c.beginPath(); c.moveTo(-34, -22); c.lineTo(34, -22); c.moveTo(-34, 22); c.lineTo(34, 22); c.stroke(); c.restore();
    c.save(); c.translate(640, G - 10); c.rotate(0.06); c.fillStyle = "#a07444"; c.fillRect(-90, -10, 180, 20); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-90, -10, 180, 20); c.restore();
    palm(c, 2350, G, 330, LIVE, 1); hut(c, 2650, G, 300);
    const cx = lerp(1000, 1250, easeOut(seg(t, 202.6, 205.5)));
    // his footprints up from the water's edge
    c.fillStyle = "rgba(120,90,50,0.45)"; for (let fx = 930, j = 0; fx < cx - 50; fx += 48, j++) { c.beginPath(); c.ellipse(fx, G + 14 + (j % 2) * 12, 12, 5, 0, 0, TAU); c.fill(); }
    W1(c, cx, 170, t, [[0, "weary"], [210.5, "curious"], [212.9, "starstruck", "spark"]], [[0, "rest"], [210.5, "chin"], [212.9, "cheer"]], { seed: 3, ...walkO(t, 202.6, 205.5) }); coat(c, cx, G, 170, "captain");
    // who he is: a name card in the sky above him, gone before the idea bubble
    const nk = pk(t, 206.0) * (1 - seg(t, 209.9, 210.3));
    popAt(c, 1260, G - 610, nk, (g) => { card(g, 0, 0, 540, 190); serif(g, "David O'Keefe", 0, -34, 54, "#1b2440"); if (t > 208.4) { g.save(); g.globalAlpha = seg(t, 208.4, 208.8); serif(g, "sea captain · Yap, 1870s", 0, 38, 34, "#8a2f2a"); g.restore(); } });
    // what he watched: a stone changing hands without moving
    stone(c, 1950, G - 120, 120);
    W1(c, 1750, 130, t, [[0, "happy"]], [[0, "reach"]], { seed: 5, flip: false }); W1(c, 2160, 130, t, [[0, "happy"]], [[0, "reach"]], { seed: 6, flip: true });
    popAt(c, cx + 60, G - 640, pk(t, 210.6), (g) => { g.beginPath(); g.ellipse(0, 0, 120, 80, 0, 0, TAU); g.fillStyle = "#efe9d6"; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); stone(g, -30, 0, 36, { shadow: false }); serif(g, t > 212.9 ? "!" : "?", 55, 4, 60, "#b0700c"); });
  }
  const ch4MapCam = [[213.8, 2300, 1350, 1.05], [219.0, 2300, 1350, 1.0], [226.4, 1500, 1200, 0.62], [230.6, 1500, 1200, 0.62], [231.2, 2500, 1150, 1.9], [240.4, 2500, 1150, 1.9], [241.4, 2500, 1150, 1.9]];
  const YAP = [2500, 1150], PALAU = [2150, 1650];
  const route = (f) => [lerp(PALAU[0], YAP[0], f) + 90 * Math.sin(f * Math.PI), lerp(PALAU[1], YAP[1], f)];
  function ch4Map(c, t) {
    c.save(); c.strokeStyle = "rgba(210,240,255,0.16)"; c.lineWidth = 1.5; for (let y = -400; y < 2800; y += 36) { c.beginPath(); for (let x = -600; x < 4600; x += 40) c.lineTo(x, y + 6 * Math.sin(x * 0.01 + y)); c.stroke(); } c.restore();
    island(c, 900, 1000, 520, { seed: 1900, ex: 0.63, rot: 0.2, reef: false }); island(c, 2600, 2350, 200, { seed: 4950, ex: 4.5, reef: false });
    island(c, YAP[0], YAP[1], 30, { seed: 7, ex: 0.7, rot: 0.5, palms: 6 }); island(c, PALAU[0], PALAU[1], 34, { seed: 21, ex: 0.55, rot: -0.6, palms: 5 });
    c.save(); c.setLineDash([18, 12]); c.lineWidth = 6; c.strokeStyle = "#fff6e0"; c.beginPath(); for (let f = 0; f <= 1; f += 0.02) c.lineTo(...route(f)); c.stroke(); c.restore();
    // race: canoe crawls, steamship flies (faster), and carries bigger stones
    const ship = (x, y, s) => { c.save(); c.translate(x, y); c.fillStyle = "#2b2f3a"; c.beginPath(); c.moveTo(-60 * s, 0); c.lineTo(60 * s, 0); c.lineTo(48 * s, 22 * s); c.lineTo(-48 * s, 22 * s); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = "#8a2f2a"; c.fillRect(10 * s, -34 * s, 16 * s, 34 * s); c.strokeRect(10 * s, -34 * s, 16 * s, 34 * s); c.fillStyle = "rgba(90,90,100,0.5)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(18 * s + i * 8 * s, -44 * s - i * 14 * s, (8 + i * 3) * s, 0, TAU); c.fill(); } c.restore(); };
    const rs = seg(t, 215.0, 226.0);
    if (rs > 0 && t < 226.6) { const [sx, sy] = route(((rs * 3.5) % 1)); ship(sx, sy - 20, 1.3); if (t > 221.9) stone(c, sx - 20, sy - 70, 44, { shadow: false }); const [cx0, cy0] = route(Math.min(0.35, rs * 0.4)); canoe(c, cx0 - 60, cy0 + 40, 90, LIVE); stone(c, cx0 - 60, cy0 + 10, 16, { shadow: false }); }
    // trade: stones to the islanders, dried coconut back to Europe
    const tk = seg(t, 226.5, 227.0);
    if (tk > 0 && t < 231) { c.save(); c.globalAlpha = tk; c.strokeStyle = "#fff6e0"; c.lineWidth = 7; c.setLineDash([14, 10]);
      c.beginPath(); c.moveTo(YAP[0] - 40, YAP[1]); c.quadraticCurveTo(1500, 700, 200, 900); c.stroke(); c.restore();
      const f = ((t - 227.2) * 0.35) % 1; if (t > 227.2) { const x = lerp(YAP[0] - 40, 200, f), y = lerp(YAP[1], 900, f) - 300 * Math.sin(f * Math.PI); c.fillStyle = "#8a5d33"; c.beginPath(); c.arc(x, y, 28, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = "#f5f0e2"; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill(); }
      popAt(c, 200, 900, pk(t, 229.2), (g) => coin(g, 0, 0, 50, LIVE * 3)); }
    // 1840 → 1929: stones fill the island (drawn as a count of dots on a zoomed Yap)
    const ck = seg(t, 231.1, 239.3);
    if (ck > 0) { const n = Math.floor(lerp(6, 160, easeIn(ck))); for (let i = 0; i < n; i++) { const q = rng(500 + i), a = q() * TAU, r = Math.sqrt(q()); c.beginPath(); c.arc(YAP[0] + Math.cos(a) * r * 26, YAP[1] + Math.sin(a) * r * 34, 2.2, 0, TAU); c.fillStyle = "#f3f7fb"; c.fill(); } }
  }
  function ch4MapText(c, t) {
    label(c, "YAP", YAP[0], YAP[1] - 90, 44, "#fff6e0", "center", seg(t, 213.8, 214.2));
    label(c, "PALAU", PALAU[0] - 20, PALAU[1] + 80, 40, "#fff6e0", "center", seg(t, 213.8, 214.2));
    bigTitle(c, "Faster", 2300, 900, 64, "#fff6e0", seg(t, 219.2, 219.6) * (1 - seg(t, 226.2, 226.6)));
    bigTitle(c, "and bigger", 2300, 990, 56, "#ffd88a", seg(t, 221.9, 222.3) * (1 - seg(t, 226.2, 226.6)));
    label(c, "stones in", YAP[0] + 90, YAP[1] + 20, 34, "#fff6e0", "left", seg(t, 226.8, 227.2) * (1 - seg(t, 230.6, 231)));
    label(c, "dried coconut out → Europe", 900, 560, 40, "#fff6e0", "center", seg(t, 227.2, 227.6) * (1 - seg(t, 230.6, 231)));
    const ck = seg(t, 231.1, 239.3);
    if (ck > 0) { const yr = Math.round(lerp(1840, 1929, easeIn(ck))); bigTitle(c, String(yr), YAP[0], YAP[1] - 190, 74, "#fff6e0", 1); label(c, yr >= 1929 ? "13,000+ stones" : yr <= 1841 ? "stones: rare" : "stones on Yap", YAP[0], YAP[1] + 120, 38, "#fff6e0", "center", 1); }
  }
  const ch4BoardCam = [[240.6, 960, 540, 1.0], [252.4, 960, 540, 1.0], [253.0, 960, 540, 1.04], [254.2, 960, 1660, 1.0], [265.4, 960, 1660, 1.03]];
  function ch4Board(c, t) {
    // scale: small hard-won stone outweighs the big easy one
    card(c, 520, 560, 820, 760);
    const tip = 0.22 * easeOut(seg(t, 245.2, 246.2));
    c.save(); c.translate(520, 520); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(0, 280); c.lineTo(0, -60); c.stroke(); c.rotate(tip); c.beginPath(); c.moveTo(-280, 0); c.lineTo(280, 0); c.stroke();
    popAt(c, -220, -60, pk(t, 244.1), (g) => stone(g, 0, 0, 55, { shadow: false })); popAt(c, 220, -110, pk(t, 244.6), (g) => stone(g, 0, 0, 105, { shadow: false })); c.restore();
    // two lines: number of stones up, what one stone buys down
    card(c, 1420, 560, 820, 760);
    c.strokeStyle = "rgba(27,36,64,0.5)"; c.lineWidth = 3; c.beginPath(); c.moveTo(1080, 820); c.lineTo(1760, 820); c.moveTo(1080, 820); c.lineTo(1080, 300); c.stroke();
    const up = Array.from({ length: 20 }, (_, i) => [1080 + i * 34, 800 - 460 * Math.pow(i / 19, 1.6)]), dn = Array.from({ length: 20 }, (_, i) => [1080 + i * 34, 340 + 440 * Math.pow(i / 19, 0.7)]);
    chartLine(c, up, { width: 10, p: easeInOut(seg(t, 245.9, 247.9)), color: "#8a5d33" });
    chartLine(c, dn, { width: 10, p: easeInOut(seg(t, 248.3, 250.3)), color: "#c0392b" });
    // inflation: prices since 2000 (a basket that cost $100 costs about $187)
    card(c, 960, 1660, 1500, 820, "#e8efe4");
    c.strokeStyle = "rgba(27,36,64,0.35)"; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(380, 1960 - i * 100); c.lineTo(1500, 1960 - i * 100); c.stroke(); }
    const cpi = Array.from({ length: 26 }, (_, i) => [380 + i * 44, 1960 - 380 * ((Math.pow(1.87, i / 25) - 1) / 0.87) - 6 * Math.sin(i * 1.7)]);
    chartLine(c, cpi, { width: 11, p: easeInOut(seg(t, 259.4, 262.4)), color: "#2f8a45" });
    const bk = seg(t, 262.6, 265.2), bs = lerp(1, 0.54, easeInOut(bk));
    popAt(c, 1560, 1700, pk(t, 262.6), (g) => bill(g, 0, 0, 230 * bs, -0.08));
  }
  function ch4BoardText(c, t) {
    label(c, "hard way", 300, 880, 36, "#1b2440", "center", seg(t, 245.2, 245.5)); label(c, "easy way", 740, 880, 36, "#1b2440", "center", seg(t, 244.6, 244.9));
    bigTitle(c, "Worth more:", 520, 250, 50, "#1b2440", seg(t, 245.3, 245.7));
    label(c, "number of stones", 1500, 380, 32, "#8a5d33", "center", seg(t, 246.6, 247)); label(c, "what one stone buys", 1500, 880, 32, "#c0392b", "center", seg(t, 249, 249.4));
    bigTitle(c, "INFLATION", 960, 1350, 100, "#8a2f2a", seg(t, 254.0, 254.35));
    label(c, "2000", 380, 2010, 32, "#1b2440", "center", seg(t, 259.4, 259.8)); label(c, "2025", 1480, 2010, 32, "#1b2440", "center", seg(t, 262, 262.4));
    bigTitle(c, "$100 of groceries in 2000 ≈ $187 today", 940, 1450, 46, "#1b2440", seg(t, 262.1, 262.5));
    label(c, "your dollar", 1560, 1840, 32, "#1b2440", "center", seg(t, 262.8, 263.2));
  }

  // =================== TURN (265.4 → 325.4) ===================
  // a museum timeline of money the camera travels along, then a street, then the hourglass
  const turnCam = [[265.4, 960, 540, 0.8], [269.8, 700, 540, 1.1], [271.3, 1400, 540, 1.1], [272.6, 2100, 540, 1.1], [274.2, 2800, 540, 1.1], [277.6, 1750, 520, 0.62], [282.0, 1750, 520, 0.62], [283.2, 4600, 540, 1.0], [289.2, 4600, 540, 1.0], [289.8, 6100, 540, 0.95], [296.8, 6100, 540, 0.97], [297.6, 8200, 540, 1.0], [310.8, 8200, 540, 1.0], [311.4, 8200, 540, 0.95], [325.4, 8200, 540, 1.0]];
  function turnArt(c, t) {
    // museum wall + timeline
    floorRoom(c, "#1d2744", "#2a3558");
    c.strokeStyle = "#f3f7fb"; c.lineWidth = 6; c.beginPath(); c.moveTo(400, 760); c.lineTo(400 + 2800 * easeOut(seg(t, 268.0, 276.5)), 760); c.stroke();
    const exhibit = (x, t0, fn, lab) => { const k = pk(t, t0); if (k <= 0) return; c.save(); c.globalAlpha = Math.min(1, k); c.fillStyle = "#2f3b62"; c.fillRect(x - 170, 300, 340, 400); c.lineWidth = 5; c.strokeStyle = "#c8b27a"; c.strokeRect(x - 170, 300, 340, 400); c.restore(); popAt(c, x, 500, k, fn); c.fillStyle = "#f3f7fb"; c.beginPath(); c.arc(x, 760, 14, 0, TAU); c.fill(); };
    exhibit(700, 270.2, (g) => stone(g, 0, 0, 120, { shadow: false }), "stones");
    exhibit(1400, 271.6, (g) => coin(g, 0, 0, 110, LIVE * 2.5), "metal");
    exhibit(2100, 272.8, (g) => bill(g, 0, 0, 300, 0.05 * Math.sin(LIVE)), "paper");
    exhibit(2800, 274.6, (g) => phone(g, 0, 0, 330, "$4,812.30"), "screen");
    // the bracket: a story we all agree on
    const bk = easeOut(seg(t, 280.4, 281.2)); if (bk > 0) { c.strokeStyle = "#ffd88a"; c.lineWidth = 7; c.beginPath(); c.moveTo(530, 230); c.lineTo(530, 200); c.lineTo(530 + 2440 * bk, 200); c.lineTo(530 + 2440 * bk, 230); c.stroke(); }
    // the office: a day's work for a piece of paper
    const dx = 4600;
    c.fillStyle = "#8a5d33"; c.fillRect(dx - 60, G - 170, 520, 26); c.fillRect(dx - 40, G - 150, 20, 150); c.fillRect(dx + 420, G - 150, 20, 150); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(dx - 60, G - 170, 520, 26);
    c.save(); c.translate(dx + 200, 260); c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.fillStyle = "#efe9d6"; c.fill(); c.stroke(); const hh = (t - 283) * 1.2; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hh) * 50, Math.sin(hh) * 50); c.moveTo(0, 0); c.lineTo(Math.cos(hh * 12) * 66, Math.sin(hh * 12) * 66); c.stroke(); c.restore();
    W1(c, dx - 220, 190, t, [[0, "determined"], [284.4, "weary"], [285.3, "skeptical"], [287.7, "curious"]], [[0, "reach"], [285.3, "present"]], { seed: 2 });
    popAt(c, dx + 200, G - 330, pk(t, 285.3), (g) => { bill(g, 0, 0, 280, -0.05); if (t > 286.6) { g.save(); g.globalCompositeOperation = "screen"; const r = g.createRadialGradient(0, 0, 0, 0, 0, 200); r.addColorStop(0, "rgba(255,245,210,0.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(-220, -220, 440, 440); g.restore(); } });
    // the street: trust passes the bill hand to hand, until one person stops believing
    const people = [5500, 5900, 6300, 6700];
    const pass = (t - 289.6) / 0.6, broken = t > 293.6;
    people.forEach((x, i) => { const stopper = i === 2, back = i % 2 ? -28 : 0; W1(c, x, i % 2 ? 115 : 140, t, [[0, ["happy", "curious", "calm", "happy"][i]], ...(stopper ? [[293.6, "skeptical"]] : broken && i > 2 ? [[294.6, "worried"]] : [])], stopper && broken ? [[0, "crossed"]] : [[0, "reach"]], { seed: 20 + i, flip: i % 2 === 1, y: G + back }); });
    if (t > 289.4) { for (let i = 0; i < people.length - 1; i++) { const ok = !broken || i < 1; c.save(); c.strokeStyle = ok ? "#2f8a45" : "#c0392b"; c.lineWidth = 6; c.setLineDash(ok ? [] : [10, 10]); c.globalAlpha = clamp(pass - i); c.beginPath(); c.moveTo(people[i] + 40, G - 520); c.quadraticCurveTo((people[i] + people[i + 1]) / 2, G - 600, people[i + 1] - 40, G - 520); c.stroke(); c.restore(); }
      const bi = Math.min(2, Math.max(0, Math.floor(pass))); const f = clamp(pass - bi); if (!broken || bi < 2) { const x = lerp(people[bi], people[bi + 1], f); bill(c, x, G - 500 - 60 * Math.sin(f * Math.PI), 150, 0); } else { c.save(); c.globalAlpha = 0.5; bill(c, people[2], G - 500, 150, 0.3); c.restore(); } }
    // the hourglass: what's real
    const hx = 8200;
    popAt(c, hx, 480, pk(t, 308.8), (g) => hourglass(g, 0, 0, 420, LIVE));
    [["stone", 302.6, -520], ["coin", 304.6, -520 + 0 ], ["bank", 307.2, -520]].forEach(([w, tt], i) => popAt(c, hx - 680, 280 + i * 150, pk(t, tt), (g) => { g.fillStyle = "#efe9d6"; g.fillRect(-150, -50, 300, 100); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.strokeRect(-150, -50, 300, 100); serif(g, `no ${w}`, 0, 4, 40); g.strokeStyle = "#c0392b"; g.lineWidth = 7; g.beginPath(); g.moveTo(-130, 30); g.lineTo(130, -30); g.stroke(); }));
    // hours → money, the hours drift away, the money is the receipt
    if (t > 310.8) { W1(c, hx + 700, 180, t, [[0, "calm"], [314.8, "sad"], [319.4, "thinking"]], [[0, "present"]], { seed: 9, flip: true });
      const sk = seg(t, 314.8, 318.0); for (let i = 0; i < 26; i++) { const q = rng(i + 90), f = clamp(sk * 1.4 - q() * 0.4); if (f <= 0) continue; c.fillStyle = `rgba(247,178,27,${1 - f})`; c.beginPath(); c.arc(hx + 30 + f * (300 + q() * 400), 700 - f * (200 + q() * 300), 6, 0, TAU); c.fill(); }
      const rk = easeOut(seg(t, 319.4, 321.3)); if (rk > 0) { c.save(); c.translate(hx + 480, 180); c.fillStyle = "#f5f0e2"; c.beginPath(); c.moveTo(-150, 0); c.lineTo(150, 0); c.lineTo(150, 380 * rk); for (let x = 150; x >= -150; x -= 20) c.lineTo(x, 380 * rk + (x / 20 % 2 ? 12 : 0)); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); if (rk > 0.6) { serif(c, "RECEIPT", 0, 50, 34); serif(c, "1 hour of", 0, 170, 36); serif(c, "your life", 0, 215, 36); } c.restore(); }
      const ft = seg(t, 323.0, 323.6), sxk = Math.cos(ft * Math.PI); popAt(c, hx, 960, pk(t, 322.9), (g) => { g.save(); g.scale(Math.max(0.05, Math.abs(sxk)), 1); g.fillStyle = "#efe9d6"; g.beginPath(); g.roundRect(-150, -55, 300, 110, 16); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); serif(g, sxk > 0 ? "$60" : "3 hours", 0, 4, 52); g.restore(); }); }
  }
  function turnText(c, t) {
    bigTitle(c, "What is money, really?", 960, 110, 76, "#f3f7fb", seg(t, 265.6, 266) * (1 - seg(t, 269.4, 269.8)));
    bigTitle(c, "A story", 960, 190, 60, "#ffd88a", seg(t, 268.1, 268.5) * (1 - seg(t, 269.4, 269.8)));
    [["stones", 700, 270.2], ["metal", 1400, 271.6], ["paper", 2100, 272.8], ["a number on a screen", 2800, 274.6]].forEach(([w, x, tt]) => label(c, w, x, 830, 40, "#f3f7fb", "center", seg(t, tt, tt + 0.3)));
    bigTitle(c, "a story we all agree on", 1750, 150, 60, "#ffd88a", seg(t, 280.6, 281));
    bigTitle(c, "A whole day... for paper?", 4600, 90, 60, "#f3f7fb", seg(t, 284.2, 284.6) * (1 - seg(t, 289, 289.4)));
    bigTitle(c, "It works because we trust the next person", 6000, 90, 54, "#f3f7fb", seg(t, 289.8, 290.2) * (1 - seg(t, 293.4, 293.8)));
    bigTitle(c, "Stop believing, and it stops working", 6000, 90, 54, "#ff9d8a", seg(t, 293.8, 294.2));
    bigTitle(c, "Your time.", 8200, 110, 90, "#ffd88a", seg(t, 309.2, 309.6) * (1 - seg(t, 321.0, 321.4)));
    bigTitle(c, "Money is the receipt for your time.", 8200, 110, 64, "#f3f7fb", seg(t, 321.4, 321.8) * 1);
  }

  // =================== PAYOFF (325.4 → 383.6) ===================
  const payCam = [[325.4, 960, 540, 1.0], [338.2, 960, 540, 1.0], [338.9, 2750, 540, 1.0], [352.8, 2750, 540, 1.03], [353.6, 4250, 540, 1.0], [367.6, 4250, 540, 1.03], [368.6, 3500, 470, 0.72], [383.6, 3500, 470, 0.74]];
  function payArt(c, t) {
    daySky(c, -1600, G, false); beachGround(c); c.fillStyle = "#9aa3ad"; c.fillRect(-3000, G, 14000, 1600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-3000, G); c.lineTo(11000, G); c.stroke();
    // the math board
    card(c, 960, 470, 1600, 780, "#e8efe4");
    popAt(c, 560, 300, pk(t, 328.3), (g) => serif(g, "$20 / hour", 0, 0, 64, "#1b2440"));
    popAt(c, 1360, 300, pk(t, 331.6), (g) => phone(g, 0, 20, 220, "$1,000"));
    popAt(c, 960, 300, pk(t, 333.7), (g) => serif(g, "→", 0, 0, 70));
    // the week grid: 5 days × 8 hours = 40 blocks; 50 hours spills past it
    const fill = Math.floor(lerp(0, 50, easeInOut(seg(t, 334.0, 337.2))));
    for (let i = 0; i < 50; i++) { const col = Math.floor(i / 8), row = i % 8, over = i >= 40; const x = 330 + col * 128 + (over ? 60 : 0), y = 470 + row * 44; c.fillStyle = i < fill ? (over ? "#c0392b" : "#f7b21b") : "rgba(0,0,0,0.06)"; c.fillRect(x, y, 116, 38); c.lineWidth = 2; c.strokeStyle = "rgba(27,36,64,0.4)"; c.strokeRect(x, y, 116, 38); }
    c.save(); c.setLineDash([10, 8]); c.lineWidth = 4; c.strokeStyle = "#1b2440"; c.beginPath(); c.moveTo(963, 450); c.lineTo(963, 840); c.stroke(); c.restore();
    // two Wicks, same job, one street
    const hx = 2750, bx = 4150;
    hut(c, hx + 60, G, 360); hut(c, bx - 60, G, 300);
    stone(c, hx - 420, G - 160, 160, { glow: 0.4 });                             // the showy stone out front
    c.save(); c.translate(hx + 400, G - 60); c.fillStyle = "#c0392b"; c.beginPath(); c.roundRect(-150, -70, 300, 90, 30); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = PAL.ink; for (const wx of [-90, 90]) { c.beginPath(); c.arc(wx, 25, 32, 0, TAU); c.fill(); } c.restore();
    W1(c, hx - 150, 180, t, [[0, "proud"], [368.3, "proud"], [370.5, "weary"]], [[0, "hips"], [370.5, "rest"]], { seed: 1 });
    c.save(); c.strokeStyle = "#f7c21e"; c.lineWidth = 7; c.beginPath(); c.arc(hx - 150, G - 180 * 1.3, 60, 0.2, Math.PI - 0.2); c.stroke(); c.restore();   // gold chain
    W1(c, bx + 120, 170, t, [[0, "calm"], [357.8, "determined"], [375.0, "joy"]], [[0, "rest"], [354.2, "reach"], [375.0, "wave"]], { seed: 2, flip: true, ...(t > 377 ? walkO(t, 377, 383.6) : {}) , ...(t > 377 ? {} : {}) });
    // B's paycheck slice drops into the jar; months of freedom stack up
    const jx = bx + 420;
    c.save(); c.fillStyle = "rgba(220,240,255,0.35)"; c.beginPath(); c.roundRect(jx - 110, G - 330, 220, 330, 30); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke(); c.restore();
    const months = Math.min(6, Math.max(0, Math.floor((t - 360.2) / 0.9) + 1));
    for (let i = 0; i < (t > 360.2 ? months : 0); i++) hourglass(c, jx - 50 + (i % 2) * 100, G - 60 - Math.floor(i / 2) * 95, 80, LIVE + i);
    const sk = seg(t, 354.2, 355.6); if (sk > 0 && sk < 1) { c.save(); c.translate(lerp(bx + 120, jx, sk), lerp(G - 500, G - 250, sk)); c.fillStyle = "#8fd07e"; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 40, -0.4, 0.5); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.restore(); }
    // years later: A's driveway of owed stones; B's three NOs
    if (t > 370.8) { [[hx + 700, 95], [hx + 900, 75]].forEach(([x, r], i) => { popAt(c, x, G - r, pk(t, 371.2 + i * 0.3), (g) => stone(g, 0, 0, r)); popAt(c, x, G - r * 2 - 40, pk(t, 372.8 + i * 0.2), (g) => { g.fillStyle = "#efe9d6"; g.fillRect(-60, -22, 120, 44); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.strokeRect(-60, -22, 120, 44); serif(g, "OWED", 0, 2, 26, "#8a2f2a"); }); }); }
    [["bad job", 380.0], ["bad boss", 381.4], ["bad day", 382.8]].forEach(([w, tt], i) => popAt(c, bx - 150 + i * 260, 290, pk(t, tt), (g) => { g.fillStyle = "#efe9d6"; g.fillRect(-100, -45, 200, 90); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.strokeRect(-100, -45, 200, 90); serif(g, w, 0, 4, 32); g.save(); g.rotate(-0.2); g.lineWidth = 6; g.strokeStyle = "#c0392b"; g.strokeRect(-70, -34, 140, 68); serif(g, "NO", 0, 4, 50, "#c0392b"); g.restore(); }));
  }
  function payText(c, t) {
    bigTitle(c, "Let's do the math", 960, 140, 64, "#1b2440", seg(t, 326.0, 326.4) * (1 - seg(t, 338.0, 338.4)));
    label(c, "one work week = 40 hours", 640, 870, 34, "#1b2440", "center", seg(t, 335.8, 336.2) * (1 - seg(t, 338.0, 338.4)));
    bigTitle(c, "50 hours of your life", 1360, 870, 44, "#8a2f2a", seg(t, 334.4, 334.8) * (1 - seg(t, 338.0, 338.4)));
    bigTitle(c, "Wick A: spends to look rich", 2750, 150, 56, "#1b2440", seg(t, 341.4, 341.8) * (1 - seg(t, 368.2, 368.6)));
    bigTitle(c, "Wick B: buys back hours", 4250, 150, 56, "#1b2440", seg(t, 353.4, 353.8) * (1 - seg(t, 368.2, 368.6)));
    label(c, "months of freedom", 4570, 520, 32, "#1b2440", "center", seg(t, 360.2, 360.6));
    bigTitle(c, "Years later", 3500, 90, 60, "#8a5d10", seg(t, 368.1, 368.5) * (1 - seg(t, 372, 372.4)));
    bigTitle(c, "The choice to say no.", 3500, 90, 64, "#1b2440", seg(t, 377.3, 377.7));
  }

  // =================== CLOSE (383.6 → 420.5) ===================
  const closeCam = [[383.6, 900, 540, 1.0], [397.4, 900, 540, 1.0], [398.0, 3060, 540, 1.0], [400.4, 3060, 540, 1.0], [401.0, 6000, 2200, 1.0], [405.6, 6000, 2250, 1.05], [407.2, 6400, 560, 0.95], [420.5, 6400, 560, 1.02]];
  function closeArt(c, t) {
    floorRoom(c);
    // the kitchen table worksheet
    c.fillStyle = "#8a5d33"; c.fillRect(420, G - 260, 1000, 30); c.fillRect(470, G - 230, 24, 230); c.fillRect(1350, G - 230, 24, 230); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(420, G - 260, 1000, 30);
    c.lineWidth = 8; c.strokeStyle = "#5a3b20"; c.beginPath(); c.moveTo(700, 600); c.lineTo(640, G - 260); c.moveTo(1140, 600); c.lineTo(1200, G - 260); c.stroke();
    card(c, 920, 400, 820, 420);
    popAt(c, 560, 290, pk(t, 389.5), (g) => serif(g, "$1,600 paycheck", 0, 0, 44, "#1b2440", "left"));
    popAt(c, 560, 370, pk(t, 391.0), (g) => serif(g, "÷ 80 hours", 0, 0, 44, "#1b2440", "left"));
    popAt(c, 560, 460, pk(t, 391.8), (g) => serif(g, "= $20 an hour", 0, 0, 52, "#b0700c", "left"));
    popAt(c, 560, 540, pk(t, 394.0), (g) => serif(g, "$120 sneakers = 6 hours", 0, 0, 40, "#8a2f2a", "left"));
    W1(c, 210, 190, t, [[0, "thinking"], [391.8, "determined"], [394.0, "shocked", "!"]], [[0, "chin"], [391.8, "point"]], { seed: 3 });
    // the store shelf: every tag flips to hours
    c.fillStyle = "#8a5d33"; c.fillRect(2350, 520, 1560, 22); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(2350, 520, 1560, 22);
    ["$40", "$120", "$9", "$300", "$65"].forEach((p, i) => { const f = seg(t, 398.6 + i * 0.18, 398.9 + i * 0.18), sx = Math.cos(f * Math.PI); c.save(); c.translate(2490 + i * 300, 460); c.scale(Math.max(0.05, Math.abs(sx)), 1); c.fillStyle = "#efe9d6"; c.beginPath(); c.roundRect(-110, -55, 220, 110, 14); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); serif(c, sx > 0 ? p : ["2 hrs", "6 hrs", "½ hr", "15 hrs", "3¼ hrs"][i], 0, 4, 46); c.restore(); });
    W1(c, 2200, 170, t, [[0, "wink"]], [[0, "present"]], { seed: 4 });
    // callback: the stone on the seabed, then Wick on the sand at dusk
    c.save(); const wg = c.createLinearGradient(0, 1500, 0, 2700); wg.addColorStop(0, "#1c5f73"); wg.addColorStop(1, "#071b28"); c.fillStyle = wg; c.fillRect(4800, 1300, 2600, 1500); c.fillStyle = "#3a3a2c"; c.fillRect(4800, 2600, 2600, 300); stone(c, 6000, 2600 - 170, 170, { glow: 0.8 }); c.restore();
    // dusk beach (y 0 ground at world y G, x 5000..8000)
    const dusk = c.createLinearGradient(0, -700, 0, G); dusk.addColorStop(0, "#3d3470"); dusk.addColorStop(0.6, "#c46f8f"); dusk.addColorStop(1, "#f3a57c"); c.fillStyle = dusk; c.fillRect(5000, -800, 3200, G + 800);
    c.fillStyle = "#ffe6b0"; c.beginPath(); c.arc(7300, G - 160, 110, 0, TAU); c.fill();
    c.fillStyle = "#2d6f8a"; c.fillRect(5000, G - 120, 3200, 120); waves(c, G - 110, LIVE, "rgba(255,255,255,0.3)");
    c.fillStyle = "#e0c98e"; c.fillRect(5000, G, 3200, 1600 - 1300); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(5000, G); c.lineTo(8200, G); c.stroke();
    palm(c, 5500, G, 330, LIVE, 5);
    W1(c, 6250, 190, t, [[0, "calm"], [411.7, "happy"]], [[0, "rest"]], { seed: 6, glow: 1.4 });
    hourglass(c, 6480, G - 70, 120, LIVE);
  }
  function closeText(c, t) {
    bigTitle(c, "Tonight: price it in hours", 920, 110, 64, "#1b2440", seg(t, 385.0, 385.4) * (1 - seg(t, 397.2, 397.6)));
    bigTitle(c, "You'll never see a price tag the same way", 3000, 170, 54, "#1b2440", seg(t, 397.8, 398.2));
    bigTitle(c, "Everyone agreed it counted", 6000, 1850, 56, "#f3f7fb", seg(t, 405.8, 406.2));
    bigTitle(c, "Your money is a story.", 6400, 120, 60, "#fff6e0", seg(t, 408.1, 408.5));
    bigTitle(c, "Your time is real.", 6400, 210, 72, "#ffd88a", seg(t, 410.0, 410.4));
  }

  // =================== sequencing ===================
  const S = {
    ch2: (t) => ({ bg: P.navy, cam: camKF(ch2Cam, t), art: (c) => ch2Art(c, t), text: (c) => ch2Text(c, t) }),
    ch3: (t) => ({ bg: P.navy, cam: camKF(ch3Cam, t), art: (c) => ch3Art(c, t), text: (c) => ch3Text(c, t) }),
    ch4b: (t) => ({ bg: P.navy, cam: camKF(ch4BeachCam, t), art: (c) => ch4Beach(c, t) }),
    ch4m: (t) => ({ bg: P.ocean, cam: camKF(ch4MapCam, t), art: (c) => ch4Map(c, t), text: (c) => ch4MapText(c, t) }),
    ch4g: (t) => ({ bg: P.green, cam: camKF(ch4BoardCam, t), art: (c) => ch4Board(c, t), text: (c) => ch4BoardText(c, t) }),
    turn: (t) => ({ bg: P.navy, cam: camKF(turnCam, t), art: (c) => turnArt(c, t), text: (c) => turnText(c, t) }),
    pay: (t) => ({ bg: P.green, cam: camKF(payCam, t), art: (c) => payArt(c, t), text: (c) => payText(c, t) }),
    close: (t) => ({ bg: P.navy, cam: camKF(closeCam, t), art: (c) => closeArt(c, t), text: (c) => closeText(c, t),
      over: (c) => {
        // end call to action, in the lower third below Wick's feet
        const k = backOut(seg(t, 411.5, 412.1)); if (k > 0.01) { c.save(); c.translate(960, 1000); c.scale(k, k);
          c.fillStyle = "rgba(12,14,28,0.72)"; c.beginPath(); c.roundRect(-620, -52, 1240, 104, 52); c.fill();
          c.fillStyle = "#c0392b"; c.beginPath(); c.roundRect(230, -36, 360, 72, 36); c.fill();
          c.font = "700 34px Fira"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = "#fff6e0"; c.fillText("Subscribe for more money stories like this", -590, 2);
          c.font = "900 34px Serif4"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText("SUBSCRIBE", 410, 2);
          c.fillStyle = "#fff6e0"; c.beginPath(); c.arc(265, -2, 14, Math.PI, 0); c.lineTo(279, 10); c.lineTo(251, 10); c.closePath(); c.fill(); c.beginPath(); c.arc(265, 13, 4, 0, TAU); c.fill(); c.restore(); }
        const f = seg(t, END - 2.2, END); if (f > 0) { c.fillStyle = `rgba(8,10,20,${f})`; c.fillRect(0, 0, 1920, 1080); } } }),
  };
  const order = [["ch2", T0], ["ch3", 152.8], ["ch4b", 201.8], ["ch4m", 213.8], ["ch4g", 240.6], ["turn", 265.4], ["pay", 325.4], ["close", 383.6]];
  const TR = 0.7;   // every change of canvas is a Dalio hatch-in or a crossfade, never a cut
  return {
    duration: END, fps: 30, out,
    renderAt(t) {
      LIVE = t;
      let i = 0; while (i + 1 < order.length && t >= order[i + 1][1]) i++;
      const [k, s0] = order[i];
      if (i > 0 && t < s0 + TR) { const [pk2] = order[i - 1]; const p = seg(t, s0, s0 + TR); if (i % 2) stage.hatchIn(S[pk2](t), S[k](t), p, t); else stage.mix(S[pk2](t), S[k](t), smooth(p), t); }
      else stage.frame(S[k](t), t);
      watermark(out, t);
    },
  };
}
