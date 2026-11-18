// SFX for N02 film C (the turn, payoff, close), on the same word cues as the film.
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav, loadSample, sample, ambience } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("../n02/words.json", import.meta.url)));
const T0 = 305.1, cue = (w, after = T0 - 1) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const FX = (n) => loadSample(new URL(`../n02/audio/fx/${n}.mp3`, import.meta.url).pathname);
const C = {}; ["savings", "something", "expensive", "less", "round", "rare", "third", "look", "cushion", "slows", "remember", "fifty", "jar", "numbers", "survey", "nine",
  "another", "half", "worrying", "twenty", "enough", "left", "receipt", "stops", "quieter", "plan", "step", "open", "separate", "set", "move", "high", "grows", "buy", "question", "yes", "being", "flaw", "price", "stop"].forEach((w) => (C[w] = cue(w)));
C.no = cue("no", cue("here's")); C.breaks = cue("breaks", C.something); C.fee = cue("fee", C.expensive); C.loan = cue("loan", C.fee); C.pack = cue("pack", C.loan); C.still = cue("still", cue("therefore", C.less));
C.four = cue("four", C.third); C.break2 = cue("break", C.cushion); C.boots = cue("boots", C.jar); C.way = cue("way", C.worrying); C.cheap = cue("cheap", C.way); C.week = cue("week", C.way);
C.next = cue("next", C.left); C.breaks2 = cue("breaks", C.next); C.pays = cue("pays", C.breaks2); C.fee2 = cue("fee", C.pays); C.loan2 = cue("loan", C.fee2); C.loop = cue("loop", C.receipt);
C.boots2 = cue("boots", C.separate); C.every = cue("every", C.move); C.much = cue("much", C.move); C.yield = cue("yield", C.high); C.question2 = C.question; C.boots3 = cue("boots", C.yes); C.poor = cue("poor", C.being);
const END = 430, b = buffer(END + 1);
const ui = (t, v = 0.25) => pop(b, t, v, 900, 320), wh = (t, d = 0.8, v = 0.14) => whoosh(b, t, d, v);
for (const t of [C.remember - 0.5, C.numbers - 0.8, C.way - 1.0, C.next - 0.6, C.step - 0.6, C.buy - 1.0, C.being - 0.6]) wh(t);
// LOOP: stations pop, the track scratches on like chalk, the running feet, the $400 lands, the snip
for (const t of [C.no, C.breaks, C.expensive, C.less]) ui(t, 0.26); for (const t of [C.fee, C.loan, C.pack]) ui(t, 0.18);
for (let t = C.round - 0.4; t < C.slows; t += Math.max(0.12, 0.3 - (t - C.round) * 0.012)) tick(b, t, 0.05, 1400, Math.round(t * 10));
ui(C.rare, 0.25); for (let i = 0; i < 37; i++) tick(b, C.third + i * 0.025, 0.04, 2600, i); thud(b, C.four + 0.5, 0.3);
sample(b, C.break2, FX("snip"), 0.22 / FX("snip").peak); thud(b, C.slows + 0.1, 0.25);
// LOCKER: the jar tips, coins pour, the good boots appear
for (let i = 0; i < 9; i++) coins(b, C.fifty + i * 0.1, 0.03, i); ui(C.fifty + 0.4, 0.22); shimmer(b, C.boots, C.boots + 1.2, 0.04);
// NUMBERS
ui(C.survey - 0.4, 0.2); ui(C.survey - 0.1, 0.2); thud(b, C.nine, 0.3); ui(C.another, 0.22); bell(b, C.half, 880, 0.05);
// JAR: the $10 goes in, the weeks tick by, the $400 line, the total
coins(b, C.cheap + 0.8, 0.06); for (let i = 0; i < 52; i++) tick(b, C.week - 0.2 + i * (C.twenty + 0.8 - C.week) / 52, 0.05, 2400 + (i % 4) * 200, i); bell(b, C.enough, 1046, 0.06); ui(C.twenty - 0.2, 0.28); ui(C.left - 0.2, 0.22);
// CARFIX: the cough, paying cash, crossing out fee and loan, the receipt, the counter drops to zero
sample(b, C.breaks2 - 0.2, FX("car_die"), 0.08 / FX("car_die").peak, { alignPeak: false }); paper(b, C.pays, 0.6, 0.1); thud(b, C.fee2 + 0.2, 0.25); thud(b, C.loan2 + 0.2, 0.25);
sample(b, C.receipt - 0.2, FX("receipt"), 0.14 / FX("receipt").peak, { alignPeak: false }); whoosh(b, C.loop - 0.6, 0.6, 0.1); for (let i = 0; i < 14; i++) tick(b, C.stops + i * 0.035, 0.07, 3400 - i * 80, i); shimmer(b, C.stops, C.stops + 1.2, 0.04);
// PHONE: taps, typing, the toggle
ui(C.open, 0.18); for (let i = 0; i < 5; i++) tick(b, C.boots2 - 0.6 + i * 0.16, 0.12, 4200, i); ui(C.set, 0.18); tick(b, C.every, 0.25, 1600, 7); thud(b, C.every + 0.05, 0.12); ui(C.yield - 0.2, 0.22); bell(b, C.grows, 1318, 0.04);
// SHELF: tags flip; the boots card
ui(C.buy + 0.4, 0.16); for (let i = 0; i < 3; i++) paper(b, C.question + i * 0.25, 0.3, 0.08, i); ui(C.boots3 - 0.2, 0.26);
// DAWN: birds; the step into the puddle makes no sound; a soft shimmer instead
ambience(b, C.being - 0.6, END, FX("dawn_amb"), 3.0); shimmer(b, C.flaw - 0.2, C.flaw + 1.0, 0.035); ui(C.stop, 0.15); pop(b, END - 9, 0.2, 700, 300);
reverb(b, 0.16, 1);
writeWav(new URL("./sfx.wav", import.meta.url).pathname, b);
console.log("n02c sfx ok, END", END);
