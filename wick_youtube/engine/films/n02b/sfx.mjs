// SFX for N02 film B (CH2 broke tax + CH3 tired brain), on the same word cues as the film. Foley from films/n02/audio/fx.
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav, loadSample, sample, ambience } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("../n02/words.json", import.meta.url)));
const T0 = 110.28, cue = (w, after = T0 - 1) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const FX = (n) => loadSample(new URL(`../n02/audio/fx/${n}.mp3`, import.meta.url).pathname);
const C = {}; ["tuesday", "account", "short", "bank", "charges", "americans", "twelve", "group", "like", "some", "million", "reason", "march", "breaks", "friday", "payday", "yes",
  "percent", "weeks", "borrow", "rolled", "keeps", "store", "big", "roll", "today", "families", "late", "lower", "thirty", "great", "bad", "add", "none", "afford", "why", "budget", "shop",
  "miss", "study", "mall", "test", "dropped", "think", "india", "tight", "worse", "sleep", "argue", "feeling", "call", "worry", "fight", "next", "ignoring", "six", "line", "trap"].forEach((w) => (C[w] = cue(w)));
C.coffee = cue("coffee", C.tuesday); C.fee = cue("fee", C.tuesday); C.coffee2 = cue("coffee", C.fee); C.small = cue("small", C.americans); C.year = cue("year", C.twelve); C.fee2 = cue("fee", C.payday);
C.year2 = cue("year", cue("small", C.fee2)); C.small3 = cue("small", C.today); C.eightP = cue("eight", C.families); C.credit = cue("credit", C.late); C.eight2 = cue("eight", cue("eleven"));
C.fine = cue("fine", C.shop); C.hundred = cue("hundred", cue("repair")); C.fifteen2 = cue("fifteen", C.hundred); C.before = cue("before", cue("twice")); C.after = cue("after", C.tight);
C.paid = cue("paid", C.tight); C.better = cue("better", C.worse); C.room = cue("room", C.ignoring); C.its = cue("it's", C.room); C.heres = cue("here's", C.trap); C.price = cue("price", C.add);
const END = C.heres - 0.5, b = buffer(END + 1);
const ui = (t, v = 0.25) => pop(b, t, v, 900, 320), wh = (t, d = 0.8, v = 0.14) => whoosh(b, t, d, v);
// scene changes
for (const t of [C.americans - 0.5, C.some - 0.4, C.march - 0.5, C.store - 0.9, C.late - 0.6, C.why - 0.5, C.study - 1.3, cue("then", C.think) - 0.3, C.call - 0.4]) wh(t);
// HUD in, and every time the broke tax ticks up
whoosh(b, T0 + 0.5, 0.6, 0.1, 500, 2600, 3); for (const t of [C.fee, C.fee2, C.keeps]) { coins(b, t, 0.07); tick(b, t + 0.1, 0.12, 3200, 7); }
// BANK: coffee, the phone, the stamp, the fee
paper(b, C.coffee - 0.4, 0.3, 0.08); ui(C.account - 0.2); tick(b, C.short, 0.2, 1800, 2); thud(b, C.charges + 0.05, 0.45); ui(C.fee, 0.3); ui(C.coffee2 - 0.2, 0.22);
// FEES: the counter, the people, the bar
for (let i = 0; i < 20; i++) tick(b, C.twelve - 0.3 + i * 0.07, 0.07, 3000, i); bell(b, C.year + 0.2, 1046, 0.05); for (let i = 0; i < 9; i++) tick(b, C.group + i * 0.08, 0.1, 2400, i + 20); whoosh(b, C.group + 0.6, 0.8, 0.08, 600, 2400, 6); shimmer(b, C.like, C.like + 0.8, 0.03);
// UNBANKED: the card of houses, the sign
ui(C.million - 0.2, 0.3); for (let i = 0; i < 4; i++) tick(b, C.million + 0.4 + i * 0.12, 0.1, 1500, i + 40); thud(b, C.reason, 0.2);
// PAYDAY: the car dies, the neon buzz is implied, cash slides, the gauge sweeps, the chain links
sample(b, C.breaks - 0.1, FX("car_die"), 0.16 / FX("car_die").peak, { alignPeak: false }); ui(C.friday, 0.22); paper(b, C.yes, 0.6, 0.1); ui(C.fee2, 0.3);
for (let i = 0; i < 24; i++) tick(b, C.year2 + i * (C.percent + 0.2 - C.year2) / 24, 0.08, 1800 + i * 60, i); thud(b, C.percent + 0.2, 0.3);
for (let i = 0; i < 5; i++) ui(C.borrow + i * 0.45, 0.2); for (let i = 0; i < 4; i++) whoosh(b, C.rolled + i * 0.25, 0.35, 0.06, 900, 3000, i);
// STORE
ui(C.big - 0.2, 0.2); ui(C.big, 0.2); ui(C.roll - 0.3, 0.2); coins(b, C.today - 0.4, 0.04); paper(b, C.small3 + 0.2, 0.4, 0.1); thud(b, C.eightP, 0.3);
// CARLOT: the score slides down, prices, interest, the gap, the total (big hit)
whoosh(b, C.credit, 0.8, 0.08, 1800, 400, 8); ui(C.thirty, 0.22); ui(C.thirty + 0.2, 0.22); ui(C.great + 0.2, 0.25); ui(C.bad + 0.2, 0.25); thud(b, C.eight2, 0.35);
thud(b, C.add, 0.7); coins(b, C.add + 0.05, 0.1); for (let i = 0; i < 16; i++) tick(b, C.eight2 + i * 0.03, 0.08, 3600, i + 60); ui(C.none, 0.2); paper(b, C.afford - 0.3, 0.3, 0.08);
// DESK: bills land one by one, the thought bubble
for (let i = 0; i < 7; i++) paper(b, C.why - 0.4 + i * 0.55, 0.25, 0.1, i + 3); ui(C.budget - 0.2, 0.22); tick(b, C.budget, 0.12, 2800, 3); tick(b, C.shop, 0.12, 2800, 4); tick(b, C.fine, 0.12, 2800, 5);
// MALL: ambience, the two bubbles, the cards, the chart
ambience(b, C.study - 1.3, cue("then", C.think) + 0.3, FX("mall_amb"), 2.6); ui(C.hundred, 0.24); ui(C.fifteen2, 0.24); for (let i = 0; i < 3; i++) paper(b, C.test + i * 0.15, 0.2, 0.08, i); ui(cue("cheap", C.test) - 0.3, 0.25); whoosh(b, C.dropped - 0.4, 0.8, 0.08, 1500, 300, 9);
// FIELD: ambience, calendar flip, the pay, the chart, the sleep icon
ambience(b, cue("then", C.think) - 0.3, C.call + 0.3, FX("field_amb"), 3.2); ui(C.india, 0.22); paper(b, C.after - 0.25, 0.5, 0.1); coins(b, C.paid, 0.08); ui(C.worse - 0.4, 0.24); bell(b, C.sleep, 784, 0.05);
// BRAIN: low heartbeat while it fills, the tunnel closes
for (let t = C.worry - 0.3; t < C.room; t += 0.9) { thud(b, t, 0.18); thud(b, t + 0.22, 0.12); } whoosh(b, C.fight - 0.3, 1.2, 0.1, 1200, 200, 12); for (let i = 0; i < 8; i++) paper(b, C.worry + i * 0.35, 0.15, 0.06, i + 30);
// NIGHT: rain returns; the 6.1 million card; the loop closes around him
const rainS = FX("rain_loop"); ambience(b, C.its - 1.1, END + 0.8, rainS, 4.0); ui(C.six - 0.2, 0.25); whoosh(b, C.trap - 0.2, 0.9, 0.12, 300, 1600, 13);
reverb(b, 0.16, 1);
writeWav(new URL("./sfx.wav", import.meta.url).pathname, b);
console.log("n02b sfx ok, END", END.toFixed(2));
