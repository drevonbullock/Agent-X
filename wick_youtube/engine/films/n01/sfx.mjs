// SFX track, timed to the beats. Uses the engine's code-synth (lib/synth.mjs).
import fs from "fs";
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav, SR } from "../../lib/synth.mjs";
const { beats, duration } = JSON.parse(fs.readFileSync(new URL("./beats.json", import.meta.url)));
const film = fs.readFileSync(new URL("./film.js", import.meta.url), "utf8");
const kinds = [...film.matchAll(/sfx: "([a-z0-9]+)"/g)].map((m) => m[1]);
// map each beat index to its sfx by scanning the B[] entries in order
const entries = film.split("\n  { bg:").slice(1).map((e) => (e.match(/sfx: "([a-z0-9]+)"/) || [])[1] || null);
const buf = buffer(duration);
entries.forEach((k, i) => {
  if (!k || !beats[i]) return;
  const t = beats[i].start;
  if (k === "whoosh") whoosh(buf, Math.max(0, t - 0.3), 0.7, 0.22);
  if (k === "pop") pop(buf, t + 0.3, 0.3);
  if (k === "pops4") for (let j = 0; j < 4; j++) pop(buf, t + 0.4 + j * 0.9, 0.28, 900 - j * 120, 240);
  if (k === "thunder") { thud(buf, t + 0.2, 0.7); thud(buf, t + 2.4, 0.5); whoosh(buf, t, 2.5, 0.12, 80, 600, 3); }
  if (k === "splash") { whoosh(buf, t + 0.4, 0.5, 0.3, 400, 4000, 8); thud(buf, t + 5.5, 0.6); }
  if (k === "slaps") for (let j = 0; j < 4; j++) { pop(buf, t + 2.1 + j * 2.2, 0.4, 500, 120); paper(buf, t + 2.1 + j * 2.2, 0.2, 0.14); }
  if (k === "chime") { bell(buf, t + 0.3, 1046.5, 0.07); bell(buf, t + 0.55, 1568, 0.05); }
  if (k === "coins") { coins(buf, t + 0.5, 0.12); coins(buf, t + 2.5, 0.1, 7); }
  if (k === "ticks") for (let j = 0; j < 20; j++) tick(buf, t + 0.5 + j * 0.25, 0.12, 3000, j);
  if (k === "whooshes5") { const d = beats[i].end - t; for (let j = 0; j < 5; j++) { whoosh(buf, t + j * d / 5 - 0.2, 0.5, 0.2); pop(buf, t + j * d / 5 + 0.05, 0.25); } }
});
shimmer(buf, 0, 6, 0.03);
reverb(buf, 0.18, 1);
writeWav(new URL("./audio/sfx.wav", import.meta.url).pathname, buf);
console.log("sfx ok", entries.filter(Boolean).length, "cues");
