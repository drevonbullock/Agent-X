// Score + SFX + VO mix for the test film. All sound except the narration is
// synthesized here. Cue times mirror the beat sheet T in film.js.
//   FFMPEG=... node films/test-chessboard/score.mjs  → films/test-chessboard/mix.wav
import path from "path";
import { execFileSync } from "child_process";
import { SR, buffer, NOTE, pad, pluck, bell, pop, tick, thud, whoosh, scribble, coins, paper, shimmer, reverb, writeWav, rng } from "../../lib/synth.mjs";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const DUR = 59, VO_AT = 1.2;
const T = { grain: 1.35, lastSquare: 5.15, b02: 12.9, when: 20.35, toDesk: 22.25, line1: [24.25, 25.45], gt: [25.5, 25.85],
  line2: [25.95, 27.75], stamp: 28.15, iris: 30.85, chess: 33.3, loves: 35.95, gold: 40.62, land: 41.55, palace: 42.25,
  waves: 43.5, asks: 45.5, sq: [47.25, 48.95, 49.95, 51.5], ripple: [52.9, 54.6], title: 54.9 };

// ── MUSIC ───────────────────────────────────────────────────────────────────
const music = buffer(DUR);
const chord = (t, dur, notes, vol, o) => notes.forEach((n, i) => pad(music, t, dur, NOTE(n), vol, { pan: (i % 2 ? 0.4 : -0.4), ...o }));
// A · cosmic (0–22.3): wide, slow, a little lonely
[["D3", "A3", "E4", "F4"], ["Bb2", "F3", "D4", "A4"], ["F3", "C4", "E4", "A4"], ["C3", "G3", "D4", "E4"]]
  .forEach((c, i) => chord(i * 5.6, 5.6, c, 0.035, { attack: 1.8, release: 2.2, bright: 0.2 }));
{
  const r = rng(11), scale = ["D5", "F5", "G5", "A5", "C6", "D6", "E5"];
  for (let t = 1.6; t < 22; t += 0.75 + (r() > 0.7 ? 0.75 : 0)) pluck(music, t, NOTE(scale[Math.floor(r() * scale.length)]), 0.05, { decay: 1.6, tone: "box", pan: r() * 2 - 1 });
}
// B · desk (22.6–31.4): playful marimba on 8ths
{
  const prog = [["A2", ["A4", "C5", "E5", "C5"]], ["F2", ["F4", "A4", "C5", "A4"]], ["C3", ["E4", "G4", "C5", "G4"]], ["G2", ["D4", "G4", "B4", "G4"]]];
  let t = 22.7, k = 0;
  while (t < 31.2) {
    const [bass, arp] = prog[Math.floor(k / 8) % 4];
    if (k % 8 === 0) pluck(music, t, NOTE(bass), 0.09, { decay: 0.9, tone: "marimba" });
    if (!(t > T.stamp - 0.05 && t < T.stamp + 0.55)) pluck(music, t, NOTE(arp[k % 4]), 0.05, { decay: 0.45, tone: "marimba", pan: k % 2 ? 0.3 : -0.3 });
    t += 0.3; k++;
  }
}
// C · palace (31.6–54.9): D dorian lute arpeggios over a drone, the court
{
  pad(music, 31.6, 23.2, NOTE("D2"), 0.04, { attack: 2, release: 2, bright: 0.3 });
  pad(music, 31.6, 23.2, NOTE("A2"), 0.03, { attack: 2, release: 2, bright: 0.3 });
  const arps = [["D4", "A4", "D5", "F5"], ["C4", "G4", "C5", "E5"], ["Bb3", "F4", "Bb4", "D5"], ["C4", "G4", "C5", "E5"]];
  let t = 31.9, k = 0;
  while (t < 54.8) {
    const a = arps[Math.floor(k / 8) % 4];
    const hush = t > T.asks && t < T.sq[3] + 0.4 ? 0.5 : 1;   // thin out while the grains count
    pluck(music, t, NOTE(a[k % 4]), 0.055 * hush, { decay: 0.8, tone: "lute", pan: (k % 4) / 1.5 - 1 });
    t += 0.36; k++;
  }
}
// D · title (54.9–59): warm resolve
chord(54.9, 3.2, ["F3", "C4", "E4", "A4", "G4"], 0.05, { attack: 0.6, release: 1.4, bright: 0.45 });
bell(music, 54.95, 880, 0.06, 2.5); bell(music, 55.3, 1318.5, 0.04, 2.5, 0.4);

