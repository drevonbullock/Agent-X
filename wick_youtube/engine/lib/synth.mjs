// Audio drawn in code, like the pictures: a tiny synth for score beds and SFX.
// Everything renders into Float32 stereo buffers at 44.1kHz, then writeWav().
import fs from "fs";

export const SR = 44100;
export function buffer(seconds) { const n = Math.ceil(seconds * SR); return [new Float32Array(n), new Float32Array(n)]; }

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const NOTE = (name) => { // "D4", "Bb3", "F#5"
  const m = name.match(/^([A-G])([#b]?)(-?\d)$/);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 12 * (+m[3] + 1) + base;
};

// biquad (RBJ) — lowpass / bandpass / highpass
export function biquad(type, f, q = 0.707) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = a; b1 = 0; b2 = -a; }
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f_ = (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  f_.set = (nf) => { const w2 = 2 * Math.PI * nf / SR, c2 = Math.cos(w2), s2 = Math.sin(w2), a_ = s2 / (2 * q);
    if (type === "bp") { b0 = a_; b2 = -a_; } else if (type === "lp") { b0 = (1 - c2) / 2; b1 = 1 - c2; b2 = b0; }
    a0 = 1 + a_; a1 = -2 * c2; a2 = 1 - a_; };
  return f_;
}

const add = (buf, i, l, r) => { if (i >= 0 && i < buf[0].length) { buf[0][i] += l; buf[1][i] += r; } };

// ── instruments ─────────────────────────────────────────────────────────────
// soft pad: detuned additive voices, slow attack/release, gentle lowpass
export function pad(buf, t0, dur, midi, vol = 0.05, { attack = 1.2, release = 1.6, bright = 0.35, pan = 0 } = {}) {
  const f = mtof(midi), n = Math.ceil((dur + release) * SR), i0 = Math.floor(t0 * SR);
  const lp = biquad("lp", 900 + bright * 2000, 0.6);
  const det = [0.997, 1, 1.004];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
    let s = 0;
    for (const d of det) { const ph = 2 * Math.PI * f * d * t; s += Math.sin(ph) + 0.35 * Math.sin(2 * ph) * bright + 0.15 * Math.sin(3 * ph) * bright; }
    s = lp(s / 3) * env * vol * (1 + 0.08 * Math.sin(t * 0.7));
    add(buf, i0 + i, s * (1 - pan * 0.5), s * (1 + pan * 0.5));
  }
}
// plucked / music-box / marimba tone
export function pluck(buf, t0, midi, vol = 0.12, { decay = 1.2, tone = "box", pan = 0 } = {}) {
  const f = mtof(midi), n = Math.ceil(decay * 4 * SR), i0 = Math.floor(t0 * SR);
  const parts = tone === "box" ? [[1, 1], [3.01, 0.25], [5.2, 0.08]] : tone === "marimba" ? [[1, 1], [4, 0.2], [9.8, 0.05]] : [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1]];
  for (let i = 0; i < n; i++) {
    const t = i / SR, att = Math.min(1, t / 0.004);
    let s = 0;
    for (const [m, a] of parts) s += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m * 1.3) / decay);
    s *= att * vol;
    add(buf, i0 + i, s * (1 - pan * 0.6), s * (1 + pan * 0.6));
  }
}
export function bell(buf, t0, f, vol = 0.08, decay = 2.5, pan = 0) {
  const n = Math.ceil(decay * 3 * SR), i0 = Math.floor(t0 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const s = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 2) + 0.25 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 4)) * Math.exp(-t / decay) * vol * Math.min(1, t / 0.002);
    add(buf, i0 + i, s * (1 - pan * 0.6), s * (1 + pan * 0.6));
  }
}

