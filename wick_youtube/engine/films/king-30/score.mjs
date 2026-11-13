// Score + SFX + VO for king-30. Music and SFX are synthesized; VO is ElevenLabs.
// LEVELS ARE MEASURED, NOT GUESSED (Dre, 2026-09-25: "the music is way too loud,
// I can't hear anything they're saying"): the music bed is auto-scaled to sit
// 22 dB under the narration's speech RMS, and ducks a further ~8 dB while he talks.
import path from "path";
import { execFileSync } from "child_process";
import fs from "fs";
import { SR, buffer, NOTE, pad, pluck, bell, pop, tick, thud, whoosh, coins, paper, shimmer, reverb, writeWav, rng, biquad } from "../../lib/synth.mjs";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const IMAGEIO_FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const FFMPEG = process.env.FFMPEG || (fs.existsSync(IMAGEIO_FF) ? IMAGEIO_FF : "ffmpeg");
const DUR = 30.5, VO_AT = 0.3;
const T = { walk: [0.2, 3.1], chess: 4.1, bow: 4.2, present: 4.9, loves: 6.2, reward: 9.15, gold: 11.45, land: 11.9, palace: 12.35,
  smiled: 13.45, grain: 15.2, board: 15.95, sq: [16.3, 18.3, 19.7], double: 21.8, laughed: 23.05, noIdea: 25.9, pile: [25.9, 29.2], crown: 28.0, title: 29.25 };

const rms = (L, R, a, b) => { let s = 0, n = 0; for (let i = Math.floor(a * SR); i < Math.min(L.length, b * SR); i++) { s += L[i] * L[i] + R[i] * R[i]; n += 2; } return Math.sqrt(s / Math.max(1, n)); };

