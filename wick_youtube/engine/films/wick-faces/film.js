// EXPRESSION SHEET: every face Wick has, animated (blinks, flicker, flame emotion).
//   node render.mjs --film wick-faces --stills 1.3        one still of the sheet
//   node render.mjs --film wick-faces                     4 s of it alive
import { PAL, paper, inkWick, FACES, label, makeStage } from "../../lib2d/ink.js";

const NAMES = ["happy", "joy", "calm", "curious", "thinking", "skeptical", "proud", "determined", "wink",
  "starstruck", "money", "alarmed", "shocked", "worried", "grimace", "sad", "weary", "angry"];

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const bg = paper(W, H, PAL.navy, 31);
  const cell = (i) => [165 + (i % 6) * 318, 330 + Math.floor(i / 6) * 330];
  return {
    duration: 4, fps: 30, out,
    renderAt(t) {
      stage.frame({
        bg,
        art(c) { NAMES.forEach((n, i) => { const [x, y] = cell(i); inkWick(c, x, y, 82, { face: n, t, seed: i * 1.3, look: 0.2, glow: 0.8 }); }); },
        text(c) { NAMES.forEach((n, i) => { const [x, y] = cell(i); label(c, n, x, y + 44, 26); }); },
      }, t);
    },
  };
}
