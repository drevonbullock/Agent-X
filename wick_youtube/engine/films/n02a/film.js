// N02 · FILM A (0 → "Tuesday"): the cold open on a rainy night street, then CH1 "The Boots Theory".
// Every build is cued to a word in films/n02/words.json, so a new VO take re-times the whole film by itself.
//   node render.mjs --film n02a --sheet 1,6,17,23,26,33 --cols 3 --name s1
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, inkWick, mood, pose, sweat, sparkle, makeStage, burst } from "../../lib2d/ink.js";
import { boot, rain, puddle, jar, coin } from "../../lib2d/props.js";
import { camSmooth as camKF, pk, popAt, person, card, serif, coat, scarf } from "../../lib2d/scene.js";
import { watermark } from "../../lib2d/brand.js";
const TAU = Math.PI * 2, G = 900, CREAM = "#f3ecd6", RED = "#e0402a", GOLD = "#f7b21b";
let LIVE = 0;

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const words = await (await fetch("films/n02/words.json")).json();
  const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
  const C = {};
  ["morning", "raining", "cold", "boot", "again", "squelches", "people", "choices", "working", "enough", "works", "dee", "job", "dry", "question", "years", "guess",
    "answer", "laziness", "novel", "pratchett", "guard", "earned", "month", "good", "apart", "therefore", "after", "hundred", "twice", "wet", "key",
    "expensive", "trap", "everywhere", "real", "tax", "follow", "tuesday"].forEach((w) => (C[w] = cue(w)));
  C.pay = cue("pay", C.job); C.rain2 = cue("rain", C.pay); C.tenB = cue("ten", C.question); C.fiftyB = cue("fifty", C.question);
  C.poor = cue("poor", C.answer); C.out = cue("out", C.laziness); C.cheapA = cue("cheap", C.out);
  C.fiftyG = cue("fifty", C.good); C.pay2 = cue("pay", C.good); C.tenYears = cue("years", C.good); C.cheapB = cue("cheap", C.tenYears);
  C.season = cue("season"); C.once = cue("once", C.apart); C.fiftyD = cue("fifty", C.apart);
  C.again2 = cue("again", C.therefore); C.again3 = cue("again", C.again2 + 0.1); C.again4 = cue("again", C.again3 + 0.1);
  C.money = cue("money", C.key); C.all = cue("all", C.expensive);
  const END = C.tuesday - 0.5;
  const P = { navy: paper(W, H, PAL.navy, 11), mustard: paper(W, H, PAL.mustard, 31), green: paper(W, H, PAL.green, 23) };

  const wk = (c, x, s, t, faces, poses, o = {}) => inkWick(c, x, o.y ?? G, s, { ...mood(t, faces), arms: pose(t, poses), t: LIVE, ...o });

  // ================= STREET (a rainy night; the scoreboard hangs in the sky) =================
  const WX = (t) => lerp(1000, 1700, easeInOut(seg(t, 2.6, 10.2)));
  const DX = (t) => lerp(2800, 2100, easeInOut(seg(t, C.dee - 1.8, C.dee + 0.4)));
  function cityBack(c) {
    const sky = c.createLinearGradient(0, -900, 0, G); sky.addColorStop(0, "#0a1226"); sky.addColorStop(1, "#1e2d4f");
    c.fillStyle = sky; c.fillRect(-2000, -2400, 8000, G + 2400);
    for (let i = 0; i < 16; i++) {
      const q = rng(i + 40), bx = -600 + i * 330 + q() * 60, bw = 220 + q() * 120, bh = 320 + q() * 420;
      c.fillStyle = i % 2 ? "#141d36" : "#18223f"; c.fillRect(bx, G - bh, bw, bh);
      for (let wy = G - bh + 30; wy < G - 70; wy += 56) for (let wx = bx + 22; wx < bx + bw - 30; wx += 48) { const r = q(); if (r < 0.42) { c.fillStyle = r < 0.2 ? "rgba(245,201,106,0.85)" : "rgba(245,201,106,0.4)"; c.fillRect(wx, wy, 22, 30); } }
    }
    // sidewalk + wet road with lamp reflections
    c.fillStyle = "#3a4256"; c.fillRect(-2000, G, 8000, 70); c.fillStyle = "#232a3b"; c.fillRect(-2000, G + 70, 8000, 1400);
    c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-2000, G); c.lineTo(6000, G); c.moveTo(-2000, G + 70); c.lineTo(6000, G + 70); c.stroke();
    for (const lx of [300, 1300, 2150, 3300]) {
      c.save(); c.strokeStyle = "rgba(245,201,106,0.22)"; c.lineWidth = 10; c.beginPath(); for (let y = G + 80; y < G + 420; y += 12) c.lineTo(lx + 60 + 8 * Math.sin(y * 0.08 + LIVE * 3), y); c.stroke(); c.restore();
      c.fillStyle = "#1a1f2c"; c.fillRect(lx - 7, G - 520, 14, 520); c.fillRect(lx, G - 520, 60, 10); c.strokeStyle = PAL.ink; c.lineWidth = 3; c.strokeRect(lx - 7, G - 520, 14, 520);
      c.fillStyle = "#ffe6a8"; c.beginPath(); c.moveTo(lx + 40, G - 510); c.lineTo(lx + 80, G - 510); c.lineTo(lx + 70, G - 488); c.lineTo(lx + 50, G - 488); c.closePath(); c.fill();
      c.save(); c.globalCompositeOperation = "screen"; const gl = c.createRadialGradient(lx + 60, G - 490, 0, lx + 60, G - 490, 260); gl.addColorStop(0, "rgba(255,220,150,0.45)"); gl.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 60, G - 490, 260, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,225,160,0.07)"; c.beginPath(); c.moveTo(lx + 45, G - 488); c.lineTo(lx + 75, G - 488); c.lineTo(lx + 230, G); c.lineTo(lx - 110, G); c.closePath(); c.fill(); c.restore();
    }
    // a flickering neon sign, and steam rising from a sidewalk grate
    const on = rng(Math.floor(LIVE * 10))() > 0.12 ? 1 : 0.25;
    c.save(); c.fillStyle = "#1a1f2c"; c.beginPath(); c.roundRect(580, G - 470, 170, 90, 14); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
    c.globalCompositeOperation = "screen"; const ng = c.createRadialGradient(665, G - 425, 0, 665, G - 425, 190); ng.addColorStop(0, `rgba(255,95,162,${0.35 * on})`); ng.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = ng; c.beginPath(); c.arc(665, G - 425, 190, 0, TAU); c.fill(); c.restore();
    c.save(); c.font = "900 62px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = on > 0.5 ? "#ff8cc0" : "#6b3a55"; c.fillText("24H", 665, G - 423); c.restore();
    c.fillStyle = "#1a1f2c"; c.fillRect(1400, G + 8, 110, 22); c.strokeStyle = "#5a6275"; c.lineWidth = 3; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(1410 + k * 18, G + 10); c.lineTo(1410 + k * 18, G + 28); c.stroke(); }
    c.save(); for (let i = 0; i < 6; i++) { const ph = (LIVE * 0.3 + i / 6) % 1, sx = 1455 + 40 * Math.sin(ph * 4 + i), sy = G - ph * 340, r = 50 + ph * 110;
      const sg = c.createRadialGradient(sx, sy, 0, sx, sy, r); sg.addColorStop(0, `rgba(215,225,240,${0.16 * Math.sin(ph * Math.PI)})`); sg.addColorStop(1, "rgba(215,225,240,0)"); c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); } c.restore();
    // the guard hut: lit window, and on the shelf inside, Dee's jar (the setup)
    c.fillStyle = "#3b4a6b"; c.fillRect(2520, G - 420, 360, 420); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(2520, G - 420, 360, 420);
    c.fillStyle = "#26314d"; c.beginPath(); c.moveTo(2490, G - 420); c.lineTo(2910, G - 420); c.lineTo(2880, G - 470); c.lineTo(2520, G - 470); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#f3d58c"; c.fillRect(2555, G - 350, 170, 150); c.strokeRect(2555, G - 350, 170, 150);
    c.fillStyle = "#8a6a2b"; c.fillRect(2560, G - 238, 160, 8); jar(c, 2640, G - 238, 78, { fill: 0.22, label: "BOOTS" });
    c.fillStyle = "#26314d"; c.fillRect(2760, G - 300, 90, 300); c.strokeRect(2760, G - 300, 90, 300);
    c.fillStyle = "#c9d2dc"; c.fillRect(2600, G - 405, 200, 38); c.strokeRect(2600, G - 405, 200, 38); serif(c, "SECURITY", 2700, G - 385, 26, "#1b2440");
  }
  // the board that hangs over the street (drops in on "question"); mode "boots" or "tax"
  function streetBoard(c, t, mode) {
    const drop = mode === "tax" ? 1 : backOut(seg(t, C.question, C.question + 0.7)); if (drop <= 0.001) return;
    const bx = 1900, by = lerp(-900, 60, drop), bw = 1240, bh = 330;
    c.save(); c.strokeStyle = "#9aa3ad"; c.lineWidth = 6; for (const cx of [bx - 520, bx + 520]) { c.beginPath(); c.moveTo(cx, by - bh / 2); c.lineTo(cx, by - 1600); c.stroke(); } c.restore();
    const flip = mode === "tax" ? Math.abs(Math.cos(Math.PI * seg(t, C.tax - 0.25, C.tax + 0.25))) : 1;
    c.save(); c.translate(bx, by); c.scale(1, Math.max(0.04, flip));
    c.fillStyle = "#2d4536"; c.fillRect(-bw / 2, -bh / 2, bw, bh); c.lineWidth = 10; c.strokeStyle = "#6b4a2a"; c.strokeRect(-bw / 2, -bh / 2, bw, bh);
    const taxSide = mode === "tax" && t > C.tax;
    const rows = [["WICK", -80, true], ["DEE", 85, false]];
    rows.forEach(([name, y, cheap]) => {
      serif(c, name, -bw / 2 + 100, y, 58, CREAM, "center");
      if (!taxSide) {
        boot(c, -380, y + 40, 62, { cheap, split: cheap ? 0.6 : 0 });
        popAt(c, -250, y, pk(t, cheap ? C.tenB : C.fiftyB), (g) => { g.fillStyle = CREAM; g.beginPath(); g.roundRect(-74, -36, 148, 72, 14); g.fill(); serif(g, cheap ? "$10" : "$50", 0, 2, 50, "#1b2440"); });
        const tk = easeOut(seg(t, C.years - 0.2, C.years + 0.6));
        if (tk > 0) { c.save(); c.globalAlpha = tk; c.strokeStyle = CREAM; c.lineWidth = 4; c.beginPath(); c.moveTo(-140, y + 30); c.lineTo(-140 + 640 * tk, y + 30); c.stroke();
          for (let k = 0; k <= 10; k++) if (k / 10 <= tk) { c.beginPath(); c.moveTo(-140 + k * 64, y + 22); c.lineTo(-140 + k * 64, y + 38); c.stroke(); } c.restore(); }
        if (tk > 0 && name === "DEE") { c.save(); c.globalAlpha = tk; serif(c, "10 YEARS", 180, y + 66, 30, "rgba(243,236,214,0.85)"); c.restore(); }
      } else {
        serif(c, "$0", 500, y, 64, name === "WICK" ? GOLD : CREAM);
        if (name === "WICK") { const ck = easeOut(seg(t, C.follow - 0.2, C.follow + 0.8)); for (let m = 0; m < 12; m++) if (m / 12 < ck) { c.strokeStyle = CREAM; c.lineWidth = 3; c.strokeRect(-330 + m * 50, y - 22, 42, 42); } }
      }
    });
    if (taxSide) serif(c, "BROKE TAX", 0, -bh / 2 + 40, 54, GOLD);
    c.restore();
    // the question mark hangs to the right of the board while they guess
    const qk = pk(t, C.years + 0.3) * (mode === "tax" ? 0 : 1 - seg(t, C.answer - 0.3, C.answer));
    popAt(c, bx + bw / 2 + 110, by + 10 + 8 * Math.sin(LIVE * 4), qk, (g) => serif(g, "?", 0, 0, 170, GOLD));
  }
  // a car hisses past on the wet road (the camera is pulling back while it crosses)
  const CAR0 = 4.6;
  function car(c, t) {
    const k = seg(t, CAR0, CAR0 + 3.2); if (k <= 0 || k >= 1) return; const x = lerp(-700, 3400, k), y = G + 175;
    c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = "rgba(255,240,190,0.16)"; c.beginPath(); c.moveTo(x + 250, y - 70); c.lineTo(x + 1100, y - 150); c.lineTo(x + 1100, y + 40); c.closePath(); c.fill();
    const tl = c.createRadialGradient(x - 250, y - 70, 0, x - 250, y - 70, 90); tl.addColorStop(0, "rgba(255,60,50,0.55)"); tl.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = tl; c.beginPath(); c.arc(x - 250, y - 70, 90, 0, TAU); c.fill(); c.restore();
    c.fillStyle = "#171c2a"; c.beginPath(); c.moveTo(x - 260, y - 30); c.lineTo(x - 250, y - 95); c.lineTo(x - 120, y - 105); c.lineTo(x - 60, y - 165); c.lineTo(x + 120, y - 165); c.lineTo(x + 180, y - 105); c.lineTo(x + 255, y - 90); c.lineTo(x + 262, y - 30); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke();
    c.fillStyle = "rgba(245,201,106,0.35)"; c.beginPath(); c.moveTo(x - 45, y - 152); c.lineTo(x + 110, y - 152); c.lineTo(x + 160, y - 108); c.lineTo(x - 95, y - 108); c.closePath(); c.fill();
    c.fillStyle = "#ffe6a8"; c.fillRect(x + 240, y - 88, 18, 14); c.fillStyle = "#ff5040"; c.fillRect(x - 258, y - 86, 12, 14);
    for (const wx of [x - 150, x + 150]) { c.fillStyle = "#0c0f18"; c.beginPath(); c.arc(wx, y - 22, 40, 0, TAU); c.fill(); c.fillStyle = "#5a6275"; c.beginPath(); c.arc(wx, y - 22, 14, 0, TAU); c.fill();
      c.fillStyle = "rgba(190,215,240,0.5)"; for (let i = 0; i < 7; i++) { const q = rng(i + Math.floor(LIVE * 20)); c.beginPath(); c.arc(wx - 50 - q() * 90, y - 10 - q() * 50, 3 + q() * 5, 0, TAU); c.fill(); } }
  }
  // the wrong belief: neighbours in lit windows look down and judge; their thought bubbles show a shopping bag and a couch
  function judges(c, t) {
    const gone = 1 - seg(t, C.works - 0.1, C.works + 0.25); if (gone <= 0) return;
    [[1330, 400, C.people - 0.2, C.choices, "bag"], [2050, 340, C.people + 0.3, C.working, "couch"]].forEach(([x, y, t0, tb, icon]) => {
      const wk2 = seg(t, t0, t0 + 0.4) * gone; if (wk2 <= 0.01) return;
      c.save(); c.translate(x, y); c.scale(1.5, 1.5); c.translate(-x, -y);
      c.save(); c.globalAlpha = wk2; c.fillStyle = "#f5c96a"; c.fillRect(x - 34, y - 44, 68, 88); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(x - 34, y - 44, 68, 88);
      c.fillStyle = "#1a1f2c"; const lean = 6 * Math.sin(LIVE * 1.4 + x); c.beginPath(); c.arc(x + lean, y - 6, 15, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x + lean, y + 40, 26, 22, 0, Math.PI, TAU); c.fill();
      c.fillStyle = "#e8d29a"; c.fillRect(x - 34, y - 44, 12, 88); c.fillRect(x + 22, y - 44, 12, 88); c.restore();
      const bk = pk(t, tb) * gone; if (t > C.works - 0.1 && t < C.works + 0.5) burst(c, x + 80, y - 140, seg(t, C.works - 0.1, C.works + 0.4), { r0: 10, r1: 90, n: 10, color: "rgba(243,236,214,0.9)" });
      popAt(c, x + 80, y - 140, bk, (g) => { g.fillStyle = CREAM; g.lineWidth = 4; g.strokeStyle = PAL.ink; g.beginPath(); g.ellipse(0, 0, 82, 62, 0, 0, TAU); g.fill(); g.stroke();
        for (const [dx, dy, r] of [[-60, 62, 12], [-78, 86, 7]]) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill(); g.stroke(); }
        if (icon === "bag") { g.fillStyle = "#c0392b"; g.beginPath(); g.moveTo(-28, -14); g.lineTo(28, -14); g.lineTo(34, 34); g.lineTo(-34, 34); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -14, 16, Math.PI, TAU); g.stroke(); serif(g, "$", 0, 12, 34, CREAM); }
        else { g.fillStyle = "#6b7ea6"; g.beginPath(); g.roundRect(-44, -6, 88, 36, 8); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-38, -26, 76, 24, 8); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-54, -14, 16, 44, 6); g.fill(); g.stroke(); g.beginPath(); g.roundRect(38, -14, 16, 44, 6); g.fill(); g.stroke(); serif(g, "z", 50, -40, 24, "#1b2440"); } });
      c.restore();
    });
  }
  function streetArt(c, t, mode) {
    cityBack(c);
    puddle(c, 1000, G, 250, LIVE, { splash: mode === "open" ? seg(t, 0.15 + 0.75 / 1.3, 0.15 + 0.75 / 1.3 + 0.7) : 0 }); puddle(c, 1900, G, 200, LIVE + 0.5);
    if (mode === "open") { car(c, t); judges(c, t); }
    const shiver = mode === "open" ? seg(t, C.cold - 0.1, C.cold + 0.2) * (1 - seg(t, C.cold + 1.1, C.cold + 1.6)) : 0;
    const wx = (mode === "open" ? WX(t) : 1700) + 4 * shiver * Math.sin(LIVE * 70), wWalk = mode === "open" && ((t > 0.15 && t < 0.9) || (t > 2.6 && t < 10.2));
    const wPhase = t < 1 ? (t - 0.15) * 1.3 : t * 1.15;   // a weary trudge, ~2.3 steps a second
    // flashlight beam while he walks his beat
    const beam = mode === "open" ? 1 - seg(t, C.works - 0.4, C.works) : 0;
    if (beam > 0) { c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = `rgba(255,240,180,${0.12 * beam})`; c.beginPath(); c.moveTo(wx + 100, G - 85); c.lineTo(wx + 820, G - 10); c.lineTo(wx + 820, G - 230); c.closePath(); c.fill(); c.restore(); }
    const wFaces = mode === "open" ? [[0, "weary"], [C.again, "grimace"], [C.works, "determined"], [C.dry, "sad"], [C.question, "curious"], [C.guess, "thinking"]] : [[0, "weary"], [C.follow, "determined"]];
    const wPoses = mode === "open" ? [[0, "reach"], [C.works, "hips"], [C.dry, "rest"], [C.question, "chin"]] : [[0, "rest"]];
    wk(c, wx, 170, t, wFaces, wPoses, { seed: 3, boots: "cheap", split: 0.8, look: mode === "open" && t > C.dee ? 0.5 : 0, ...(wWalk ? { walk: wPhase, dy: -0.035 * Math.abs(Math.sin(wPhase * TAU)) } : {}) });
    coat(c, wx, G, 170, "guard");
    const dx = mode === "open" ? DX(t) : 2100, dWalk = mode === "open" && t > C.dee - 1.8 && t < C.dee + 0.4;
    if (mode !== "open" || t > C.dee - 1.8) {
      wk(c, dx, 165, t, [[0, "calm"], [C.dry, "happy"], [C.question, "curious"]], [[0, "rest"], [C.dry, "hips"]], { seed: 7, flip: true, boots: "good", ...(dWalk ? { walk: t * 1.15, dy: -0.035 * Math.abs(Math.sin(t * 1.15 * TAU)) } : {}) });
      coat(c, dx, G, 165, "guard"); scarf(c, dx, G, 165, "#c0392b", 0, LIVE);
    }
    // "Dee's feet are dry": a glint on her boots, drips on his
    if (mode === "open") { const fk = seg(t, C.dry - 0.2, C.dry + 0.6) * (1 - seg(t, C.question - 0.3, C.question)); if (fk > 0) { sparkle(c, dx + 40, G - 30, 14 * fk); c.fillStyle = `rgba(160,200,235,${0.9 * fk})`; for (let i = 0; i < 4; i++) { const ph = (LIVE * 1.8 + i * 0.25) % 1; c.beginPath(); c.arc(wx + 50 - i * 22, G - 60 + ph * 50, 4, 0, TAU); c.fill(); } } }
    // punch cards over their heads: 50 hours each, then SAME PAY
    if (mode === "open") {
      const cardK = (t0) => pk(t, t0) * (1 - seg(t, C.question - 0.8, C.question - 0.3));
      const pc = (g, who) => { card(g, 0, 0, 260, 120); serif(g, t > C.pay ? "SAME PAY" : "50 HRS", 0, -12, t > C.pay ? 40 : 52, "#1b2440"); serif(g, t > C.pay ? "same job" : "a week", 0, 36, 24, "#8a2f2a"); };
      popAt(c, 1700, G - 610, cardK(C.works + 0.2), (g) => pc(g, "w")); popAt(c, 2100, G - 610, cardK(C.dee + 0.2), (g) => pc(g, "d"));
    }
    streetBoard(c, t, mode === "open" ? "boots" : "tax");
    // the three promises under the board, then a cheap boot drops onto "the way out"
    if (mode === "open") {
      const gone = 1 - seg(t, C.novel - 1.6, C.novel - 1.2);
      [[1660, C.poor, "coin"], [1900, C.laziness, "brain"], [2140, C.out, "door"]].forEach(([x, t0, kind]) => popAt(c, x, 330, pk(t, t0) * gone, (g) => {
        g.scale(1.25, 1.25); g.fillStyle = CREAM; g.beginPath(); g.roundRect(-85, -60, 170, 120, 16); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke();
        if (kind === "coin") { coin(g, 0, 0, 38, 0); g.strokeStyle = PAL.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(-6, -36); g.lineTo(6, -8); g.lineTo(-4, 10); g.lineTo(8, 36); g.stroke(); }
        if (kind === "brain") { g.fillStyle = "#e8a5b8"; for (const [bx, by, r] of [[-18, -8, 22], [10, -14, 24], [20, 10, 20], [-12, 14, 20]]) { g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); } g.strokeStyle = PAL.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(-8, 0, 4, 28); g.stroke(); serif(g, "z", 46, -30, 26, "#1b2440"); serif(g, "z", 60, -48, 20, "#1b2440"); }
        if (kind === "door") { g.fillStyle = "#6b4a2a"; g.fillRect(-26, -44, 52, 88); g.fillStyle = "#ffe6a8"; g.fillRect(-26, -44, 52 * 0.45, 88); g.strokeStyle = PAL.ink; g.lineWidth = 3; g.strokeRect(-26, -44, 52, 88); }
      }));
      const bd = seg(t, C.cheapA, C.cheapA + 0.45); if (bd > 0 && gone > 0) { c.save(); c.globalAlpha = gone; boot(c, 2130, lerp(-200, 378, easeIn(bd)), 42, { cheap: true, split: 0.7 }); c.restore(); if (bd >= 1) burst(c, 2140, 378, seg(t, C.cheapA + 0.45, C.cheapA + 0.9), { r0: 10, r1: 70, n: 10, color: "rgba(243,236,214,0.9)" }); }
    }
    rain(c, 200, -900, 3400, 1800, LIVE, { n: t > C.rain2 && t < C.dry && mode === "open" ? 900 : 600 });
  }
  const streetCam = [[0, 1030, 872, 5.2], [1.6, 1030, 872, 5.0], [4.4, 1180, 690, 1.5], [8.2, 1480, 590, 1.05], [10.6, 1700, 560, 1.0], [C.works - 0.6, 1700, 520, 1.0],
    [C.dee - 1.2, 1900, 500, 0.95], [C.dry - 0.6, 1900, 520, 0.95], [C.dry - 0.1, 1900, 850, 3.0], [C.question - 0.9, 1900, 850, 3.0], [C.question + 0.3, 1900, 400, 0.85], [C.novel, 1900, 390, 0.83]];

  // ================= BOOK (mustard): the novel and its city guard =================
  function bookArt(c, t) {
    c.strokeStyle = "rgba(60,40,15,0.5)"; c.lineWidth = 4; c.beginPath(); c.moveTo(-200, 860); c.lineTo(2200, 860); c.stroke();
    for (let i = 0; i < 26; i++) { const x = 40 + i * 80; c.beginPath(); c.ellipse(x, 885, 34, 12, 0, 0, TAU); c.stroke(); }
    const o = easeOut(seg(t, C.novel - 0.3, C.novel + 0.6)), cx = 900, cy = 520;
    c.save(); c.translate(cx, cy);
    c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.ellipse(0, 270, 380 + 120 * o, 26, 0, 0, TAU); c.fill();
    // left page swings out from the closed cover
    const lw = 340 * o;
    c.fillStyle = "#f4ead0"; c.fillRect(-lw, -230, lw, 460); c.fillRect(0, -230, 340, 460); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(-lw, -230, lw, 460); c.strokeRect(0, -230, 340, 460);
    c.strokeStyle = "rgba(40,30,20,0.45)"; c.lineWidth = 3; for (let k = 0; k < 11; k++) { const y = -190 + k * 36; if (o > 0.5) { c.beginPath(); c.moveTo(-lw + 30, y); c.lineTo(-30 - (k % 3) * 30, y); c.stroke(); } c.beginPath(); c.moveTo(30, y); c.lineTo(310 - (k % 4) * 30, y); c.stroke(); }
    if (o < 0.98) { c.save(); c.scale(1 - o, 1); c.fillStyle = "#7a2a24"; c.fillRect(0, -236, 350, 472); c.strokeRect(0, -236, 350, 472); c.fillStyle = "#e8c35a"; c.fillRect(60, -120, 230, 14); c.fillRect(90, -80, 170, 10); c.restore(); }
    c.restore();
    // the city guard walks out of the page onto the street
    const gk = seg(t, C.guard - 0.3, C.guard + 0.4), gx = lerp(1150, 1380, easeOut(seg(t, C.guard - 0.2, C.earned)));
    if (gk > 0) { c.save(); c.globalAlpha = gk; person(c, gx, 860, 330, false, PAL.ink); c.fillStyle = PAL.ink; c.beginPath(); c.ellipse(gx, 860 - 318, 44, 20, 0, Math.PI, TAU); c.fill();
      c.fillStyle = "#ffe6a8"; c.beginPath(); c.arc(gx + 70, 860 - 150, 14, 0, TAU); c.fill(); c.strokeStyle = PAL.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(gx + 50, 860 - 200); c.lineTo(gx + 70, 860 - 164); c.stroke(); c.restore(); }
    // his pay slip flutters down
    const sk = seg(t, C.earned - 0.2, C.month + 0.4);
    if (sk > 0) { const y = lerp(-240, 760, easeOut(sk)), r = 0.25 * Math.sin(sk * 9) * (1 - sk); c.save(); c.translate(1620, y); c.rotate(r); card(c, 0, 0, 280, 130); serif(c, "PAY", 0, -32, 28, "#8a2f2a"); serif(c, "$38 / month", 0, 18, 44, "#1b2440"); c.restore(); }
  }
  function bookText(c, t) { popAt(c, 900, 150, pk(t, C.pratchett), (g) => { card(g, 0, 0, 760, 110); serif(g, "Terry Pratchett · Men at Arms · 1993", 0, 4, 40, "#1b2440"); }); }
  const bookCam = [[C.novel - 1.2, 960, 540, 1.0], [C.good - 0.3, 1000, 520, 1.08]];

  // ================= BOARD (green): ten years of boots =================
  const LX = 390, YR = 120, WY = 360, DY = 740;          // lane start x, px per year, lane baselines
  const pairT = (() => { const a = [C.cheapB, C.therefore + 0.6, C.again2, C.again3, C.again4]; for (let i = 5; i < 10; i++) a.push(lerp(C.again4 + 0.45, C.hundred - 0.35, (i - 5) / 4)); return a; })();
  const money = (v) => "$" + Math.round(v);
  function lane(c, t, y, name) {
    serif(c, name, 190, y - 40, 56, CREAM);
    c.strokeStyle = "rgba(243,236,214,0.8)"; c.lineWidth = 4; c.beginPath(); c.moveTo(LX, y + 40); c.lineTo(LX + 10 * YR, y + 40); c.stroke();
    for (let k = 0; k <= 10; k++) { c.beginPath(); c.moveTo(LX + k * YR, y + 32); c.lineTo(LX + k * YR, y + 48); c.stroke(); if (k % 5 === 0) serif(c, k === 0 ? "yr 0" : `yr ${k}`, LX + k * YR, y + 72, 24, "rgba(243,236,214,0.75)"); }
  }
  function boardArt(c, t) {
    const lanesA = 1 - seg(t, C.key - 0.2, C.key + 0.4);
    c.save(); c.globalAlpha = lanesA;
    lane(c, t, WY, "WICK"); lane(c, t, DY, "DEE");
    // Dee: one good pair, a bar across all ten years
    popAt(c, LX + 20, DY, pk(t, C.good + 0.2), (g) => boot(g, 0, 0, 70, {}));
    const db = easeOut(seg(t, C.tenYears - 0.3, C.tenYears + 0.9)); if (db > 0) { c.fillStyle = "#c9a45a"; c.fillRect(LX, DY + 12, 10 * YR * db, 18); }
    // the month's pay vs the boots (between the lanes)
    const mk = pk(t, C.pay2 - 0.4) * (1 - seg(t, C.cheapB - 0.3, C.cheapB)); if (mk > 0) { c.save(); c.globalAlpha *= mk;
      c.fillStyle = "#8fbf9a"; c.fillRect(700, 520, 38 * 9, 34); c.fillStyle = GOLD; c.fillRect(700, 580, 50 * 9, 34); serif(c, "a month's pay  $38", 700 + 38 * 9 + 20, 537, 36, CREAM, "left"); serif(c, "good boots  $50", 700 + 50 * 9 + 20, 597, 36, CREAM, "left"); c.restore(); }
    // Wick: a new cheap pair every year; each old pair cracks and turns grey
    // Wick: a new cheap pair every year; each old pair stays in its year slot, cracked and greyed
    pairT.forEach((t0, i) => { if (t < t0) return; const dead = i < 9 && t > (pairT[i + 1] ?? 1e9); const x = LX + 20 + i * YR;
      popAt(c, x, WY, pk(t, t0, 0.3), (g) => { g.save(); if (dead) g.globalAlpha *= 0.45; boot(g, 0, 0, 58, { cheap: true, split: dead ? 1 : 0.2, crack: dead ? 1 : 0 }); g.restore(); });
      const bk = easeOut(seg(t, t0 + 0.1, t0 + 0.5)); c.fillStyle = dead ? "rgba(160,150,130,0.6)" : "#a08a70"; c.fillRect(LX + i * YR + 2, WY + 12, (YR - 4) * bk, 18); });
    if (t > C.season + 0.4 && t < pairT[1]) burst(c, LX + YR, WY + 20, seg(t, C.season + 0.4, C.season + 0.9), { r0: 6, r1: 40, n: 8, color: "rgba(243,236,214,0.9)" });
    // the empty wallet by his name when he can't find fifty at once
    popAt(c, 190, WY + 60, pk(t, C.fiftyD) * (1 - seg(t, C.key - 0.4, C.key)), (g) => { g.scale(1.5, 1.5); g.fillStyle = "#6b4a2a"; g.beginPath(); g.roundRect(-44, -26, 88, 52, 10); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); serif(g, "$0", 0, 2, 26, CREAM); });
    c.restore();
    // ---- the key: not too expensive; too expensive all at once ----
    const kk = seg(t, C.key - 0.1, C.key + 0.5);
    if (kk > 0) {
      c.strokeStyle = "rgba(243,236,214,0.85)"; c.lineWidth = 5; c.beginPath(); c.moveTo(200, 930); c.lineTo(1720, 930); c.stroke();
      wk(c, 620, 125, t, [[0, "calm"], [C.all, "grimace"], [C.trap, "worried"]], [[0, "present"], [C.all, "reach"]], { y: 930, seed: 4, boots: "cheap", split: 0.6 });
      coat(c, 620, 930, 125, "guard");
      const split = seg(t, C.expensive - 0.2, C.expensive + 0.4), join = easeIn(seg(t, C.all - 0.4, C.all));
      const tagY = lerp(520, 790, easeIn(seg(t, C.all, C.all + 0.35)));
      if (join < 1) for (let i = 0; i < 5; i++) { const tx = lerp(1150, 860 + i * 135, easeOut(split) * (1 - join)), ty = lerp(520, 540, split * (1 - join));
        popAt(c, tx, ty, kk, (g) => { if (split > 0.05) { coin(g, 0, 0, 54, 0); serif(g, "$10", 0, 3, 32, "#1b2440"); } else if (i === 2) { g.fillStyle = GOLD; g.beginPath(); g.roundRect(-120, -70, 240, 140, 18); g.fill(); g.lineWidth = 6; g.strokeStyle = PAL.ink; g.stroke(); serif(g, "$50", 0, 4, 80, "#1b2440"); } }); }
      if (join >= 1) { c.save(); c.translate(900, tagY); c.fillStyle = GOLD; c.beginPath(); c.roundRect(-150, -90, 300, 180, 20); c.fill(); c.lineWidth = 7; c.strokeStyle = PAL.ink; c.stroke(); serif(c, "$50", 0, 4, 96, "#1b2440");
        if (t > C.trap) { c.fillStyle = "#9aa3ad"; c.beginPath(); c.roundRect(-34, 60, 68, 54, 8); c.fill(); c.stroke(); c.lineWidth = 8; c.beginPath(); c.arc(0, 60, 24, Math.PI, TAU); c.stroke(); }
        c.restore(); if (t < C.all + 0.8) burst(c, 900, 880, seg(t, C.all + 0.35, C.all + 0.8), { r0: 20, r1: 160, n: 14, color: "rgba(243,236,214,0.9)" }); }
      if (t > C.all + 0.4) { sweat(c, 560, 930 - 330, 16, -0.5); sweat(c, 680, 930 - 350, 12, 0.5); }
      popAt(c, 1260, 700, pk(t, C.all + 0.5), (g) => { g.rotate(-0.12); g.strokeStyle = RED; g.lineWidth = 8; g.strokeRect(-150, -46, 300, 92); serif(g, "$50 TODAY", 0, 4, 48, RED); });
      // "you see it everywhere": the same trap in other places
      [["BANK", 300, 240], ["CAR", 700, 170], ["RENT", 1180, 170], ["FOOD", 1580, 240], ["PHONE", 1650, 520]].forEach(([k, x, y], i) => popAt(c, x, y, pk(t, C.everywhere + i * 0.16), (g) => {
        g.fillStyle = CREAM; g.beginPath(); g.roundRect(-90, -44, 180, 88, 14); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); serif(g, k, 0, 4, 38, "#1b2440"); }));
    }
  }
  function boardText(c, t) {
    const a = 1 - seg(t, C.key - 0.2, C.key + 0.4); if (a < 0.02) return;
    c.save(); c.globalAlpha = a;
    const wv = pairT.filter((t0) => t >= t0).length * 10, dv = t > C.fiftyG ? 50 : 0;
    serif(c, money(wv), 1720, WY - 10, 84, t > C.hundred ? GOLD : CREAM); serif(c, money(dv), 1720, DY - 10, 84, CREAM);
    popAt(c, 1720, WY + 90, pk(t, C.twice), (g) => { g.rotate(-0.15); g.strokeStyle = RED; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.stroke(); serif(g, "×2", 0, 4, 52, RED); });
    c.restore();
  }
  const boardCam = [[C.good - 0.3, 960, 560, 1.0], [C.after, 960, 540, 1.04], [C.key, 960, 560, 1.0], [C.everywhere, 960, 540, 0.96], [C.real, 960, 540, 0.95]];
  const street2Cam = [[C.real - 0.3, 1900, 420, 0.85], [END, 1880, 470, 0.93]];

  const S = {
    street: (t) => ({ bg: P.navy, cam: camKF(streetCam, t), art: (c) => streetArt(c, t, "open") }),
    book: (t) => ({ bg: P.mustard, cam: camKF(bookCam, t), art: (c) => bookArt(c, t), text: (c) => bookText(c, t) }),
    board: (t) => ({ bg: P.green, cam: camKF(boardCam, t), art: (c) => boardArt(c, t), text: (c) => boardText(c, t) }),
    street2: (t) => ({ bg: P.navy, cam: camKF(street2Cam, t), art: (c) => streetArt(c, t, "tax") }),
  };
  const order = [["street", 0], ["book", C.novel - 1.2], ["board", C.good - 0.3], ["street2", C.real - 0.3]];
  const TR = 0.7;
  return {
    duration: END, fps: 60, out,
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
