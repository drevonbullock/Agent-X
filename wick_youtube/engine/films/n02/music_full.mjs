// N02 score: the tense bed until "but look at the loop", crossfading into the hopeful bed. Two drops for emphasis:
// a beat of silence on "add it all up", and ~1 s of silence before "It's not laziness" (storytelling rule 14).
import fs from "fs";
import { buffer, writeWav, loadSample, ambience, sample, SR } from "../../lib/synth.mjs";
const words = JSON.parse(fs.readFileSync(new URL("./words.json", import.meta.url)));
const cue = (w, after = 0) => (words.find((x) => x.w === w && x.t >= after) || { t: 0 }).t;
const END = 430, TURN = cue("but", cue("spins")), ADD = cue("add", cue("eleven")), ITS = cue("it's", cue("room", cue("ignoring"))), LAZY = cue("laziness", ITS);
const tense = loadSample(new URL("./audio/music_tense.mp3", import.meta.url).pathname), hope = loadSample(new URL("./audio/music_hope.mp3", import.meta.url).pathname);
const b = buffer(END + 1);
ambience(b, 0, TURN + 3, tense, 1.0, 4);                      // tense, looped with 4 s crossfades, fading out across the turn
sample(b, TURN - 0.5, hope, 1.0, { alignPeak: false, fadeIn: 3.0, fadeOut: 3.0 });
// gain envelope: fade in at the very start, the two drops, and the hope bed's tail out to the end
const env = (t) => {
  let g = Math.min(1, t / 2);
  if (t > ADD - 0.1 && t < ADD + 2.2) g *= t < ADD + 0.9 ? Math.max(0, 1 - (t - (ADD - 0.1)) / 0.15) : Math.min(0.75, (t - (ADD + 0.9)) / 1.3 * 0.75);
  else if (t > ADD + 2.2 && t < ITS - 1.4) g *= 0.75;
  if (t > ITS - 1.4 && t < LAZY + 2.2) g *= t < ITS - 0.4 ? Math.max(0, 1 - (t - (ITS - 1.4))) * 0.75 : t < LAZY + 0.6 ? 0 : Math.min(1, (t - (LAZY + 0.6)) / 1.6);
  if (t > TURN - 3 && t < TURN) g *= 1 - (TURN - t) / 3 * 0;   // (crossfade handled by the two layers)
  if (t > END - 6) g *= Math.max(0, (END - t) / 6);
  return g;
};
for (let i = 0; i < b[0].length; i++) { const g = env(i / SR); b[0][i] *= g; b[1][i] *= g; }
writeWav(new URL("./music_full.wav", import.meta.url).pathname, b);
console.log("music_full ok | turn", TURN.toFixed(1), "| add", ADD.toFixed(1), "| it's", ITS.toFixed(1));
