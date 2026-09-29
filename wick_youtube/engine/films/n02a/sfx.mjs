// SFX for N02 film A (cold open + CH1), on the same word cues the visuals use (films/n02/words.json).
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav, squelch, rainBed } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("../n02/words.json", import.meta.url)));
const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const C = {};
["dee", "job", "dry", "question", "years", "guess", "answer", "laziness", "novel", "pratchett", "guard", "earned", "month", "good", "apart",
  "therefore", "hundred", "twice", "wet", "key", "expensive", "trap", "everywhere", "real", "tax", "follow", "tuesday", "works"].forEach((w) => (C[w] = cue(w)));
C.pay = cue("pay", C.job); C.tenB = cue("ten", C.question); C.fiftyB = cue("fifty", C.question); C.poor = cue("poor", C.answer); C.out = cue("out", C.laziness);
C.cheapA = cue("cheap", C.out); C.fiftyG = cue("fifty", C.good); C.pay2 = cue("pay", C.good); C.tenYears = cue("years", C.good); C.cheapB = cue("cheap", C.tenYears);
C.season = cue("season"); C.fiftyD = cue("fifty", C.apart); C.again2 = cue("again", C.therefore); C.again3 = cue("again", C.again2 + 0.1); C.again4 = cue("again", C.again3 + 0.1);
C.all = cue("all", C.expensive);
const END = C.tuesday - 0.5, b = buffer(END + 1);
// rain under the street scenes (it keeps falling, even while the board is up)
rainBed(b, 0, C.novel - 0.6, 0.05); rainBed(b, C.real - 0.5, END + 0.8, 0.04, 33);
// his steps: the first wet step in the close-up, then every footfall of the walk (the walk cycle's plant points)
squelch(b, 0.62, 0.42);
for (let ph = Math.ceil(2.6 * 1.7 * 2) / 2; ph / 1.7 < 10.2; ph += 0.5) squelch(b, ph / 1.7 + 0.12, 0.22, 12 + Math.round(ph * 2));
paper(b, C.works + 0.2, 0.3, 0.1); thud(b, C.works + 0.35, 0.25); paper(b, C.dee + 0.2, 0.3, 0.1); thud(b, C.dee + 0.35, 0.2); pop(b, C.pay, 0.2);
whoosh(b, C.dry - 0.5, 0.6, 0.12); shimmer(b, C.dry + 0.1, C.dry + 1.2, 0.03);
// the board drops in, prices, the timeline, the question
whoosh(b, C.question - 0.1, 0.8, 0.2, 200, 1400, 3); thud(b, C.question + 0.55, 0.45);
pop(b, C.tenB, 0.3); pop(b, C.fiftyB, 0.3); for (let i = 0; i < 11; i++) tick(b, C.years - 0.1 + i * 0.07, 0.07, 2600, i); pop(b, C.years + 0.3, 0.35, 700, 200);
pop(b, C.poor, 0.25); pop(b, C.laziness, 0.25); pop(b, C.out, 0.25); whoosh(b, C.cheapA - 0.1, 0.5, 0.1, 800, 3000, 9); thud(b, C.cheapA + 0.45, 0.4);
// CH1: the book, the guard, the pay slip
whoosh(b, C.novel - 1.2, 1.0, 0.16); paper(b, C.novel - 0.3, 0.8, 0.14); pop(b, C.pratchett, 0.25); paper(b, C.guard, 0.3, 0.08); paper(b, C.earned, 1.4, 0.07, 8);
whoosh(b, C.good - 0.3, 0.8, 0.14); pop(b, C.good + 0.2, 0.3); coins(b, C.fiftyG, 0.07); pop(b, C.pay2 - 0.4, 0.2); pop(b, C.pay2 - 0.2, 0.2);
for (let i = 0; i < 10; i++) tick(b, C.tenYears - 0.2 + i * 0.1, 0.06, 2200, i);
// every cheap pair: a pop and a register tick; the old pair cracks
const pairT = [C.cheapB, C.therefore + 0.6, C.again2, C.again3, C.again4]; for (let i = 5; i < 10; i++) pairT.push(C.again4 + 0.45 + (C.hundred - 0.35 - C.again4 - 0.45) * (i - 5) / 4);
pairT.forEach((t, i) => { pop(b, t, 0.28, 900, 300); tick(b, t + 0.08, 0.12, 4200, i + 20); if (i) tick(b, t + 0.02, 0.1, 1200, i + 40); });
pop(b, C.fiftyD, 0.2); coins(b, C.hundred, 0.08); thud(b, C.twice, 0.35); tick(b, C.wet + 0.6, 0.2, 1800, 3);
// the key: the tag splits into coins, snaps back, slams down; the lock; the icons
whoosh(b, C.key - 0.1, 0.6, 0.1); for (let i = 0; i < 5; i++) coins(b, C.expensive - 0.1 + i * 0.05, 0.03, i);
whoosh(b, C.all - 0.4, 0.4, 0.14, 1200, 400, 4); thud(b, C.all + 0.35, 0.6); thud(b, C.all + 0.5, 0.3); tick(b, C.trap, 0.2, 900, 5);
for (let i = 0; i < 5; i++) pop(b, C.everywhere + i * 0.16, 0.2, 1000 + i * 80, 400);
// back on the street: the board flips to BROKE TAX, the calendar ticks in
whoosh(b, C.real - 0.3, 0.8, 0.14); whoosh(b, C.tax - 0.25, 0.5, 0.12, 400, 2400, 11); thud(b, C.tax + 0.2, 0.3);
for (let m = 0; m < 12; m++) tick(b, C.follow - 0.2 + m * 0.08, 0.08, 3000, m);
reverb(b, 0.16, 1);
writeWav(new URL("./sfx.wav", import.meta.url).pathname, b);
console.log("n02a sfx ok, END", END.toFixed(2));
