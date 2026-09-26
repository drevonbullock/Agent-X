// SFX for the rebuilt opening, synced to the same word cues the visuals use.
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("./words.json", import.meta.url)));
const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const C = {}; ["taller", "sank", "nobody", "generations", "not", "spend", "everyone", "strange", "bank", "learn", "yap", "group", "giant", "hand", "twelve", "car", "wild", "palau", "miles", "sailed", "months", "floated", "journey", "hard", "risked", "changed", "stayed", "knew", "ceremonies", "oldest"].forEach((w) => (C[w] = cue(w)));
C.pacific = cue("pacific", C.group); C.story = cue("story", C.risked); C.think = cue("think", C.story); C.still = cue("still", C.knew);
const b = buffer(113);
whoosh(b, 0.2, 2.8, 0.18, 150, 1200, 2);                         // the dive
pop(b, C.taller + 0.1, 0.25); pop(b, C.sank + 0.2, 0.2); tick(b, C.nobody + 0.9, 0.2, 2200);
shimmer(b, C.generations, C.generations + 2, 0.04);
whoosh(b, C.not, 1.8, 0.22, 200, 2400, 4); paper(b, C.not + 1.6, 0.4, 0.12);   // rising, breaking the surface
for (let i = 0; i < 3; i++) pop(b, C.spend + 1.2 + i * 0.35, 0.25, 800, 300);
for (let i = 0; i < 5; i++) pop(b, C.everyone + 0.25 + i * 0.22, 0.2, 1100 + i * 60, 500);
for (let i = 0; i < 20; i++) tick(b, C.strange + 1.5 + i * 0.11, 0.07, 3600, i);  // the question writing
pop(b, C.bank, 0.3); pop(b, C.bank + 0.5, 0.25); pop(b, C.bank + 1.0, 0.3);
thud(b, C.learn + 0.8, 0.35);
whoosh(b, C.yap - 0.9, 1.2, 0.2, 300, 3000, 6); bell(b, C.yap + 0.3, 880, 0.05);
whoosh(b, C.pacific - 0.6, 1.0, 0.15); whoosh(b, C.giant - 0.5, 0.8, 0.18);
pop(b, C.hand - 0.5, 0.25); pop(b, C.twelve - 0.3, 0.35, 500, 150); thud(b, C.car + 0.6, 0.45);
whoosh(b, C.wild, 0.8, 0.16); pop(b, C.wild + 0.9, 0.3); pop(b, C.palau - 0.3, 0.25);
for (let i = 0; i < 14; i++) tick(b, C.miles - 0.4 + i * 0.1, 0.06, 2800, i);
paper(b, C.sailed, 0.8, 0.08);
for (let i = 0; i < 12; i++) tick(b, C.months + i * 0.2, 0.14, 4200, i + 30);   // chisel
whoosh(b, C.floated + 0.6, 1.8, 0.1, 80, 500, 9); thud(b, C.floated + 1.3, 0.35);
whoosh(b, C.journey - 0.3, 0.9, 0.18); pop(b, C.hard, 0.3); pop(b, C.risked, 0.3); pop(b, C.story - 0.9, 0.3); bell(b, C.story, 1046.5, 0.07);
thud(b, C.think + 0.8, 0.3);
paper(b, C.changed + 0.8, 0.35, 0.14); pop(b, C.stayed, 0.3);
for (let i = 0; i < 6; i++) pop(b, C.knew - 1.2 + i * 0.1, 0.18, 1200, 600);
whoosh(b, C.still - 0.4, 1.0, 0.16); coins(b, C.ceremonies + 1, 0.06);
thud(b, C.oldest + 0.45, 0.7); shimmer(b, C.oldest + 0.5, C.oldest + 2.5, 0.04);
reverb(b, 0.18, 1);
writeWav(new URL("./sfx.wav", import.meta.url).pathname, b);
console.log("sfx ok");
