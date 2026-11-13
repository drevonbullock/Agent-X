// N02 · FILM B ("Tuesday" → "It's a trap"): CH2 The Broke Tax + CH3 The Tired Brain. Every build is cued to a word in
// films/n02/words.json. Smooth camera (camSmooth) and 60 fps, like film A.
//   node render.mjs --film n02b --sheet 112,120,125,136,150,158,166,175,195,206,215 --cols 4 --name s1
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, inkWick, mood, pose, sweat, sparkle, makeStage, burst } from "../../lib2d/ink.js";
import { boot, rain, puddle, jar, coin } from "../../lib2d/props.js";
import { camSmooth as camKF, pk, popAt, card, serif, coat, scarf } from "../../lib2d/scene.js";
import { watermark } from "../../lib2d/brand.js";
import { TAU, G, CREAM, RED, GOLD, INKBLUE, cityBack, parkedCar, brokeHud, personIcon, houseIcon, gauge, shawl, coffeeCup, shoutingBill } from "../n02/kit.js";
let LIVE = 0;

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const words = await (await fetch("films/n02/words.json")).json();
  const T0 = 110.28;   // film A ends at 110.88; this film crossfades in over its last 0.6 s
  const cue = (w, after = T0 - 1) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;   // only words in this film
  const C = {};
  ["tuesday", "account", "short", "bank", "anyway", "charges", "americans", "twelve", "group", "like", "banks", "completely", "million", "reason", "minimum",
    "march", "breaks", "friday", "payday", "yes", "fifteen", "percent", "weeks", "borrow", "rolled", "keeps", "store", "big", "roll", "today", "families",
    "bigger", "cash", "late", "lower", "great", "half", "bad", "eleven", "add", "price", "none", "harder", "afford", "plan", "budget", "shop", "miss", "study",
    "mall", "imagine", "repair", "test", "dropped", "think", "india", "sugarcane", "twice", "tight", "paid", "brains", "worse", "better", "sleep", "argue",
    "feeling", "bandwidth", "worry", "fight", "next", "view", "ignoring", "six", "line"].forEach((w) => (C[w] = cue(w)));
  C.paid = cue("paid", C.tight); C.better = cue("better", C.worse);   // both words also appear earlier in this film
  C.coffee = cue("coffee", C.tuesday); C.fee = cue("fee", C.tuesday); C.coffee2 = cue("coffee", C.fee); C.small = cue("small", C.americans); C.year = cue("year", C.twelve);
  C.some = cue("some", C.like); C.car = cue("car", C.march); C.down = cue("down", C.breaks); C.work = cue("work", C.friday); C.fee2 = cue("fee", C.payday);
  C.small2 = cue("small", C.fee2); C.year2 = cue("year", C.small2); C.small3 = cue("small", C.today); C.eightP = cue("eight", C.families);
  C.credit = cue("credit", C.late); C.thirty = cue("thirty", C.lower); C.eight2 = cue("eight", C.eleven); C.why = cue("why", C.afford); C.fine = cue("fine", C.shop);
  C.hundred = cue("hundred", C.repair); C.fifteen2 = cue("fifteen", C.hundred); C.cheap4 = cue("cheap", C.test); C.same4 = cue("same", C.cheap4);
  C.expensive = cue("expensive", C.same4); C.then2 = cue("then", C.think); C.before = cue("before", C.twice); C.after = cue("after", C.tight);
  C.call = cue("call", C.feeling); C.room = cue("room", C.ignoring); C.its = cue("it's", C.room); C.laziness = cue("laziness", C.its);
  C.trap = cue("trap", C.line); C.heres = cue("here's", C.trap);
  const END = C.heres - 0.5;
  const P = { navy: paper(W, H, PAL.navy, 11), mustard: paper(W, H, PAL.mustard, 31), green: paper(W, H, PAL.green, 23), cream: paper(W, H, "#e9dcc2", 17) };
  const wk = (c, x, s, t, faces, poses, o = {}) => inkWick(c, x, o.y ?? G, s, { ...mood(t, faces), arms: pose(t, poses), t: LIVE, ...o });
  const walkO = (t, t0, t1, sp = 1.15) => (t > t0 && t < t1 ? { walk: t * sp, dy: -0.035 * Math.abs(Math.sin(t * sp * TAU)) } : {});
  const tag = (g, txt, w = 220, h = 90, fill = CREAM, col = INKBLUE, size = 44) => { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 8, w, h, 14); g.fill();
    g.fillStyle = fill; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 14); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); serif(g, txt, 0, 3, size, col); };
  const bar = (c, x, y, w, h, col, k = 1) => { c.fillStyle = col; c.fillRect(x, y, w * k, h); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(x, y, w * k, h); };

  // ---------- the BROKE TAX running total (screen space, CH2 only) ----------
  const steps = () => [[C.fee, 35], [C.fee2, 45], [C.keeps, 45], [C.eight2, 7960]];
  function hud(c, t) {
    const k = seg(t, T0 + 0.5, T0 + 1.1) * (1 - seg(t, C.why - 1.0, C.why - 0.4)); if (k <= 0) return;
    let v = 0, flash = 0; for (const [ts, a] of steps()) { v += a * easeOut(seg(t, ts, ts + 0.5)); if (t > ts) flash = Math.max(flash, 1 - seg(t, ts + 0.5, ts + 1.2)); }
    const big = seg(t, C.add - 0.2, C.add + 0.3) * (1 - seg(t, C.price + 0.6, C.price + 1.2));
    c.save(); c.translate(960, lerp(0, 170, easeInOut(big))); c.scale(1 + 0.45 * easeInOut(big), 1 + 0.45 * easeInOut(big)); c.translate(-960, 0); brokeHud(c, k, v, 0, flash); c.restore();
  }

  // ================= BANK (a weekday street: the coffee cart, the bank's teller window) =================
  const WXb = (t) => lerp(980, 1560, easeInOut(seg(t, C.bank - 0.6, C.anyway + 0.2)));
  function phoneCard(g, bal, neg) { g.fillStyle = "#1a1f2c"; g.beginPath(); g.roundRect(-120, -210, 240, 420, 30); g.fill(); g.lineWidth = 6; g.strokeStyle = PAL.ink; g.stroke();
    g.fillStyle = neg ? "#3a1416" : "#16301f"; g.beginPath(); g.roundRect(-100, -180, 200, 340, 14); g.fill(); serif(g, "BALANCE", 0, -110, 26, "rgba(243,236,214,0.8)"); serif(g, bal, 0, -40, 54, neg ? "#ff6a5a" : "#7fe08f"); }
  function bankArt(c, t) {
    cityBack(c, LIVE, { day: true, lamps: [150, 2700] });
    // the bank: stone front, columns, a walk-up teller window
    c.fillStyle = "#e8e0cc"; c.fillRect(1400, G - 640, 1100, 640); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(1400, G - 640, 1100, 640);
    c.fillStyle = "#d6ccb2"; c.beginPath(); c.moveTo(1360, G - 640); c.lineTo(1950, G - 780); c.lineTo(2540, G - 640); c.closePath(); c.fill(); c.stroke(); serif(c, "BANK", 1950, G - 690, 60, INKBLUE);
    for (const x of [1460, 1600, 2300, 2440]) { c.fillStyle = "#efe8d6"; c.fillRect(x - 26, G - 600, 52, 600); c.strokeRect(x - 26, G - 600, 52, 600); }
    // teller behind the glass
    wk(c, 1950, 115, t, [[0, "calm"], [C.charges, "skeptical"]], [[0, "rest"], [C.charges, "point"]], { y: G - 250, seed: 21 }); coat(c, 1950, G - 250, 115, "official");
    c.fillStyle = "#7a6a52"; c.fillRect(1760, G - 260, 380, 260); c.strokeRect(1760, G - 260, 380, 260); c.fillStyle = "rgba(190,220,235,0.35)"; c.fillRect(1780, G - 560, 340, 300); c.lineWidth = 6; c.strokeRect(1780, G - 560, 340, 300);
    c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 4; c.beginPath(); c.moveTo(1800, G - 300); c.lineTo(1880, G - 540); c.moveTo(1840, G - 300); c.lineTo(1910, G - 500); c.stroke();
    // the coffee cart and its vendor
    wk(c, 620, 110, t, [[0, "happy"], [C.coffee, "joy"]], [[0, "rest"], [C.coffee - 0.4, "present"], [C.coffee + 1, "rest"]], { seed: 22, flip: false });
    c.fillStyle = "#8a2f2a"; c.fillRect(470, G - 250, 300, 200); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(470, G - 250, 300, 200); serif(c, "COFFEE", 620, G - 150, 40, CREAM);
    for (const wx of [520, 720]) { c.fillStyle = "#1a1f2c"; c.beginPath(); c.arc(wx, G - 30, 30, 0, TAU); c.fill(); }
    c.fillStyle = "#e8d29a"; c.beginPath(); c.moveTo(430, G - 470); c.lineTo(810, G - 470); c.lineTo(620, G - 560); c.closePath(); c.fill(); c.stroke(); c.fillRect(612, G - 470, 8, 220);
    // Wick: buys the coffee, checks his phone, walks to the window
    const wx = WXb(t), hold = t > C.coffee;
    wk(c, wx, 160, t, [[0, "calm"], [C.coffee, "happy"], [C.short, "alarmed", "!"], [C.charges, "grimace"], [C.coffee2, "sad"]], [[0, "rest"], [C.coffee - 0.5, "reach"], [C.coffee + 0.6, "present"], [C.bank, "rest"], [C.coffee2, "shrug"]], { seed: 3, boots: "cheap", split: 0.3, ...walkO(t, C.bank - 0.6, C.anyway + 0.2) });
    coat(c, wx, G, 160, "guard");
    if (hold) coffeeCup(c, wx + 0.95 * 160 * (t < C.coffee2 ? 1 : 1.1), G - 0.95 * 160 + 0.55 * 160, 46);
    // his balance: $1, then minus $3
    const pkk = pk(t, C.account - 0.2) * (1 - seg(t, C.bank + 0.3, C.bank + 0.8)); popAt(c, 1230, G - 640, pkk * 1.35, (g) => phoneCard(g, t > C.short ? "−$3.00" : "$1.00", t > C.short));
    // the stamp, the fee, and the fee next to the coffee
    popAt(c, 1180, G - 720, pk(t, C.charges) * (1 - seg(t, C.coffee2 - 0.3, C.coffee2)), (g) => { g.rotate(-0.15); g.strokeStyle = RED; g.lineWidth = 8; g.strokeRect(-170, -46, 340, 92); serif(g, "OVERDRAFT", 0, 4, 52, RED); });
    popAt(c, 2260, G - 870, pk(t, C.fee), (g) => tag(g, "$35 fee", 240, 96, GOLD));
    const ck = pk(t, C.coffee2 - 0.2); if (ck > 0.01) { c.save(); c.translate(1350, G - 860); c.scale(ck, ck); card(c, 0, 0, 760, 250);
      coffeeCup(c, -300, -10, 60); serif(c, "$4 coffee", -250, -40, 40, INKBLUE, "left"); bar(c, -50, -62, 4 * 12, 44, "#8a5d33");
      serif(c, "$35 fee", -250, 50, 40, INKBLUE, "left"); bar(c, -50, 28, 35 * 12, 44, GOLD); c.restore(); }
  }
  const bankCam = [[T0, 900, 560, 1.0], [C.account, 980, 500, 1.04], [C.bank + 0.4, 1520, 500, 1.0], [C.fee, 1640, 460, 0.95], [C.americans, 1560, 430, 0.9]];

  // ================= FEES (green board): $12 billion, paid mostly by a few =================
  function feesArt(c, t) {
    const n = easeOut(seg(t, C.twelve - 0.3, C.year + 0.2)), v = 12e9 * n;
    if (t > C.twelve - 0.4) { serif(c, "$" + (n >= 1 ? "12 BILLION" : Math.round(v).toLocaleString("en-US")), 960, 200, 120, GOLD); c.save(); c.globalAlpha = seg(t, C.year, C.year + 0.5); serif(c, "overdraft & bounced-payment fees, one year", 960, 300, 36, CREAM); c.restore(); }
    // 100 accounts; the few who pay most of it light up red
    const gk = seg(t, C.small - 0.3, C.small + 0.4); if (gk > 0) { c.save(); c.globalAlpha = gk;
      for (let i = 0; i < 100; i++) { const x = 290 + (i % 10) * 52, y = 500 + Math.floor(i / 10) * 52, red = [3, 17, 24, 38, 45, 59, 66, 82, 91].indexOf(i), on = red >= 0 && t > C.group + red * 0.08;
        if (red === 4 && t > C.like) { c.fillStyle = GOLD; c.beginPath(); c.moveTo(x, y - 34); c.quadraticCurveTo(x + 14, y - 14, x, y - 2); c.quadraticCurveTo(x - 14, y - 14, x, y - 34); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 14, 26 + 4 * Math.sin(LIVE * 6), 0, TAU); c.stroke(); }
        else personIcon(c, x, y, 40, on ? RED : "rgba(243,236,214,0.55)"); }
      c.restore(); }
    const bk = easeOut(seg(t, C.group + 0.6, C.group + 1.4)); if (bk > 0) {
      bar(c, 960, 700, 760 * 0.8, 80, RED, bk); if (bk > 0.99) bar(c, 960 + 608, 700, 152, 80, "rgba(243,236,214,0.4)");
      c.save(); c.globalAlpha = bk; serif(c, "80% of the fees", 1240, 640, 40, CREAM); serif(c, "paid by fewer than 9 in 100 accounts", 1340, 830, 34, CREAM); c.restore(); }
  }
  const feesCam = [[C.americans - 0.5, 960, 560, 1.0], [C.some - 0.4, 960, 540, 1.03]];

  // ================= UNBANKED (the bank door with a rope; 4 in 100 households) =================
  function unbankArt(c, t) {
    cityBack(c, LIVE, { day: true, lamps: [200, 2500] });
    c.fillStyle = "#e8e0cc"; c.fillRect(900, G - 640, 1000, 640); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(900, G - 640, 1000, 640);
    c.fillStyle = "#6b4a2a"; c.fillRect(1250, G - 420, 300, 420); c.strokeRect(1250, G - 420, 300, 420); c.fillStyle = "#d4b25a"; c.beginPath(); c.arc(1520, G - 210, 12, 0, TAU); c.fill(); serif(c, "BANK", 1400, G - 540, 60, INKBLUE);
    // rope + sign
    for (const x of [1190, 1610]) { c.fillStyle = "#c9a45a"; c.fillRect(x - 8, G - 150, 16, 150); c.beginPath(); c.arc(x, G - 156, 14, 0, TAU); c.fill(); c.strokeStyle = PAL.ink; c.lineWidth = 3; c.stroke(); }
    c.strokeStyle = "#a8322a"; c.lineWidth = 12; c.beginPath(); c.moveTo(1190, G - 150); c.quadraticCurveTo(1400, G - 70, 1610, G - 150); c.stroke();
    const sk = t > C.reason ? 1 : 0; c.save(); c.translate(1750, G - 260); c.fillStyle = "#1a1f2c"; c.fillRect(-6, 0, 12, 260); c.fillStyle = CREAM; c.beginPath(); c.roundRect(-150, -90, 300, 110, 10); c.fill(); c.lineWidth = 5; c.strokeStyle = sk ? RED : PAL.ink; c.stroke();
      serif(c, "MINIMUM", 0, -60, 34, INKBLUE); serif(c, "BALANCE", 0, -18, 34, INKBLUE); c.restore();
    // three people walk up, read the sign, and leave, each in their own way
    // one person at a time walks up, reads the sign, and walks off, each reacting their own way
    [[C.some - 0.2, "curious", "sad", "scratch", 31, 128], [C.million - 0.4, "thinking", "weary", "shrug", 32, 118], [C.reason - 0.6, "calm", "grimace", "chin", 33, 124]].forEach(([t0, f1, f2, p2, sd, s]) => {
      const life = 4.2; if (t < t0 || t > t0 + life) return; const arrive = easeInOut(seg(t, t0, t0 + 1.4)), leave = easeInOut(seg(t, t0 + 2.6, t0 + life)), x = lerp(500, 1040, arrive) - 900 * leave;
      wk(c, x, s, t, [[0, f1], [t0 + 1.5, f2]], [[0, "rest"], [t0 + 1.5, p2], [t0 + 2.6, "rest"]], { seed: sd, flip: leave > 0, ...(arrive < 1 ? walkO(t, t0, t0 + 1.4) : {}), ...(leave > 0 && leave < 1 ? walkO(t, t0 + 2.6, t0 + life) : {}) }); });
    // 4 in 100 households, pinned in the sky
    const hk = pk(t, C.million - 0.2); if (hk > 0.01) { c.save(); c.translate(1300, 120); c.scale(hk, hk); card(c, 0, 0, 900, 420);
      for (let i = 0; i < 100; i++) houseIcon(c, -330 + (i % 20) * 34, -110 + Math.floor(i / 20) * 40, 30, { col: [7, 33, 58, 86].includes(i) ? "#8a93a6" : "#c9a45a", dollar: ![7, 33, 58, 86].includes(i) });
      serif(c, "4 in 100 US households have no bank account", 0, 130, 34, INKBLUE); serif(c, "5.6 million homes", 0, 172, 30, "#8a2f2a"); c.restore(); }
  }
  const unbankCam = [[C.some - 0.4, 1250, 540, 1.0], [C.million - 0.4, 1300, 360, 0.86], [C.march - 0.5, 1320, 380, 0.86]];

  // ================= PAYDAY (night: the car dies, the payday lender says yes) =================
  function paydayArt(c, t) {
    cityBack(c, LIVE, { lamps: [300, 1300, 2700] });
    // the lender's storefront with a buzzing sign
    c.fillStyle = "#26314d"; c.fillRect(1650, G - 520, 700, 520); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(1650, G - 520, 700, 520);
    const on = rng(Math.floor(LIVE * 9) + 3)() > 0.15 ? 1 : 0.3; c.save(); c.globalCompositeOperation = "screen"; const ng = c.createRadialGradient(2000, G - 600, 0, 2000, G - 600, 300); ng.addColorStop(0, `rgba(120,255,160,${0.35 * on})`); ng.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = ng; c.beginPath(); c.arc(2000, G - 600, 300, 0, TAU); c.fill(); c.restore();
    c.fillStyle = "#14191f"; c.beginPath(); c.roundRect(1780, G - 650, 440, 100, 16); c.fill(); c.strokeStyle = PAL.ink; c.stroke(); serif(c, "CASH NOW", 2000, G - 598, 64, on > 0.5 ? "#9dffb8" : "#3c6e4c");
    wk(c, 2000, 115, t, [[0, "happy"], [C.yes, "wink"]], [[0, "rest"], [C.yes - 0.3, "present"]], { y: G - 200, seed: 41 }); coat(c, 2000, G - 200, 115, "official");
    c.fillStyle = "#4a3a28"; c.fillRect(1760, G - 210, 480, 210); c.strokeRect(1760, G - 210, 480, 210); c.fillStyle = "rgba(190,220,235,0.18)"; c.fillRect(1780, G - 470, 440, 260); c.lineWidth = 6; c.strokeRect(1780, G - 470, 440, 260);
    // his car gives up
    parkedCar(c, 640, G + 60, LIVE, { col: "#7a6a5a", smoke: seg(t, C.breaks - 0.2, C.breaks + 0.6), hood: easeOut(seg(t, C.down, C.down + 0.6)), s: 1.25 });
    const wx = lerp(1120, 1520, easeInOut(seg(t, C.work + 0.2, C.payday + 0.4)));
    wk(c, wx, 160, t, [[0, "calm"], [C.breaks, "shocked", "!"], [C.friday, "worried"], [C.yes, "curious"], [C.percent, "alarmed", "!"], [C.borrow, "weary"]], [[0, "rest"], [C.breaks, "cheer"], [C.friday, "scratch"], [C.yes, "reach"], [C.percent, "rest"]], { seed: 3, boots: "cheap", split: 0.5, ...walkO(t, C.work + 0.2, C.payday + 0.4) });
    coat(c, wx, G, 160, "guard");
    // $300 slides over
    const mk = easeOut(seg(t, C.yes, C.yes + 0.8)); if (mk > 0 && t < C.fee2 + 2) for (let i = 0; i < 3; i++) { c.save(); c.translate(lerp(1780, 1640, mk) - i * 14, G - 330 + i * 10); c.rotate(-0.1 + i * 0.08); c.fillStyle = "#9fd88c"; c.fillRect(-70, -32, 140, 64); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-70, -32, 140, 64); serif(c, "$100", 0, 2, 30, "#14401f"); c.restore(); }
    const fk = pk(t, C.fee2) * (1 - seg(t, C.weeks + 0.4, C.weeks + 0.9)); popAt(c, 1540, G - 700, fk, (g) => { tag(g, "$45 due in 2 weeks", 420, 96, GOLD, INKBLUE, 42); if (t > C.small2 && t < C.small2 + 0.8) g.scale(0.9, 0.9); });
    popAt(c, 1180, G - 760, pk(t, C.friday) * (1 - seg(t, C.payday - 0.3, C.payday)), (g) => { card(g, 0, 0, 180, 150); serif(g, "FRI", 0, 10, 60, "#8a2f2a"); });
    // the yearly rate: a gauge sweeps to ~390% ($15 per $100 for 2 weeks × 26 = 390%)
    const gk = pk(t, C.year2 - 0.3) * (1 - seg(t, C.weeks - 0.2, C.weeks + 0.2)); if (gk > 0.01) { c.save(); c.translate(900, 300); c.scale(gk, gk); c.fillStyle = "rgba(26,31,44,0.92)"; c.beginPath(); c.roundRect(-360, -300, 720, 400, 24); c.fill(); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.stroke();
      gauge(c, 0, 40, 240, 390 * easeInOut(seg(t, C.year2, C.percent + 0.2)), 400); serif(c, "a year", 0, 80, 36, CREAM); c.restore(); }
    // the chain of loans: 4 of 5 roll into the next
    const ch = seg(t, C.borrow - 0.6, C.borrow); if (ch > 0) { c.save(); c.globalAlpha = ch * (1 - seg(t, C.store - 1.4, C.store - 0.9));
      for (let i = 0; i < 5; i++) { const x = 650 + i * 250, k = pk(t, C.borrow + i * 0.45); popAt(c, x, 170, k, (g) => tag(g, "LOAN", 170, 80, i === 4 ? CREAM : GOLD, INKBLUE, 38));
        if (i < 4 && t > C.rolled + i * 0.25) { const a = easeOut(seg(t, C.rolled + i * 0.25, C.rolled + i * 0.25 + 0.5)); c.strokeStyle = RED; c.lineWidth = 7; c.beginPath(); c.arc(x + 125, 120, 90, Math.PI * 1.15, Math.PI * (1.15 + 0.7 * a)); c.stroke(); } }
      serif(c, "4 in 5 rolled over or renewed", 1150, 280, 44, CREAM); c.restore(); }
  }
  const paydayCam = [[C.march - 0.5, 950, 560, 1.0], [C.friday, 1000, 540, 1.0], [C.payday, 1500, 520, 1.0], [C.year2, 1450, 430, 0.92], [C.store - 0.9, 1450, 420, 0.92]];

  // ================= STORE (the small pack costs more per roll) =================
  function packs(c, x, y, n, cols, s = 1) { const r = 34 * s; for (let i = 0; i < n; i++) { const cx = x + (i % cols) * r * 1.9, cy = y - Math.floor(i / cols) * r * 1.9;
    c.fillStyle = "#fbf8ef"; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.fillStyle = "#d8cfb8"; c.beginPath(); c.arc(cx, cy, r * 0.32, 0, TAU); c.fill(); } }
  function storeArt(c, t) {
    c.fillStyle = "#efe2c4"; c.fillRect(-1000, -1000, 4000, G + 1000); c.fillStyle = "#b98a5a"; c.fillRect(-1000, G, 4000, 600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-1000, G); c.lineTo(3000, G); c.stroke();
    c.fillStyle = "#8a6a4a"; c.fillRect(980, G - 620, 860, 620); c.strokeRect(980, G - 620, 860, 620); for (const y of [G - 420, G - 220]) { c.fillStyle = "#6b4a2a"; c.fillRect(980, y, 860, 20); c.strokeRect(980, y, 860, 20); }
    // the 4-pack and the 24-pack, each with its price today and its cost per roll
    if (!(t > C.small3 + 0.2)) packs(c, 1100, G - 470, 4, 2, 0.9); packs(c, 1420, G - 470, 24, 6, 0.9);
    popAt(c, 1170, G - 360, pk(t, C.big - 0.2), (g) => tag(g, "$", 110, 70, CREAM, INKBLUE, 40)); popAt(c, 1610, G - 360, pk(t, C.big), (g) => tag(g, "$$$$$", 200, 70, CREAM, INKBLUE, 40));
    const rk = pk(t, C.roll - 0.3); if (rk > 0.01) { c.save(); c.globalAlpha = Math.min(1, rk); serif(c, "per roll", 1410, G - 130, 32, CREAM);
      bar(c, 1180, G - 95, 160 * 1.08, 34, RED); bar(c, 1540, G - 95, 160, 34, "#7fbf8f"); c.restore(); }
    // Wick checks his wallet and takes the small one; the +8% sticker slaps onto it
    wk(c, 760, 165, t, [[0, "curious"], [C.today, "worried"], [C.small3, "sad"], [C.cash, "weary"]], [[0, "rest"], [C.today - 0.3, "present"], [C.small3, "reach"], [C.small3 + 1.2, "rest"]], { seed: 3, boots: "cheap", split: 0.3 });
    coat(c, 760, G, 165, "guard");
    popAt(c, 560, G - 560, pk(t, C.today - 0.4) * (1 - seg(t, C.small3, C.small3 + 0.4)), (g) => { g.fillStyle = "#6b4a2a"; g.beginPath(); g.roundRect(-90, -50, 180, 100, 14); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); coin(g, -30, 0, 22, 0); coin(g, 20, 6, 18, 0); });
    if (t > C.small3 + 0.2) { const k = easeOut(seg(t, C.small3 + 0.2, C.small3 + 0.9)); packs(c, lerp(1100, 935, k), lerp(G - 470, G - 250, k), 4, 2, 0.9);
      popAt(c, 1100, G - 330, pk(t, C.eightP), (g) => { g.rotate(-0.2); g.fillStyle = RED; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = PAL.ink; g.stroke(); serif(g, "+8%", 0, 4, 50, CREAM); }); }
  }
  const storeCam = [[C.store - 0.9, 1250, 560, 1.0], [C.families, 1220, 540, 1.04], [C.late - 0.6, 1200, 540, 1.05]];

  // ================= CARLOT (same car, worse deal; then the total) =================
  function carlotArt(c, t) {
    cityBack(c, LIVE, { day: true, lamps: [] });
    c.strokeStyle = "#a8322a"; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, 260); c.quadraticCurveTo(960, 360, 2200, 260); c.stroke();
    for (let i = 0; i < 22; i++) { const x = -150 + i * 110, y = 260 + 100 * (1 - Math.pow((x - 960) / 1180, 2)) - 2; c.fillStyle = ["#e0402a", "#f7b21b", "#4f7fb6"][i % 3]; c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x + 20, y); c.lineTo(x, y + 40 + 6 * Math.sin(LIVE * 3 + i)); c.closePath(); c.fill(); }
    parkedCar(c, 600, G + 40, LIVE, { col: "#4f7fb6", s: 0.9 }); parkedCar(c, 1330, G + 40, LIVE, { col: "#4f7fb6", s: 0.9 });
    wk(c, 220, 150, t, [[0, "calm"], [C.none, "happy"], [C.harder, "calm"]], [[0, "rest"], [C.great, "present"], [C.harder, "shrug"], [C.afford, "rest"]], { seed: 7, flip: false, boots: "good" }); coat(c, 220, G, 150, "guard"); scarf(c, 220, G, 150, "#c0392b", 0, LIVE);
    if (t > C.afford - 0.3) jar(c, 330, G, 70, { fill: 0.3, label: "BOOTS" });
    wk(c, 1760, 150, t, [[0, "curious"], [C.lower, "worried"], [C.bad, "shocked"], [C.add, "weary"]], [[0, "rest"], [C.bad, "scratch"], [C.add, "rest"]], { seed: 3, flip: true, boots: "cheap", split: 0.4 }); coat(c, 1760, G, 150, "guard");
    // his credit score slides from green into red
    const ck = pk(t, C.credit - 0.3) * (1 - seg(t, C.thirty - 0.4, C.thirty)); if (ck > 0.01) { c.save(); c.translate(1760, 360); c.scale(ck, ck); card(c, 0, 0, 380, 150);
      const gr = c.createLinearGradient(-150, 0, 150, 0); gr.addColorStop(0, "#e0402a"); gr.addColorStop(0.5, "#f7b21b"); gr.addColorStop(1, "#4fa36a"); c.fillStyle = gr; c.fillRect(-150, -6, 300, 36); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-150, -6, 300, 36);
      const ax = lerp(120, -110, easeInOut(seg(t, C.credit, C.lower + 0.6))); c.fillStyle = PAL.ink; c.beginPath(); c.moveTo(ax, -12); c.lineTo(ax - 14, -36); c.lineTo(ax + 14, -36); c.closePath(); c.fill(); serif(c, "credit score", 0, 52, 26, INKBLUE); c.restore(); }
    // price, then the interest each one pays
    popAt(c, 600, 420, pk(t, C.thirty), (g) => tag(g, "$30,000", 220, 80, CREAM, INKBLUE, 40)); popAt(c, 1330, 420, pk(t, C.thirty + 0.2), (g) => tag(g, "$30,000", 220, 80, CREAM, INKBLUE, 40));
    popAt(c, 600, 540, pk(t, C.great + 0.2), (g) => { tag(g, "interest $3,480", 330, 80, "#bfe3c7", INKBLUE, 38); serif(g, "4.4% loan", 0, 66, 34, INKBLUE); });
    popAt(c, 1330, 540, pk(t, C.bad + 0.2), (g) => { tag(g, "interest $11,440", 340, 80, "#f3b4a8", INKBLUE, 38); serif(g, "13.5% loan", 0, 66, 34, "#8a2f2a"); });
    const gk = pk(t, C.eight2 - 0.2); if (gk > 0.01) { c.save(); c.translate(965, 680); c.scale(gk, gk); c.strokeStyle = RED; c.lineWidth = 7; c.beginPath(); c.moveTo(-200, 0); c.lineTo(200, 0); c.moveTo(-200, -20); c.lineTo(-200, 20); c.moveTo(200, -20); c.lineTo(200, 20); c.stroke(); tag(c, "+$7,960", 200, 74, RED, CREAM, 40); c.restore(); }
  }
  const carCam = [[C.late - 0.6, 1300, 520, 1.0], [C.credit + 0.6, 1500, 500, 1.0], [C.thirty, 960, 520, 1.0], [C.add, 960, 520, 1.0], [C.why - 0.5, 960, 540, 1.03]];

  // ================= DESK (night, the guard hut: the bills all shout at once) =================
  function deskArt(c, t) {
    c.fillStyle = "#1e2a46"; c.fillRect(-1000, -1000, 4000, 3000);
    c.save(); c.beginPath(); c.rect(1240, 180, 460, 360); c.clip(); c.fillStyle = "#0a1226"; c.fillRect(1240, 180, 460, 360); rain(c, 1240, 100, 460, 500, LIVE, { n: 120 }); c.restore();
    c.lineWidth = 8; c.strokeStyle = "#3b4a6b"; c.strokeRect(1240, 180, 460, 360); c.beginPath(); c.moveTo(1470, 180); c.lineTo(1470, 540); c.stroke();
    wk(c, 820, 170, t, [[0, "weary"], [C.budget, "thinking"], [C.miss, "worried"]], [[0, "rest"], [C.budget, "chin"], [C.miss, "scratch"]], { y: G - 40, seed: 3 }); coat(c, 820, G - 40, 170, "guard");
    c.fillStyle = "#6b4a2a"; c.fillRect(380, G - 120, 1160, 60); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(380, G - 120, 1160, 60); c.fillRect(420, G - 60, 40, 200); c.fillRect(1460, G - 60, 40, 200);
    for (let i = 0; i < 7; i++) { const t0 = C.why - 0.4 + i * 0.55; if (t < t0) continue; shoutingBill(c, 1000 + i * 70 - (i % 2) * 30, G - 160 - i * 14, 90, LIVE, Math.min(1, 0.2 + i * 0.13) * seg(t, t0, t0 + 0.3), i + 3);
      if (i > 3) { c.save(); c.globalCompositeOperation = "screen"; const g = c.createRadialGradient(1000 + i * 70, G - 200, 0, 1000 + i * 70, G - 200, 140); g.addColorStop(0, `rgba(255,90,70,${0.12 * (i - 3)})`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(1000 + i * 70, G - 200, 140, 0, TAU); c.fill(); c.restore(); } }
    // what everyone says he should do: budget, shop around, read the fine print
    const bk = pk(t, C.budget - 0.2) * (1 - 0.6 * seg(t, C.miss - 0.4, C.miss + 0.2)); if (bk > 0.01) { c.save(); c.translate(620, 230); c.scale(bk, bk); c.fillStyle = CREAM; c.lineWidth = 5; c.strokeStyle = PAL.ink; c.beginPath(); c.ellipse(0, 0, 300, 140, 0, 0, TAU); c.fill(); c.stroke();
      for (const [dx, dy, r] of [[120, 150, 18], [160, 196, 10]]) { c.beginPath(); c.arc(dx, dy, r, 0, TAU); c.fill(); c.stroke(); }
      if (t > C.budget) { c.fillStyle = "#3b4a6b"; c.beginPath(); c.roundRect(-210, -60, 90, 120, 10); c.fill(); c.fillStyle = "#9fd88c"; c.fillRect(-196, -48, 62, 26); c.fillStyle = CREAM; for (let k = 0; k < 6; k++) c.fillRect(-196 + (k % 3) * 22, -10 + Math.floor(k / 3) * 26, 16, 18); }
      if (t > C.shop) { tag(c, "$", 70, 60, GOLD, INKBLUE, 34); c.strokeStyle = PAL.ink; c.lineWidth = 6; c.beginPath(); c.arc(30, -20, 30, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(52, 2); c.lineTo(80, 30); c.stroke(); }
      if (t > C.fine) { c.fillStyle = "#fbf8ef"; c.fillRect(120, -60, 100, 120); c.lineWidth = 3; c.strokeRect(120, -60, 100, 120); c.fillStyle = "rgba(40,30,20,0.5)"; for (let k = 0; k < 9; k++) c.fillRect(132, -46 + k * 12, 76, 3); }
      c.restore(); }
  }
  const deskCam = [[C.why - 0.5, 960, 560, 1.0], [C.miss, 980, 600, 1.12], [C.study - 1.3, 990, 610, 1.14]];

  // ================= MALL (mustard: imagine a car repair, then take a test) =================
  function mallArt(c, t) {
    c.fillStyle = "rgba(255,240,210,0.25)"; for (const x of [300, 960, 1620]) { c.beginPath(); c.moveTo(x - 220, G - 120); c.lineTo(x - 220, 180); c.quadraticCurveTo(x, 40, x + 220, 180); c.lineTo(x + 220, G - 120); c.closePath(); c.fill(); }
    c.strokeStyle = "rgba(60,40,15,0.5)"; c.lineWidth = 4; c.beginPath(); c.moveTo(-500, G); c.lineTo(2400, G); c.stroke(); for (let x = -500; x < 2400; x += 160) { c.beginPath(); c.moveTo(x, G); c.lineTo(x - 80, G + 200); c.stroke(); }
    // three shoppers behind a table, each their own person
    const shop = [[640, 104, "curious", "thinking", "worried", 51, "scratch", false], [955, 128, "calm", "skeptical", "calm", 52, "crossed", false], [1290, 114, "happy", "thinking", "worried", 53, "chin", true]];
    shop.forEach(([x, s, f1, f2, f3, sd, p2, fl], i) => { wk(c, x, s, t, [[0, f1], [C.test + i * 0.3, f2], [C.dropped + i * 0.1, f3]], [[0, i === 2 ? "present" : "rest"], [C.test + i * 0.3, p2]], { y: G - 30, seed: sd, flip: fl, flare: t > C.think && i === 2 ? 0.72 : undefined });
      if (i === 0) { c.fillStyle = "#c0392b"; c.beginPath(); c.moveTo(x - s * 0.95, G - 30 - s * 0.62); c.lineTo(x - s * 0.55, G - 30 - s * 0.62); c.lineTo(x - s * 0.5, G - 30 - s * 0.1); c.lineTo(x - s * 1.0, G - 30 - s * 0.1); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); } });
    c.fillStyle = "#8a6a4a"; c.fillRect(520, G - 120, 880, 40); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(520, G - 120, 880, 40);
    if (t > C.test) for (let i = 0; i < 3; i++) { const k = easeOut(seg(t, C.test + i * 0.15, C.test + i * 0.15 + 0.4)); c.save(); c.translate(700 + i * 260, lerp(G - 300, G - 132, k)); c.rotate(-0.05 + i * 0.05); c.fillStyle = "#fbf8ef"; c.fillRect(-60, -12, 120, 20); c.strokeRect(-60, -12, 120, 20); c.restore(); }
    // the repair they imagined: $150 for some, $1,500 for others
    const bub = (x, txt, t0) => popAt(c, x, 300, pk(t, t0) * (1 - seg(t, C.cheap4 - 0.6, C.cheap4 - 0.2)), (g) => { g.fillStyle = CREAM; g.lineWidth = 5; g.strokeStyle = PAL.ink; g.beginPath(); g.ellipse(0, 0, 200, 110, 0, 0, TAU); g.fill(); g.stroke();
      g.save(); g.scale(0.32, 0.32); g.translate(-90, 80); parkedCar(g, 0, 0, LIVE, { col: "#7a6a5a", hood: 1 }); g.restore(); tag(g, txt, 150, 64, GOLD, INKBLUE, 34); });
    bub(620, "$150", C.hundred); bub(1300, "$1,500", C.fifteen2);
    // the result: the same with a cheap repair; the poorer group drops with the expensive one
    const rk = pk(t, C.cheap4 - 0.3); if (rk > 0.01) { c.save(); c.translate(960, 300); c.scale(rk, rk); card(c, 0, 0, 1000, 380);
      const grp = (x, label, poorH) => { c.fillStyle = "#4f7fb6"; c.fillRect(x - 110, 110 - 170, 90, 170); c.fillStyle = "#e08a3a"; c.fillRect(x + 20, 110 - poorH, 90, poorH); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(x - 110, 110 - 170, 90, 170); c.strokeRect(x + 20, 110 - poorH, 90, poorH); serif(c, label, x, 150, 32, INKBLUE); };
      grp(-230, "$150 repair", 170 * (t > C.same4 - 0.3 ? 1 : easeOut(seg(t, C.cheap4, C.same4)))); grp(230, "$1,500 repair", lerp(170, 92, easeInOut(seg(t, C.dropped - 0.4, C.dropped + 0.4))) * (t > C.expensive - 0.2 ? 1 : 0));
      c.fillStyle = "#4f7fb6"; c.fillRect(-460, -160, 26, 26); serif(c, "richer", -400, -146, 28, INKBLUE, "left"); c.fillStyle = "#e08a3a"; c.fillRect(-260, -160, 26, 26); serif(c, "poorer", -200, -146, 28, INKBLUE, "left"); serif(c, "thinking-test scores", 280, -146, 28, "#8a2f2a"); c.restore(); }
  }
  const mallCam = [[C.study - 1.3, 960, 600, 1.0], [C.imagine, 960, 560, 1.0], [C.cheap4 - 0.5, 960, 470, 0.92], [C.then2 - 0.3, 960, 470, 0.92]];

  // ================= FIELD (Tamil Nadu: the same farmers before and after harvest) =================
  function fieldArt(c, t) {
    const sky = c.createLinearGradient(0, -400, 0, G); sky.addColorStop(0, "#9fd0e8"); sky.addColorStop(1, "#f6e7c4"); c.fillStyle = sky; c.fillRect(-1000, -1000, 4000, G + 1000);
    c.fillStyle = "#ffe6a8"; c.beginPath(); c.arc(1650, 160, 70, 0, TAU); c.fill();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 70; i++) { const x = -300 + i * 38 + row * 19, h = 330 - row * 60 + 40 * Math.sin(i * 1.7), sw = 10 * Math.sin(LIVE * 1.3 + i * 0.4 + row);
      c.strokeStyle = ["#4f8a3a", "#5f9a46", "#6faa52"][row]; c.lineWidth = 7; c.beginPath(); c.moveTo(x, G - 40 * row); c.quadraticCurveTo(x + sw * 0.5, G - 40 * row - h / 2, x + sw, G - 40 * row - h); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(x + sw * 0.6, G - 40 * row - h * 0.6); c.quadraticCurveTo(x + 40, G - 40 * row - h * 0.75, x + 60 + sw, G - 40 * row - h * 0.55); c.stroke(); }
    c.fillStyle = "#c8a46a"; c.fillRect(-1000, G, 4000, 600); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(-1000, G); c.lineTo(3000, G); c.stroke();
    const paid = t > C.paid;
    [[560, 140, 61], [935, 172, 62], [1330, 128, 63]].forEach(([x, s, sd], i) => {
 wk(c, x, s, t, [[0, "curious"], [C.before, "worried"], [C.after + i * 0.15, "happy"], [C.paid + 0.3, i === 1 ? "joy" : "happy"], [C.argue, "thinking"], [C.feeling, i === 0 ? "calm" : "happy"]], [[0, "rest"], [C.before, i === 1 ? "scratch" : "rest"], [C.paid + i * 0.12, i === 2 ? "cheer" : "present"], [C.paid + 2, "rest"]], { seed: sd }); shawl(c, x, G, s, ["#2f7a5a", "#a8322a", "#3b5a9a"][i]);
      if (i === 2) { c.save(); c.translate(x + s * 0.95, G - s * 0.55); c.rotate(-0.35); c.fillStyle = "#c9b45a"; c.fillRect(-8, -s * 1.9, 16, s * 1.9); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.strokeRect(-8, -s * 1.9, 16, s * 1.9);
        for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(-8, -k * s * 0.4); c.lineTo(8, -k * s * 0.4); c.stroke(); } c.strokeStyle = "#4f8a3a"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -s * 1.9); c.quadraticCurveTo(s * 0.4, -s * 2.3, s * 0.5, -s * 1.9); c.moveTo(0, -s * 1.9); c.quadraticCurveTo(-s * 0.3, -s * 2.35, -s * 0.45, -s * 2.0); c.stroke(); c.restore(); } });
    if (paid) for (let i = 0; i < 3; i++) { const k = pk(t, C.paid + i * 0.12); popAt(c, [560, 935, 1330][i] - 110, G - 50, k, (g) => { g.fillStyle = "#c9a45a"; g.beginPath(); g.ellipse(0, 0, 34, 40, 0, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke(); serif(g, "₹", 0, 4, 34, INKBLUE); }); }
    popAt(c, 960, 140, pk(t, C.india) * (1 - seg(t, C.before - 0.5, C.before - 0.1)), (g) => { card(g, 0, 0, 760, 120); serif(g, "Tamil Nadu, India · 464 farmers in 54 villages", 0, 4, 34, INKBLUE); });
    const calK = pk(t, C.before - 0.1) * (1 - seg(t, C.worse - 0.8, C.worse - 0.3)); if (calK > 0.01) { const fl = Math.abs(Math.cos(Math.PI * seg(t, C.after - 0.25, C.after + 0.25))); c.save(); c.translate(960, 170); c.scale(calK, calK * Math.max(0.05, fl));
      card(c, 0, 0, 520, 150, t > C.after ? "#d8efc9" : "#f3dcae"); serif(c, t > C.after ? "AFTER HARVEST" : "BEFORE HARVEST", 0, -12, 46, INKBLUE); serif(c, t > C.after ? "just paid" : "money tight", 0, 40, 30, "#8a2f2a"); c.restore(); }
    // scores: puzzles solved before vs after
    const sk = pk(t, C.worse - 0.4); if (sk > 0.01) { c.save(); c.translate(960, 230); c.scale(sk, sk); card(c, 0, 0, 900, 330);
      const bk1 = easeOut(seg(t, C.worse - 0.3, C.worse + 0.5)), bk2 = easeOut(seg(t, C.better - 0.3, C.better + 0.5));
      bar(c, -300, -70, 120 * 4.35, 56, "#e08a3a", bk1); serif(c, "before: 4.35", -330, -42, 32, INKBLUE, "right"); bar(c, -300, 20, 120 * 5.45, 56, "#4fa36a", bk2); serif(c, "after: 5.45", -330, 48, 32, INKBLUE, "right");
      serif(c, "reasoning puzzles solved (average)", 0, -126, 28, "#8a2f2a");
      popAt(c, 330, -40, pk(t, C.sleep - 0.2), (g) => { g.fillStyle = "#f3d58c"; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill(); g.fillStyle = CREAM; g.beginPath(); g.arc(14, -10, 30, 0, TAU); g.fill(); serif(g, "= a night's sleep", 0, 66, 26, INKBLUE); });
      if (t > C.argue - 0.2) { const tilt = 0.18 * Math.sin(LIVE * 3); c.save(); c.translate(330, 120); c.globalAlpha = seg(t, C.argue - 0.2, C.argue + 0.3) * (1 - seg(t, C.feeling - 0.2, C.feeling + 0.4)); c.strokeStyle = INKBLUE; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 20); c.stroke(); c.save(); c.rotate(tilt); c.beginPath(); c.moveTo(-60, -30); c.lineTo(60, -30); c.stroke(); c.restore(); serif(c, "debated", 0, 44, 24, "#8a2f2a"); c.restore(); }
      c.restore(); }
  }
  const fieldCam = [[C.then2 - 0.3, 960, 560, 1.0], [C.paid, 960, 540, 1.0], [C.worse - 0.5, 960, 470, 0.92], [C.call - 0.4, 960, 480, 0.93]];

  // ================= BRAIN (inside his head: the bandwidth bar fills; tunnel vision) =================
  function brainArt(c, t) {
    c.save(); c.translate(960, 560); c.fillStyle = "rgba(247,178,27,0.12)"; c.beginPath(); c.moveTo(0, -470); c.quadraticCurveTo(420, -120, 300, 230); c.quadraticCurveTo(0, 470, -300, 230); c.quadraticCurveTo(-420, -120, 0, -470); c.fill(); c.lineWidth = 8; c.strokeStyle = GOLD; c.stroke(); c.restore();
    const fill = clamp(0.15 + 0.85 * seg(t, C.worry - 0.3, C.view), 0, 1), full = t > C.room - 0.3;
    c.fillStyle = "rgba(243,236,214,0.15)"; c.fillRect(600, 520, 720, 80); c.fillStyle = full && Math.sin(LIVE * 14) > 0 ? "#ff6a5a" : `rgb(${Math.round(lerp(120, 224, fill))},${Math.round(lerp(200, 64, fill))},${Math.round(lerp(140, 42, fill))})`; c.fillRect(600, 520, 720 * fill, 80);
    c.lineWidth = 5; c.strokeStyle = CREAM; c.strokeRect(600, 520, 720, 80); serif(c, "BANDWIDTH", 960, 480, 40, CREAM);
    for (let i = 0; i < 8; i++) { const t0 = C.worry + i * 0.35, k = seg(t, t0, t0 + 0.6); if (k <= 0 || k >= 1) continue; const a = i * 0.8, sx = 960 + Math.cos(a) * 700, sy = 560 + Math.sin(a) * 420; shoutingBill(c, lerp(sx, 650 + fill * 640, easeIn(k)), lerp(sy, 560, easeIn(k)), 60, LIVE, 0.3, i + 50); }
    // tunnel: everything at the edge fades; today's one bill glows in the middle
    const tun = seg(t, C.fight - 0.3, C.fight + 0.8); if (tun > 0) { c.save(); const g = c.createRadialGradient(960, 380, lerp(1400, 260, tun), 960, 380, lerp(1500, 520, tun)); g.addColorStop(0, "rgba(10,16,32,0)"); g.addColorStop(1, `rgba(10,16,32,${0.92 * tun})`); c.fillStyle = g; c.fillRect(-500, -500, 3000, 2200); c.restore();
      shoutingBill(c, 960, 340, 110, LIVE, 0.6, 9); c.save(); c.globalCompositeOperation = "screen"; const gl = c.createRadialGradient(960, 340, 0, 960, 340, 200); gl.addColorStop(0, `rgba(255,120,90,${0.35 * tun})`); gl.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gl; c.beginPath(); c.arc(960, 340, 200, 0, TAU); c.fill(); c.restore(); }
    const nk = seg(t, C.next - 0.2, C.next + 0.3) * (1 - seg(t, C.view - 0.2, C.view + 0.8)); if (nk > 0) { c.save(); c.globalAlpha = nk; card(c, 330, 220, 260, 190); serif(c, "NEXT", 330, 190, 36, INKBLUE); serif(c, "MONTH", 330, 236, 36, INKBLUE); c.restore(); }
    const fk = seg(t, C.ignoring - 0.2, C.ignoring + 0.3) * (1 - seg(t, C.room - 0.6, C.room + 0.2)); if (fk > 0) { c.save(); c.globalAlpha = fk; c.fillStyle = "#fbf8ef"; c.fillRect(1500, 140, 180, 240); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.strokeRect(1500, 140, 180, 240); c.fillStyle = "rgba(40,30,20,0.5)"; for (let k = 0; k < 16; k++) c.fillRect(1516, 160 + k * 13, 148, 3); c.restore(); }
  }
  const brainCam = [[C.call - 0.4, 960, 540, 1.0], [C.fight, 960, 500, 1.06], [C.its - 1.1, 960, 480, 1.1]];

  // ================= NIGHT (silence; "It's not laziness"; 6.1 million; "It's a trap") =================
  function nightArt(c, t) {
    cityBack(c, LIVE, {}); puddle(c, 1700, G, 220, LIVE);
    const wx = lerp(1200, 1650, seg(t, C.its - 1.1, C.trap));
    wk(c, wx, 165, t, [[0, "weary"], [C.laziness, "determined"], [C.trap, "sad"]], [[0, "rest"]], { seed: 3, boots: "cheap", split: 0.6, ...walkO(t, C.its - 1.1, C.trap, 1.0) }); coat(c, wx, G, 165, "guard");
    const nk = pk(t, C.six - 0.2); if (nk > 0.01) { c.save(); c.translate(1500, 40); c.scale(nk, nk); card(c, 0, 0, 760, 230); serif(c, "6.1 MILLION", 0, -30, 80, INKBLUE); serif(c, "worked most of the year, still below the poverty line", 0, 50, 28, "#8a2f2a"); c.restore(); }
    // the trap closes into a loop around him (it becomes the next chapter's loop)
    const lk = easeInOut(seg(t, C.trap - 0.2, C.trap + 0.6)); if (lk > 0) { c.save(); c.strokeStyle = CREAM; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.arc(wx, G - 230, 330, -Math.PI / 2, -Math.PI / 2 + TAU * 0.92 * lk); c.stroke();
      if (lk > 0.95) { const a = -Math.PI / 2 + TAU * 0.92, ex = wx + Math.cos(a) * 330, ey = G - 230 + Math.sin(a) * 330; c.fillStyle = CREAM; c.beginPath(); c.moveTo(ex + 30, ey); c.lineTo(ex - 20, ey - 24); c.lineTo(ex - 14, ey + 30); c.closePath(); c.fill(); } c.restore(); }
    rain(c, 200, -900, 3400, 1800, LIVE, { n: 600 });
  }
  const nightCam = [[C.its - 1.1, 1350, 560, 1.05], [C.six - 0.3, 1450, 540, 1.0], [C.line, 1500, 400, 0.82], [END, 1520, 420, 0.86]];

  const S = {
    bank: (t) => ({ bg: P.navy, cam: camKF(bankCam, t), art: (c) => bankArt(c, t), over: (c) => hud(c, t) }),
    fees: (t) => ({ bg: P.green, cam: camKF(feesCam, t), art: (c) => feesArt(c, t), over: (c) => hud(c, t) }),
    unbank: (t) => ({ bg: P.navy, cam: camKF(unbankCam, t), art: (c) => unbankArt(c, t), over: (c) => hud(c, t) }),
    payday: (t) => ({ bg: P.navy, cam: camKF(paydayCam, t), art: (c) => paydayArt(c, t), over: (c) => hud(c, t) }),
    store: (t) => ({ bg: P.cream, cam: camKF(storeCam, t), art: (c) => storeArt(c, t), over: (c) => hud(c, t) }),
    carlot: (t) => ({ bg: P.navy, cam: camKF(carCam, t), art: (c) => carlotArt(c, t), over: (c) => hud(c, t) }),
    desk: (t) => ({ bg: P.navy, cam: camKF(deskCam, t), art: (c) => deskArt(c, t), over: (c) => hud(c, t) }),
    mall: (t) => ({ bg: P.mustard, cam: camKF(mallCam, t), art: (c) => mallArt(c, t) }),
    field: (t) => ({ bg: P.mustard, cam: camKF(fieldCam, t), art: (c) => fieldArt(c, t) }),
    brain: (t) => ({ bg: P.navy, cam: camKF(brainCam, t), art: (c) => brainArt(c, t) }),
    night: (t) => ({ bg: P.navy, cam: camKF(nightCam, t), art: (c) => nightArt(c, t) }),
  };
  const order = [["bank", T0], ["fees", C.americans - 0.5], ["unbank", C.some - 0.4], ["payday", C.march - 0.5], ["store", C.store - 0.9], ["carlot", C.late - 0.6],
    ["desk", C.why - 0.5], ["mall", C.study - 1.3], ["field", C.then2 - 0.3], ["brain", C.call - 0.4], ["night", C.its - 1.1]];
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