// ── SFX ─────────────────────────────────────────────────────────────────────
export function pop(buf, t0, vol = 0.35, f0 = 900, f1 = 240) {
  const n = Math.ceil(0.18 * SR), i0 = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t * 40);
    ph += 2 * Math.PI * f / SR;
    const s = Math.sin(ph) * Math.exp(-t * 28) * vol;
    add(buf, i0 + i, s, s);
  }
}
export function tick(buf, t0, vol = 0.18, f = 3200, seed = 1) {
  const r = rng(seed), bp = biquad("bp", f, 6), n = Math.ceil(0.05 * SR), i0 = Math.floor(t0 * SR);
  for (let i = 0; i < n; i++) { const t = i / SR; const s = bp(r() * 2 - 1) * Math.exp(-t * 90) * vol * 6; add(buf, i0 + i, s, s); }
}
export function thud(buf, t0, vol = 0.6) {
  const r = rng(3), lp = biquad("lp", 300), n = Math.ceil(0.6 * SR), i0 = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 55 + 70 * Math.exp(-t * 30); ph += 2 * Math.PI * f / SR;
    const s = (Math.sin(ph) * Math.exp(-t * 7) + lp(r() * 2 - 1) * Math.exp(-t * 25) * 0.8) * vol;
    add(buf, i0 + i, s, s);
  }
}
export function whoosh(buf, t0, dur = 0.6, vol = 0.25, lo = 300, hi = 2600, seed = 5) {
  const r = rng(seed), bp = biquad("bp", lo, 1.2), n = Math.ceil(dur * SR), i0 = Math.floor(t0 * SR);
  for (let i = 0; i < n; i++) {
    const k = i / n, env = Math.sin(Math.PI * k) ** 2;
    if (i % 64 === 0) bp.set(lo + (hi - lo) * Math.sin(Math.PI * k));
    const s = bp(r() * 2 - 1) * env * vol * 3;
    add(buf, i0 + i, s * (1 - k * 0.6), s * (0.4 + k * 0.6));
  }
}
export function scribble(buf, t0, t1, vol = 0.07, seed = 9) {
  const r = rng(seed), bp = biquad("bp", 2200, 3), n = Math.ceil((t1 - t0) * SR), i0 = Math.floor(t0 * SR);
  let stroke = 0, target = 0;
  for (let i = 0; i < n; i++) {
    if (i % 2200 === 0) { target = r() > 0.25 ? 0.6 + r() * 0.4 : 0.05; bp.set(1600 + r() * 1800); }
    stroke += (target - stroke) * 0.002;
    const s = bp(r() * 2 - 1) * stroke * vol * 5;
    add(buf, i0 + i, s, s * 0.9);
  }
}
export function coins(buf, t0, vol = 0.1, seed = 4) {
  const r = rng(seed);
  for (let k = 0; k < 9; k++) bell(buf, t0 + r() * 0.45, 2400 + r() * 2600, vol * (0.5 + r() * 0.5), 0.35, r() * 2 - 1);
}
export function paper(buf, t0, dur = 0.35, vol = 0.12, seed = 6) {
  const r = rng(seed), hp = biquad("hp", 1800), n = Math.ceil(dur * SR), i0 = Math.floor(t0 * SR);
  let g = 0;
  for (let i = 0; i < n; i++) { if (i % 300 === 0) g = r() > 0.5 ? r() : 0.1; const s = hp(r() * 2 - 1) * g * vol * Math.sin(Math.PI * i / n); add(buf, i0 + i, s, s); }
}
export function shimmer(buf, t0, t1, vol = 0.05, seed = 7, notes = [86, 89, 91, 93, 96, 98]) {
  const r = rng(seed);
  for (let t = t0; t < t1; ) {
    const k = (t - t0) / (t1 - t0);
    bell(buf, t, mtof(notes[Math.floor(r() * notes.length)]), vol * (0.4 + k * 0.8), 0.9, r() * 2 - 1);
    t += 0.22 - k * 0.14;
  }
}

// ── mixing ──────────────────────────────────────────────────────────────────
// Schroeder reverb (4 combs + 2 allpasses), wet only
export function reverb(buf, mix = 0.25, size = 1) {
  const out = buffer(buf[0].length / SR);
  for (let ch = 0; ch < 2; ch++) {
    const x = buf[ch], y = out[ch];
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.floor(d * size) + ch * 23, b: new Float32Array(Math.floor(d * size) + 40), i: 0, fb: 0.84, s: 0 }));
    const aps = [556, 441].map((d) => ({ d, b: new Float32Array(d), i: 0 }));
    for (let n = 0; n < x.length; n++) {
      let s = 0;
      for (const c of combs) { const o = c.b[c.i]; c.s = o * 0.8 + c.s * 0.2; c.b[c.i] = x[n] + c.s * c.fb; c.i = (c.i + 1) % c.d; s += o; }
      s *= 0.25;
      for (const a of aps) { const o = a.b[a.i]; const v = s + o * 0.5; a.b[a.i] = v; a.i = (a.i + 1) % a.d; s = o - v * 0.5; }
      y[n] = x[n] + s * mix;
    }
  }
  return out;
}

export function writeWav(file, buf) {
  const n = buf[0].length, data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0); data.writeUInt32LE(36 + n * 4, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
  data.write("data", 36); data.writeUInt32LE(n * 4, 40);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[0][i]), Math.abs(buf[1][i]));
  const g = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[0][i] * g)) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[1][i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, data);
}
