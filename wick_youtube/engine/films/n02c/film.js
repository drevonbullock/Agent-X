// N02 · FILM C ("Here's how the trap works" → the end): THE TURN, PAYOFF, CLOSE. Cued to films/n02/words.json,
// smooth camera, 60 fps. The subscribe lower-third runs over the last 9 s and the film fades out at the end.
//   node render.mjs --film n02c --sheet 310,320,326,339,348,358,365,377,388,402,414,424 --cols 4 --name s1
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, inkWick, mood, pose, sweat, sparkle, makeStage, burst } from "../../lib2d/ink.js";
import { boot, puddle, jar, coin } from "../../lib2d/props.js";
import { camSmooth as camKF, pk, popAt, card, serif, coat, scarf } from "../../lib2d/scene.js";
import { watermark, subscribeCTA, endFade } from "../../lib2d/brand.js";
import { TAU, G, CREAM, RED, GOLD, INKBLUE, cityBack, parkedCar, brokeHud, personIcon } from "../n02/kit.js";
let LIVE = 0;

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const words = await (await fetch("films/n02/words.json")).json();
  const T0 = 305.1;   // film B ends at 305.7; this film crossfades in over its last 0.6 s
  const cue = (w, after = T0 - 1) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
  const C = {};
  ["here's", "savings", "something", "therefore", "expensive", "less", "round", "rare", "third", "emergency", "surprise", "spins", "look", "spinning",
    "cushion", "slows", "remember", "dee", "smarter", "harder", "fifty", "jar", "wore", "numbers", "survey", "nine", "overdraft", "plenty", "another",
    "half", "worrying", "way", "week", "twenty", "enough", "left", "receipt", "stops", "quieter", "plan", "step", "open", "separate", "set", "move",
    "much", "high", "percent", "grows", "buy", "question", "yes", "being", "flaw", "price", "stop", "time"].forEach((w) => (C[w] = cue(w)));
  C.way = cue("way", C.worrying); C.week = cue("week", C.way); C.much = cue("much", C.move);   // these words also appear earlier in this film
  C.no = cue("no", C["here's"]); C.breaks = cue("breaks", C.something); C.fee = cue("fee", C.expensive); C.loan = cue("loan", C.fee); C.pack = cue("pack", C.loan);
  C.therefore2 = cue("therefore", C.less); C.still = cue("still", C.therefore2); C.four = cue("four", C.third); C.cash = cue("cash", C.emergency);
  C.but = cue("but", C.spins); C.link = cue("link", C.spinning); C.break2 = cue("break", C.cushion); C.boots = cue("boots", C.jar);
  C.cheap = cue("cheap", C.way); C.ten = cue("ten", C.cheap); C.five = cue("five", C.week); C.four2 = cue("four", C.enough);
  C.next = cue("next", C.left); C.breaks2 = cue("breaks", C.next); C.pays = cue("pays", C.breaks2); C.fee2 = cue("fee", C.pays); C.loan2 = cue("loan", C.fee2); C.loop = cue("loop", C.receipt);
  C.tonight = cue("tonight", C.step); C.boots2 = cue("boots", C.separate); C.every = cue("every", C.move); C.five2 = cue("five", C.much); C.yield = cue("yield", C.high);
  C.cheap2 = cue("cheap", C.buy); C.again = cue("again", C.question); C.boots3 = cue("boots", C.yes); C.poor = cue("poor", C.being); C.paying = cue("paying", C.stop); C.ten3 = cue("ten", C.paying);
  const END = 430;
  const P = { navy: paper(W, H, PAL.navy, 11), green: paper(W, H, PAL.green, 23), cream: paper(W, H, "#e9dcc2", 17), dawn: paper(W, H, "#3d3470", 19) };
  const wk = (c, x, s, t, faces, poses, o = {}) => inkWick(c, x, o.y ?? G, s, { ...mood(t, faces), arms: pose(t, poses), t: LIVE, ...o });
  const walkO = (t, t0, t1, sp = 1.15) => (t > t0 && t < t1 ? { walk: t * sp, dy: -0.035 * Math.abs(Math.sin(t * sp * TAU)) } : {});
  const tag = (g, txt, w = 220, h = 90, fill = CREAM, col = INKBLUE, size = 44) => { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 8, w, h, 14); g.fill();
    g.fillStyle = fill; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 14); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); serif(g, txt, 0, 3, size, col); };
  const bar = (c, x, y, w, h, col, k = 1) => { c.fillStyle = col; c.fillRect(x, y, w * k, h); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(x, y, w * k, h); };
  const cross = (g, k, r = 70) => { if (k <= 0) return; g.strokeStyle = RED; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(-r, -r * 0.6); g.lineTo(-r + 2 * r * Math.min(1, k * 2), -r * 0.6 + 1.2 * r * Math.min(1, k * 2)); if (k > 0.5) { g.moveTo(r, -r * 0.6); g.lineTo(r - 2 * r * (k - 0.5) * 2, -r * 0.6 + 1.2 * r * (k - 0.5) * 2); } g.stroke(); };

  // ================= LOOP (green board: the trap as a track Wick runs around) =================
  const LC = [760, 560], LR = 300;
  const stations = () => [[-Math.PI / 2, "NO CUSHION", C.no], [0, "SOMETHING BREAKS", C.breaks], [Math.PI / 2, "PAY THE EXPENSIVE WAY", C.expensive], [Math.PI, "LESS MONEY", C.less]];
  function loopArt(c, t) {
    const cut = seg(t, C.break2, C.break2 + 0.4), gap = 0.22 * cut;
    // the track draws itself station by station
    const drawn = clamp((t > C.no ? 0.0 : 0) + 0.25 * seg(t, C.no, C.breaks) + 0.25 * seg(t, C.breaks, C.expensive) + 0.25 * seg(t, C.expensive, C.less) + 0.25 * seg(t, C.less, C.still), 0, 1);
    c.save(); c.strokeStyle = "rgba(243,236,214,0.85)"; c.lineWidth = 14; c.lineCap = "round"; c.beginPath(); c.arc(LC[0], LC[1], LR, -Math.PI / 2 + gap, -Math.PI / 2 + gap + (TAU - 2 * gap) * drawn); c.stroke();
    for (let k = 0; k < 4; k++) { const a = -Math.PI / 4 + k * Math.PI / 2; if (drawn * 4 > k + 0.55) { const ax = LC[0] + Math.cos(a) * LR, ay = LC[1] + Math.sin(a) * LR, d = a + Math.PI / 2; c.fillStyle = CREAM; c.beginPath(); c.moveTo(ax + Math.cos(d) * 26, ay + Math.sin(d) * 26); c.lineTo(ax + Math.cos(d + 2.4) * 22, ay + Math.sin(d + 2.4) * 22); c.lineTo(ax + Math.cos(d - 2.4) * 22, ay + Math.sin(d - 2.4) * 22); c.closePath(); c.fill(); } }
    c.restore();
    stations().forEach(([a, label, t0], i) => { const x = LC[0] + Math.cos(a) * LR, y = LC[1] + Math.sin(a) * LR, hot = i === 0 && t > C.cushion - 0.3;
      popAt(c, x, y, pk(t, t0), (g) => { tag(g, label, i === 2 ? 470 : 360, 84, hot ? (Math.sin(LIVE * 10) > 0 ? "#ff8a7a" : "#f3b4a8") : (i === 0 ? GOLD : CREAM), INKBLUE, 36); }); });
    // the expensive way: a fee, a loan, the small pack
    [["$35 fee", C.fee, -190], ["loan", C.loan, 0], ["small pack", C.pack, 190]].forEach(([txt, t0, dx]) => popAt(c, LC[0] + dx, LC[1] + LR + 110, pk(t, t0) * (1 - seg(t, C.rare - 0.4, C.rare)), (g) => tag(g, txt, 170, 64, RED, CREAM, 30)));
    // Wick runs round it, faster each lap, until the link is cut and he stumbles off
    const runT0 = C.round - 0.4, stopT = C.slows; if (t > runT0) {
      const lapT = (tt) => { const d = tt - runT0; return 0.35 * d + 0.03 * d * d; };
      const ang = -Math.PI / 2 + TAU * lapT(Math.min(t, stopT)) + (t > stopT ? 0.6 * easeOut(seg(t, stopT, stopT + 0.8)) : 0);
      const off = t > stopT ? 160 * easeOut(seg(t, stopT, stopT + 0.8)) : 0, rr = LR + 40 + off;
      const x = LC[0] + Math.cos(ang) * rr, y = LC[1] + Math.sin(ang) * rr;
      wk(c, x, 80, t, [[0, "determined"], [C.surprise, "worried"], [C.spins, "weary"], [C.slows, "shocked"], [C.slows + 0.9, "curious"]], [[0, "reach"], [C.slows, "cheer"], [C.slows + 0.9, "rest"]], { y, rot: ang + Math.PI / 2 + (t > stopT ? 0.5 * Math.sin(Math.min(1, (t - stopT) * 2) * Math.PI) : 0), seed: 3, boots: "cheap", split: 0.4, ...(t < stopT ? { walk: t * 3, dy: -0.05 * Math.abs(Math.sin(t * 3 * TAU)) } : {}) }); }
    // it's not rare: 37 in 100 can't cover $400 in cash
    const rk = pk(t, C.rare) * (1 - seg(t, C.look - 0.4, C.look)); if (rk > 0.01) { c.save(); c.translate(1610, 520); c.scale(rk * 0.88, rk * 0.88); card(c, 0, 0, 640, 560);
      for (let i = 0; i < 100; i++) personIcon(c, -225 + (i % 10) * 50, -215 + Math.floor(i / 10) * 36, 28, i < 37 && t > C.third ? "#8a93a6" : "#4fa36a");
      serif(c, "37 in 100 adults", 0, 280 - 60 - 30, 40, INKBLUE); serif(c, "couldn't cover $400 in cash", 0, 280 - 60 + 14, 32, "#8a2f2a"); c.restore(); }
    // the snip
    const sk = seg(t, C.break2 - 0.35, C.break2 + 0.2); if (sk > 0 && sk < 1) { c.save(); c.translate(LC[0], LC[1] - LR); const o = 0.6 * (1 - sk); c.strokeStyle = "#cfd6de"; c.lineWidth = 12; c.lineCap = "round";
      for (const sgn of [-1, 1]) { c.save(); c.rotate(sgn * o); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -140); c.stroke(); c.restore(); } c.restore(); }
    if (t > C.break2 + 0.1 && t < C.break2 + 0.9) burst(c, LC[0], LC[1] - LR, seg(t, C.break2 + 0.1, C.break2 + 0.9), { r0: 20, r1: 160, n: 14, color: "rgba(243,236,214,0.9)" });
  }
  function loopText(c, t) {
    const bk = seg(t, C.four - 0.2, C.four + 0.5); if (bk > 0 && t < C.look - 0.2) { c.save(); c.translate(LC[0] + LR, lerp(LC[1] - 700, LC[1] - 95, easeIn(bk))); tag(c, "$400 repair", 240, 74, GOLD, INKBLUE, 34); c.restore(); }
  }
  const loopCam = [[T0, 960, 560, 1.0], [C.rare - 0.3, 1000, 540, 0.98], [C.look, 960, 560, 1.0], [C.cushion, 780, 330, 1.45], [C.slows + 0.2, 820, 420, 1.15], [C.remember - 0.5, 900, 480, 1.05]];

  // ================= LOCKER (the guard hut: Dee's BOOTS jar from the opening) =================
  function lockerArt(c, t) {
    c.fillStyle = "#3b4a6b"; c.fillRect(-1000, -1000, 4000, 3000); c.fillStyle = "#2a3550"; c.fillRect(-1000, G, 4000, 600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-1000, G); c.lineTo(3000, G); c.stroke();
    for (const x of [1180, 1420, 1660]) { c.fillStyle = "#5a6b8c"; c.fillRect(x - 110, G - 620, 220, 620); c.lineWidth = 5; c.strokeRect(x - 110, G - 620, 220, 620); c.fillStyle = "#3b4a6b"; for (let k = 0; k < 4; k++) c.fillRect(x - 60, G - 580 + k * 22, 120, 8); c.fillStyle = "#cfd6de"; c.fillRect(x + 70, G - 330, 14, 50); }
    c.fillStyle = "#8a6a2b"; c.fillRect(380, G - 420, 520, 22); c.strokeRect(380, G - 420, 520, 22); for (const bx of [430, 850]) { c.beginPath(); c.moveTo(bx, G - 398); c.lineTo(bx, G - 340); c.lineTo(bx + (bx < 600 ? 40 : -40), G - 398); c.closePath(); c.fillStyle = "#6b4a2a"; c.fill(); c.stroke(); }
    const tip = easeInOut(seg(t, C.fifty - 0.4, C.fifty + 0.3)), jarFill = 0.75 * (1 - seg(t, C.fifty, C.jar + 0.4));
    c.save(); c.translate(640, G - 420); c.rotate(-1.1 * tip * (1 - seg(t, C.wore, C.wore + 0.6))); jar(c, 0, 0, 170, { fill: jarFill, label: "BOOTS" }); c.restore();
    if (t > C.fifty && t < C.wore + 0.8) for (let i = 0; i < 9; i++) { const k = seg(t, C.fifty + i * 0.1, C.fifty + i * 0.1 + 0.8); if (k <= 0 || k >= 1) continue; coin(c, 560 - k * 40 + i * 6, G - 470 + easeIn(k) * 360, 18, LIVE * 4 + i); }
    popAt(c, 640, G - 640, pk(t, C.fifty + 0.4) * (1 - seg(t, C.boots + 0.8, C.boots + 1.2)), (g) => tag(g, "$50", 150, 74, GOLD, INKBLUE, 44));
    wk(c, 1000, 160, t, [[0, "calm"], [C.smarter, "wink"], [C.harder, "calm"], [C.boots, "happy"]], [[0, "rest"], [C.smarter, "shrug"], [C.fifty - 0.5, "reach"], [C.boots, "present"]], { seed: 7, flip: true, boots: t > C.boots ? "good" : "cheap", split: 0.2 }); coat(c, 1000, G, 160, "guard"); scarf(c, 1000, G, 160, "#c0392b", 0, LIVE);
    const bk = pk(t, C.boots); if (bk > 0.01) { popAt(c, 760, G - 120, bk, (g) => { boot(g, 0, 60, 90, {}); boot(g, 70, 60, 90, {}); }); if (t < C.boots + 1) sparkle(c, 800, G - 130, 24 * (1 - seg(t, C.boots, C.boots + 1))); }
    wk(c, 1520, 150, t, [[0, "curious"], [C.boots, "starstruck"]], [[0, "rest"], [C.boots, "chin"]], { seed: 3, flip: true, boots: "cheap", split: 0.5 }); coat(c, 1520, G, 150, "guard");
  }
  const lockerCam = [[C.remember - 0.5, 900, 540, 1.0], [C.fifty - 0.6, 760, 500, 1.18], [C.numbers - 0.8, 900, 520, 1.05]];

  // ================= NUMBERS (green board: savings vs overdrafts, and worry time) =================
  function numbersArt(c, t) {
    popAt(c, 460, 520, pk(t, C.survey - 0.4), (g) => { jar(g, 0, 150, 260, { fill: 0, label: "EMPTY" }); });
    popAt(c, 1460, 520, pk(t, C.survey - 0.1), (g) => { jar(g, 0, 150, 260, { fill: 0.8, label: "SAVED" }); });
    const ok = easeOut(seg(t, C.nine - 0.4, C.overdraft + 0.4)), wkk = easeOut(seg(t, C.another, C.half + 0.3));
    if (ok > 0 && t < C.another) { serif(c, "overdrafted last year", 960, 240, 40, CREAM);
      c.fillStyle = RED; c.fillRect(780, 760 - 380 * ok, 120, 380 * ok); c.fillStyle = "#4fa36a"; c.fillRect(1020, 760 - 380 * (4 / 35) * ok, 120, 380 * (4 / 35) * ok); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(780, 760 - 380 * ok, 120, 380 * ok); c.strokeRect(1020, 760 - 380 * (4 / 35) * ok, 120, 380 * (4 / 35) * ok);
      serif(c, "35%", 840, 760 - 380 * ok - 36, 48, CREAM); serif(c, "4%", 1080, 760 - 380 * (4 / 35) * ok - 36, 48, CREAM);
      popAt(c, 960, 860, pk(t, C.nine), (g) => tag(g, "almost 9× as likely", 380, 74, RED, CREAM, 36)); }
    if (wkk > 0) { serif(c, "hours a week worrying about money", 960, 240, 40, CREAM);
      for (const [x, h, col] of [[840, 7.3, RED], [1080, 3.7, "#4fa36a"]]) { c.save(); c.translate(x, 520); c.fillStyle = CREAM; c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.fill(); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.stroke();
        c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 92, -Math.PI / 2, -Math.PI / 2 + TAU * (h / 12) * wkk); c.closePath(); c.fill(); serif(c, h + " hrs", 0, 150, 44, CREAM); c.restore(); }
      popAt(c, 960, 860, pk(t, C.half), (g) => tag(g, "about half", 260, 74, "#4fa36a", CREAM, 38)); }
  }
  const numbersCam = [[C.numbers - 0.8, 960, 560, 1.0], [C.another, 960, 540, 1.02], [C.way - 1.0, 960, 540, 1.04]];

  // ================= JAR ($10 a week: 52 squares, past the $400 line) =================
  function jarArt(c, t) {
    c.fillStyle = "#3b4a6b"; c.fillRect(-1000, -1000, 4000, 3000); c.fillStyle = "#6b4a2a"; c.fillRect(-1000, G - 40, 4000, 50); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(-1000, G - 40, 4000, 50);
    const wkN = Math.floor(52 * easeInOut(seg(t, C.week - 0.2, C.twenty + 0.6)));
    jar(c, 520, G - 40, 300, { fill: 0.92 * wkN / 52, label: "BOOTS" });
    wk(c, 260, 170, t, [[0, "curious"], [C.ten, "determined"], [C.enough, "happy"], [C.left, "joy"]], [[0, "rest"], [C.ten - 0.3, "reach"], [C.ten + 1.2, "rest"], [C.left, "cheer"]], { y: G - 40, seed: 3, boots: "cheap", split: 0.4 }); coat(c, 260, G - 40, 170, "guard");
    // "less than one pair of cheap boots": $10 next to the cheap boot
    const ck = pk(t, C.cheap - 0.2) * (1 - seg(t, C.week - 0.4, C.week)); popAt(c, 1150, 330, ck, (g) => { card(g, 0, 0, 520, 220); boot(g, -130, 60, 90, { cheap: true, split: 0.5 }); serif(g, "=", 0, 0, 70, INKBLUE); g.fillStyle = "#9fd88c"; g.fillRect(70, -40, 160, 80); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.strokeRect(70, -40, 160, 80); serif(g, "$10", 150, 2, 44, "#14401f"); });
    // the 52-week grid, a $400 line at week 40
    if (t > C.week - 0.4) { c.save(); c.globalAlpha = seg(t, C.week - 0.4, C.week); for (let i = 0; i < 52; i++) { const x = 900 + (i % 13) * 66, y = 230 + Math.floor(i / 13) * 70; c.fillStyle = i < wkN ? (i < 40 ? GOLD : "#4fa36a") : "rgba(243,236,214,0.15)"; c.fillRect(x, y, 56, 58); c.lineWidth = 2; c.strokeStyle = "rgba(0,0,0,0.4)"; c.strokeRect(x, y, 56, 58); }
      serif(c, "52 weeks", 1290, 200, 34, CREAM); if (wkN >= 40) { c.strokeStyle = RED; c.lineWidth = 6; c.beginPath(); c.moveTo(900 + 1 * 66 - 6, 230 + 3 * 70 - 6); c.lineTo(900 + 1 * 66 - 6, 230 + 4 * 70); c.stroke(); serif(c, "$400 by week 40", 1290, 540, 36, "#ffb3a6"); } c.restore(); }
    popAt(c, 1290, 640, pk(t, C.twenty - 0.2), (g) => tag(g, "$10 × 52 = $520", 420, 84, GOLD, INKBLUE, 42));
    popAt(c, 1290, 760, pk(t, C.left - 0.2), (g) => tag(g, "$120 left over", 300, 70, "#4fa36a", CREAM, 34));
  }
  const jarCam = [[C.way - 1.0, 760, 560, 1.0], [C.week, 960, 520, 1.0], [C.next - 0.6, 980, 520, 1.02]];

  // ================= CARFIX (the next breakdown: paid in cash) =================
  function carfixArt(c, t) {
    cityBack(c, LIVE, { day: true, lamps: [150, 2600] });
    parkedCar(c, 700, G + 60, LIVE, { col: "#7a6a5a", smoke: seg(t, C.breaks2 - 0.2, C.breaks2 + 0.4) * (1 - seg(t, C.receipt, C.receipt + 1)), hood: 1, s: 1.15 });
    wk(c, 1180, 155, t, [[0, "calm"], [C.pays, "happy"]], [[0, "rest"], [C.pays - 0.2, "present"]], { seed: 71 }); coat(c, 1180, G, 155, "captain");
    wk(c, 1520, 165, t, [[0, "alarmed"], [C.pays, "determined"], [C.receipt, "happy"], [C.quieter, "calm"], [C.plan, "joy"]], [[0, "rest"], [C.pays - 0.3, "reach"], [C.receipt + 0.5, "rest"], [C.plan, "cheer"]], { seed: 3, flip: true, boots: "cheap", split: 0.3 }); coat(c, 1520, G, 165, "guard");
    jar(c, 1700, G, 90, { fill: 0.5, label: "BOOTS" });
    const mk = easeOut(seg(t, C.pays, C.pays + 0.7)); if (mk > 0 && t < C.receipt) for (let i = 0; i < 3; i++) { c.save(); c.translate(lerp(1430, 1290, mk) - i * 12, G - 330 + i * 10); c.fillStyle = "#9fd88c"; c.fillRect(-60, -28, 120, 56); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-60, -28, 120, 56); serif(c, "$100", 0, 2, 26, "#14401f"); c.restore(); }
    popAt(c, 1000, 260, pk(t, C.fee2 - 0.3) * (1 - seg(t, C.receipt - 0.2, C.receipt + 0.1)), (g) => { tag(g, "fee", 160, 70, CREAM, INKBLUE, 36); cross(g, seg(t, C.fee2, C.fee2 + 0.4), 70); });
    popAt(c, 1260, 260, pk(t, C.loan2 - 0.3) * (1 - seg(t, C.receipt - 0.2, C.receipt + 0.1)), (g) => { tag(g, "loan", 160, 70, CREAM, INKBLUE, 36); cross(g, seg(t, C.loan2, C.loan2 + 0.4), 70); });
    const rk = seg(t, C.receipt - 0.2, C.receipt + 0.8); if (rk > 0) { c.save(); c.translate(1130, 170); c.fillStyle = "#fbf8ef"; c.fillRect(-130, 0, 260, 260 * easeOut(rk)); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(-130, 0, 260, 260 * easeOut(rk));
      if (rk > 0.6) { serif(c, "RECEIPT", 0, 50, 34, INKBLUE); serif(c, "PAID", 0, 120, 52, "#2f7a5a"); serif(c, "cash", 0, 180, 32, INKBLUE); } c.restore(); }
  }
  function carfixOver(c, t) {
    const k = seg(t, C.loop - 0.6, C.loop - 0.2) * (1 - seg(t, C.plan + 0.2, C.plan + 0.7)); if (k <= 0) return;
    const fl = seg(t, C.stops, C.stops + 0.5); brokeHud(c, k, 8085 * (1 - easeInOut(fl)), 0, fl > 0 && fl < 1 ? 1 - fl : 0);
    if (t > C.stops && t < C.stops + 1) burst(c, 1030, 62, seg(t, C.stops, C.stops + 1), { r0: 20, r1: 140, n: 14, color: "rgba(247,178,27,0.9)" });
  }
  const carfixCam = [[C.next - 0.6, 900, 540, 1.0], [C.pays, 1200, 520, 1.02], [C.receipt, 1150, 500, 1.0], [C.step - 0.6, 1200, 520, 1.03]];

  // ================= PHONE (set it up tonight: an account named BOOTS, $10 a week) =================
  function phoneArt(c, t) {
    c.fillStyle = "#26314d"; c.fillRect(-1000, -1000, 4000, 3000);
    c.save(); c.translate(960, 540); c.fillStyle = "#14191f"; c.beginPath(); c.roundRect(-270, -480, 540, 960, 60); c.fill(); c.lineWidth = 8; c.strokeStyle = PAL.ink; c.stroke();
    c.fillStyle = "#f6f1e3"; c.beginPath(); c.roundRect(-235, -430, 470, 860, 34); c.fill();
    const s1 = t > C.open - 0.2, s2 = t > C.boots2 - 0.6, s3 = t > C.set - 0.2;
    if (s1) { serif(c, "NEW SAVINGS ACCOUNT", 0, -360, 34, INKBLUE); c.fillStyle = "#e3dcc8"; c.beginPath(); c.roundRect(-190, -300, 380, 90, 16); c.fill(); serif(c, "Name", -170, -320, 24, "#8a2f2a", "left");
      const name = "BOOTS".slice(0, Math.floor(5 * seg(t, C.boots2 - 0.6, C.boots2 + 0.2))); serif(c, name + (s2 && name.length < 5 && Math.sin(LIVE * 12) > 0 ? "|" : ""), 0, -248, 52, INKBLUE); }
    if (s3) { c.fillStyle = "#e3dcc8"; c.beginPath(); c.roundRect(-190, -160, 380, 160, 16); c.fill(); serif(c, "AUTO-TRANSFER", 0, -122, 30, "#8a2f2a");
      const five = seg(t, C.much, C.much + 0.3) * (1 - seg(t, C.five2 + 0.8, C.five2 + 1.2)); serif(c, five > 0.5 ? "$5 / week" : "$10 / week", 0, -62, 54, INKBLUE);
      const on = easeOut(seg(t, C.every - 0.1, C.every + 0.3)); c.fillStyle = on > 0.5 ? "#4fa36a" : "#b9b2a2"; c.beginPath(); c.roundRect(-70, 40, 140, 70, 35); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(lerp(-35, 35, on), 75, 28, 0, TAU); c.fill(); serif(c, on > 0.5 ? "ON" : "OFF", 0, 140, 30, INKBLUE); }
    popAt(c, 0, 250, pk(t, C.yield - 0.2), (g) => tag(g, "≈ 4% a year", 300, 80, GOLD, INKBLUE, 42));
    if (t > C.grows - 0.3) { c.save(); c.translate(0, 360); jar(c, -50, 40, 90, { fill: 0.35 + 0.1 * seg(t, C.grows - 0.3, C.grows + 1.5), label: "" }); c.strokeStyle = "#4fa36a"; c.lineWidth = 8; c.beginPath(); c.moveTo(40, 20); c.lineTo(110, -50); c.moveTo(80, -50); c.lineTo(110, -50); c.lineTo(110, -20); c.stroke(); c.restore(); }
    c.restore();
    wk(c, 1460, 160, t, [[0, "calm"], [C.open, "determined"], [C.every, "joy"], [C.much, "calm"], [C.grows, "happy"]], [[0, "rest"], [C.open - 0.3, "point"], [C.every + 0.6, "rest"], [C.grows, "cheer"]], { seed: 3, flip: true, boots: "cheap", split: 0.2 }); coat(c, 1460, G, 160, "guard");
  }
  const phoneCam = [[C.step - 0.6, 1000, 560, 1.0], [C.set, 960, 500, 1.06], [C.buy - 1.0, 980, 520, 1.03]];

  // ================= SHELF (the boots test: "will I be buying this again next year?") =================
  function shelfArt(c, t) {
    c.fillStyle = "#efe2c4"; c.fillRect(-1000, -1000, 4000, G + 1000); c.fillStyle = "#b98a5a"; c.fillRect(-1000, G, 4000, 600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-1000, G); c.lineTo(3000, G); c.stroke();
    c.fillStyle = "#6b4a2a"; c.fillRect(300, G - 330, 1320, 26); c.strokeRect(300, G - 330, 1320, 26);
    // a cheap charger, a cheap pan, cheap sneakers
    c.save(); c.translate(520, G - 330); c.scale(1.5, 1.5); c.fillStyle = "#f3ecd6"; c.fillRect(-50, -90, 100, 90); c.strokeRect(-50, -90, 100, 90); c.strokeStyle = "#333"; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -90); c.bezierCurveTo(80, -170, -60, -200, 40, -260); c.stroke(); c.restore();
    c.save(); c.translate(960, G - 330); c.scale(1.4, 1.4); c.fillStyle = "#3a3a3a"; c.beginPath(); c.ellipse(0, -40, 120, 34, 0, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.fillRect(110, -50, 160, 20); c.strokeRect(110, -50, 160, 20); c.restore();
    c.save(); c.translate(1400, G - 330); c.scale(1.4, 1.4); c.fillStyle = "#e8e2d4"; c.beginPath(); c.moveTo(-130, 0); c.lineTo(-120, -70); c.quadraticCurveTo(-30, -90, 20, -50); c.quadraticCurveTo(110, -40, 130, 0); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = "#c0392b"; c.fillRect(-120, -10, 250, 10); c.restore();
    [[520, 0], [960, 0.25], [1400, 0.5]].forEach(([x, d], i) => { const fl = Math.abs(Math.cos(Math.PI * seg(t, C.question + d - 0.25, C.question + d + 0.25))), back = t > C.question + d;
      popAt(c, x, G - 160, pk(t, C.cheap2 + d * 0.6), (g) => { g.scale(1, Math.max(0.05, fl)); g.fillStyle = back ? (i === 2 && t > C.yes ? "#f3b4a8" : "#f3dcae") : CREAM; g.beginPath(); g.roundRect(-150, -50, 300, 100, 14); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke();
        if (back) { serif(g, "again", 0, -14, 34, INKBLUE); serif(g, "next year?", 0, 24, 30, INKBLUE); } else serif(g, "cheap", 0, 4, 36, INKBLUE); }); });
    popAt(c, 1400, G - 640, pk(t, C.boots3 - 0.2), (g) => { card(g, 0, 0, 380, 190); boot(g, -90, 60, 110, { cheap: true, split: 0.8, crack: 1 }); serif(g, "= boots", 60, 0, 52, "#8a2f2a"); });
    wk(c, 160, 165, t, [[0, "curious"], [C.question, "thinking"], [C.yes, "skeptical"], [C.boots3, "wink"]], [[0, "rest"], [C.question, "chin"], [C.boots3, "point"]], { seed: 3, boots: "cheap", split: 0.3 }); coat(c, 160, G, 165, "guard");
  }
  const shelfCam = [[C.buy - 1.0, 880, 560, 1.0], [C.question, 900, 520, 1.0], [C.being - 0.6, 960, 500, 1.03]];

  // ================= DAWN (same street, same puddle, good boots: no splash) =================
  function dawnArt(c, t) {
    const sky = c.createLinearGradient(0, -900, 0, G); sky.addColorStop(0, "#3d3470"); sky.addColorStop(0.55, "#c46f8f"); sky.addColorStop(1, "#f6b583"); c.fillStyle = sky; c.fillRect(-2000, -2400, 8000, G + 2400);
    c.fillStyle = "#ffe6b0"; c.beginPath(); c.arc(1500, G - 120, 130, 0, TAU); c.fill();
    for (let i = 0; i < 16; i++) { const q = rng(i + 40), bx = -600 + i * 330 + q() * 60, bw = 220 + q() * 120, bh = 320 + q() * 420; c.fillStyle = i % 2 ? "#3a2e52" : "#45365e"; c.fillRect(bx, G - bh, bw, bh);
      for (let wy = G - bh + 30; wy < G - 70; wy += 56) for (let wx = bx + 22; wx < bx + bw - 30; wx += 48) if (q() < 0.18) { c.fillStyle = "rgba(255,214,150,0.6)"; c.fillRect(wx, wy, 22, 30); } }
    c.fillStyle = "#5a5470"; c.fillRect(-2000, G, 8000, 70); c.fillStyle = "#3e3a52"; c.fillRect(-2000, G + 70, 8000, 1400); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-2000, G); c.lineTo(6000, G); c.stroke();
    puddle(c, 1000, G, 250, LIVE);
    // Wick walks into the same puddle from the opening, in good boots: no splash, he looks down and grins
    const wx = lerp(700, 1000, easeInOut(seg(t, C.being - 0.6, C.poor + 0.4))), walking = t < C.poor + 0.4;
    wk(c, wx, 175, t, [[0, "calm"], [C.flaw, "curious"], [C.price, "joy"], [C.stop, "happy"]], [[0, "rest"], [C.price, "cheer"], [C.paying, "rest"]], { seed: 3, boots: "good", ...(walking ? walkO(t, C.being - 0.6, C.poor + 0.4) : {}) }); coat(c, wx, G, 175, "guard");
    if (t > C.flaw - 0.2 && t < C.flaw + 1.2) sparkle(c, wx + 40, G - 30, 22 * Math.sin(Math.PI * seg(t, C.flaw - 0.2, C.flaw + 1.2)));
    const dx = lerp(1700, 1260, easeInOut(seg(t, C.price, C.stop + 0.2)));
    if (t > C.price - 0.2) { wk(c, dx, 168, t, [[0, "happy"], [C.stop, "joy"]], [[0, "rest"], [C.stop, "present"]], { seed: 7, flip: true, boots: "good", ...walkO(t, C.price, C.stop + 0.2) }); coat(c, dx, G, 168, "guard"); scarf(c, dx, G, 168, "#c0392b", 0, LIVE); }
  }
  const dawnCam = [[C.being - 0.6, 980, 600, 1.15], [C.price, 1080, 560, 1.0], [END, 1100, 540, 0.95]];

  const S = {
    loop: (t) => ({ bg: P.green, cam: camKF(loopCam, t), art: (c) => loopArt(c, t), text: (c) => loopText(c, t) }),
    locker: (t) => ({ bg: P.navy, cam: camKF(lockerCam, t), art: (c) => lockerArt(c, t) }),
    numbers: (t) => ({ bg: P.green, cam: camKF(numbersCam, t), art: (c) => numbersArt(c, t) }),
    jar: (t) => ({ bg: P.navy, cam: camKF(jarCam, t), art: (c) => jarArt(c, t) }),
    carfix: (t) => ({ bg: P.navy, cam: camKF(carfixCam, t), art: (c) => carfixArt(c, t), over: (c) => carfixOver(c, t) }),
    phone: (t) => ({ bg: P.navy, cam: camKF(phoneCam, t), art: (c) => phoneArt(c, t) }),
    shelf: (t) => ({ bg: P.cream, cam: camKF(shelfCam, t), art: (c) => shelfArt(c, t) }),
    dawn: (t) => ({ bg: P.dawn, cam: camKF(dawnCam, t), art: (c) => dawnArt(c, t), over: (c) => { subscribeCTA(c, t, END - 9); endFade(c, t, END); } }),
  };
  const order = [["loop", T0], ["locker", C.remember - 0.5], ["numbers", C.numbers - 0.8], ["jar", C.way - 1.0], ["carfix", C.next - 0.6], ["phone", C.step - 0.6], ["shelf", C.buy - 1.0], ["dawn", C.being - 0.6]];
  const TR = 0.7;
  return {
    duration: END, fps: 60, out, start: T0,
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
