// SFX for N02 film A (cold open + CH1), on the same word cues the visuals use (films/n02/words.json).
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav, loadSample, sample, ambience } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("../n02/words.json", import.meta.url)));
const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const C = {};
["dee", "job", "dry", "question", "choices", "working", "years", "guess", "answer", "laziness", "novel", "pratchett", "guard", "earned", "month", "good", "apart",
  "therefore", "hundred", "twice", "wet", "key", "expensive", "trap", "everywhere", "real", "tax", "follow", "tuesday", "works"].forEach((w) => (C[w] = cue(w)));
C.pay = cue("pay", C.job); C.tenB = cue("ten", C.question); C.fiftyB = cue("fifty", C.question); C.poor = cue("poor", C.answer); C.out = cue("out", C.laziness);
C.cheapA = cue("cheap", C.out); C.fiftyG = cue("fifty", C.good); C.pay2 = cue("pay", C.good); C.tenYears = cue("years", C.good); C.cheapB = cue("cheap", C.tenYears);
C.season = cue("season"); C.fiftyD = cue("fifty", C.apart); C.again2 = cue("again", C.therefore); C.again3 = cue("again", C.again2 + 0.1); C.again4 = cue("again", C.again3 + 0.1);
C.all = cue("all", C.expensive);
const END = C.tuesday - 0.5, b = buffer(END + 1);
// foley (ElevenLabs sound effects, films/n02/audio/fx): real rain, and a real step on the exact frame each boot lands
const FX = (n) => loadSample(new URL(`../n02/audio/fx/${n}.mp3`, import.meta.url).pathname);
const rainS = FX("rain_loop"), hero = FX("step_hero"), wet = [FX("splash_1"), FX("splash_3"), FX("splash_4")], dee = [FX("splash_4_low"), FX("splash_1")], carS = FX("car_pass");
ambience(b, 0, C.novel - 0.4, rainS, 5.0); ambience(b, C.real - 0.5, END + 0.8, rainS, 4.0);
// inkWick's walk: phase p = t * speed; a foot lands when (p + 0 or 0.5) mod 1 = 0.25, i.e. at p = k/2 + 0.25
const plants = (t0, t1, speed, p0 = 0) => { const out = []; for (let k = Math.ceil(((t0 - p0) * speed - 0.25) * 2); ; k++) { const t = p0 + (k / 2 + 0.25) / speed; if (t >= t1) break; if (t > t0) out.push([t, k]); } return out; };
// footsteps are rain splashes: soft, well under the voice (Dre: "steps in a rain splash, not too loud")
sample(b, 0.15 + 0.25 / 1.3, wet[0], 0.04 / wet[0].peak, { pan: -0.15 });          // close-up: first foot
sample(b, 0.15 + 0.75 / 1.3, hero, 0.12 / hero.peak);                                // close-up: the soaked step (the one the camera is on)
plants(2.6, 10.2, 1.15).forEach(([t, k]) => { const s = wet[k % 3]; sample(b, t, s, (0.045 + 0.008 * ((k * 7) % 3)) / s.peak, { pan: k % 2 ? 0.12 : -0.12, fadeOut: 0.1 }); });
plants(C.dee - 1.8, C.dee + 0.4, 1.15).forEach(([t, k]) => { const s = dee[k % 2]; sample(b, t, s, 0.045 / s.peak, { pan: 0.3, fadeOut: 0.1 }); });
// the car hisses past (peak when it crosses the middle of the frame), the neighbours' bubbles pop in, then burst on "works"
sample(b, 4.6 + 1.6, carS, 0.08 / carS.peak);
pop(b, C.choices, 0.22, 1100, 500); pop(b, C.working, 0.22, 1000, 450); pop(b, C.works - 0.05, 0.3, 700, 180);
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
pop(b, C.fiftyD, 0.2); coins(b, C.hundred, 0.08); thud(b, C.twice, 0.35);
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