// ── VO ──
const raw = execFileSync(FFMPEG, ["-v", "error", "-i", path.join(DIR, "audio/vo.wav"), "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
const vo32 = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const vo = buffer(DUR);
for (let i = 0; i * 2 + 1 < vo32.length; i++) { const j = i + Math.floor(VO_AT * SR); if (j < vo[0].length) { vo[0][j] = vo32[i * 2]; vo[1][j] = vo32[i * 2 + 1]; } }
// speech RMS over the voiced parts only
let voR = 0; { let s = 0, n = 0; for (let i = 0; i < vo[0].length; i += 64) { const v = Math.abs(vo[0][i]); if (v > 0.02) { s += v * v; n++; } } voR = Math.sqrt(s / Math.max(1, n)); }

// ── MUSIC: a gentle court tune ──
const music = buffer(DUR);
pad(music, 0, 30, NOTE("D2"), 0.05, { attack: 2, release: 2, bright: 0.25 });
pad(music, 0, 30, NOTE("A2"), 0.035, { attack: 2, release: 2, bright: 0.25 });
{
  const arps = [["D4", "A4", "D5", "F5"], ["C4", "G4", "C5", "E5"], ["Bb3", "F4", "Bb4", "D5"], ["C4", "G4", "C5", "E5"]];
  let t = 0.4, k = 0;
  while (t < 29.2) {
    const a = arps[Math.floor(k / 8) % 4];
    const hush = t > T.noIdea ? 0.4 : 1;
    pluck(music, t, NOTE(a[k % 4]), 0.06 * hush, { decay: 0.8, tone: "lute", pan: ((k % 4) / 1.5) - 1 });
    t += 0.36; k++;
  }
  // tension under the reveal
  for (const [n, t0] of [["D3", 25.9], ["Eb3", 27.0], ["E3", 28.0]]) pad(music, t0, 1.2, NOTE(n), 0.05, { attack: 0.3, release: 0.8, bright: 0.5 });
  for (const n of ["D3", "A3", "D4", "F#4", "A4"]) pad(music, T.title, 1.1, NOTE(n), 0.04, { attack: 0.3, release: 1.2, bright: 0.5 });
}

// ── SFX ──
const sfx = buffer(DUR);
{ // footsteps synced to the walk cycle: a step every half phase turn
  const invX = (t) => -7.9 + 6.85 * (1 - Math.pow(1 - Math.min(1, Math.max(0, (t - T.walk[0]) / (T.walk[1] - T.walk[0]))), 3));
  let last = 0;
  for (let t = T.walk[0]; t < T.walk[1]; t += 1 / 120) {
    const ph = (invX(t) + 7.9) * 3.3, step = Math.floor(ph / Math.PI);
    if (step > last) { last = step; thud(sfx, t, 0.12); tick(sfx, t, 0.05, 900, step); }
  }
}
whoosh(sfx, T.bow, 0.5, 0.06, 300, 1200);
bell(sfx, T.present + 0.1, 1318.5, 0.05, 1.2);
shimmer(sfx, T.loves, T.loves + 1.3, 0.03, 5, [81, 84, 86, 88, 91]);
pop(sfx, T.reward + 0.05, 0.14, 700, 280);
pop(sfx, T.gold, 0.16, 800, 260); coins(sfx, T.gold + 0.05, 0.05);
pop(sfx, T.land, 0.16, 700, 240); paper(sfx, T.land + 0.05, 0.3, 0.07);
pop(sfx, T.palace, 0.16, 600, 220);
whoosh(sfx, T.smiled, 0.7, 0.1, 300, 2200, 14);
bell(sfx, T.grain + 0.05, 2093, 0.045, 1.0);
whoosh(sfx, T.board - 0.15, 0.4, 0.08, 400, 2400, 15);
[1, 2, 4].forEach((n, c) => { for (let j = 0; j < n; j++) tick(sfx, T.sq[c] + 0.5 + j * 0.08, 0.12, 2600 + c * 200 + j * 60, c * 10 + j); });
shimmer(sfx, T.double, T.double + 1.1, 0.035, 9, [79, 81, 84, 86, 88, 91, 93]);
for (let i = 0; i < 8; i++) tick(sfx, T.double + 0.12 * i, 0.07, 1800 + i * 250, 40 + i);
{ // the pile: a rising rumble and pouring grain
  const r = rng(3), lp = biquad("lp", 180), hp = biquad("hp", 2500);
  const a = Math.floor(T.pile[0] * SR), b = Math.floor((T.pile[1] + 0.8) * SR);
  for (let i = a; i < b; i++) {
    const k = (i - a) / (b - a), env = Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 0.7;
    const rumble = lp(r() * 2 - 1) * 0.35 * k, pour = hp(r() * 2 - 1) * 0.06 * env * (0.6 + 0.4 * Math.sin(i / 900));
    sfx[0][i] += (rumble + pour) * env; sfx[1][i] += (rumble * 0.9 + pour * 1.1) * env;
  }
}
bell(sfx, T.crown, 3136, 0.06, 0.5); bell(sfx, T.crown + 0.9, 2637, 0.04, 0.4);

// ── MIX with measured levels ──
const wetMusic = reverb(music, 0.3, 1.1), wetSfx = reverb(sfx, 0.15, 0.8);
const musR = rms(wetMusic[0], wetMusic[1], 0.5, 29);
const musGain = (voR * Math.pow(10, -22 / 20)) / Math.max(1e-6, musR);
const out = buffer(DUR);
let env = 0;
for (let i = 0; i < out[0].length; i++) {
  const lvl = Math.abs(vo[0][i]) + Math.abs(vo[1][i]);
  env = lvl > env ? env + (lvl - env) * 0.02 : env + (lvl - env) * 0.00012;
  const duck = 1 - Math.min(0.6, env / (voR * 2 + 1e-6) * 0.6);      // up to ~8 dB more under speech
  const fade = i / SR > 29.9 ? Math.max(0, 1 - (i / SR - 29.9) / 0.6) : 1;
  out[0][i] = (vo[0][i] + wetMusic[0][i] * musGain * duck + wetSfx[0][i] * 0.8) * fade;
  out[1][i] = (vo[1][i] + wetMusic[1][i] * musGain * duck + wetSfx[1][i] * 0.8) * fade;
}
writeWav(path.join(DIR, "mix.wav"), out);
console.log(`vo speech rms ${(20 * Math.log10(voR)).toFixed(1)} dBFS | music bed ${(20 * Math.log10(musR * musGain)).toFixed(1)} dBFS (22 dB under) | wrote mix.wav`);