// ── SFX ─────────────────────────────────────────────────────────────────────
const sfx = buffer(DUR);
pop(sfx, T.grain + 0.55, 0.3);
shimmer(sfx, T.lastSquare, 11.8, 0.035, 3);
bell(sfx, 11.4, 1174.7, 0.05, 3);
whoosh(sfx, T.b02 + 0.4, 1.4, 0.12, 200, 1200);
whoosh(sfx, T.when + 0.0, 0.8, 0.1, 500, 2400, 8); whoosh(sfx, T.when + 0.75, 0.8, 0.1, 500, 2400, 9);
whoosh(sfx, T.toDesk - 0.1, 0.8, 0.18, 300, 3000);
scribble(sfx, T.line1[0], T.line1[1], 0.07, 1);
scribble(sfx, T.gt[0], T.gt[1], 0.07, 2);
scribble(sfx, T.line2[0], T.line2[1], 0.07, 3);
thud(sfx, T.stamp, 0.55);
whoosh(sfx, T.iris - 0.05, 0.75, 0.18, 250, 2200, 12);
pop(sfx, T.chess, 0.25, 700, 300);
shimmer(sfx, T.loves, T.loves + 1.2, 0.04, 5, [81, 84, 86, 88, 91]);
coins(sfx, T.gold, 0.09);
paper(sfx, T.land, 0.4, 0.14);
pop(sfx, T.palace, 0.25, 600, 200);
whoosh(sfx, T.waves + 0.15, 1.0, 0.16, 250, 1800, 14);
pop(sfx, T.waves - 0.3, 0.18, 500, 250);
whoosh(sfx, T.asks - 0.1, 0.5, 0.1, 400, 2000, 15);
[1, 2, 4, 8].forEach((n, c) => { for (let j = 0; j < n; j++) tick(sfx, T.sq[c] + j * 0.06, 0.16, 2600 + c * 300 + j * 40, c * 10 + j); });
shimmer(sfx, T.ripple[0], T.ripple[1], 0.045, 9, [79, 81, 84, 86, 88, 91, 93]);

// ── VO ──────────────────────────────────────────────────────────────────────
const raw = execFileSync(FFMPEG, ["-v", "error", "-i", path.join(DIR, "../../test/vo.mp3"), "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
const vo = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);

// ── MIX: reverb the music, duck it under the voice, sum ──────────────────────
const wetMusic = reverb(music, 0.35, 1.1);
const wetSfx = reverb(sfx, 0.18, 0.8);
const out = buffer(DUR);
const voAt = Math.floor(VO_AT * SR);
let env = 0;
for (let i = 0; i < out[0].length; i++) {
  const j = i - voAt;
  const vl = j >= 0 && j * 2 < vo.length ? vo[j * 2] : 0, vr = j >= 0 && j * 2 + 1 < vo.length ? vo[j * 2 + 1] : 0;
  const lvl = Math.abs(vl) + Math.abs(vr);
  env = lvl > env ? env + (lvl - env) * 0.01 : env + (lvl - env) * 0.00008;   // fast attack, slow release
  const duck = 1 - Math.min(0.55, env * 2.2);
  const fadeOut = i / SR > 57.6 ? Math.max(0, 1 - (i / SR - 57.6) / 1.4) : 1;
  out[0][i] = (vl * 1.0 + wetMusic[0][i] * 1.5 * duck + wetSfx[0][i] * 1.0) * fadeOut;
  out[1][i] = (vr * 1.0 + wetMusic[1][i] * 1.5 * duck + wetSfx[1][i] * 1.0) * fadeOut;
}
writeWav(path.join(DIR, "mix.wav"), out);
console.log("wrote", path.join(DIR, "mix.wav"));
