// POSE SHEET: Wick's body language, alive (sway, wave, scratch, talk bob).
//   node render.mjs --film wick-poses --stills 1.2      node render.mjs --film wick-poses
import { PAL, paper, inkWick, POSES, pose, label, makeStage } from "../../lib2d/ink.js";

const SHOW = [["rest", "calm"], ["hips", "proud"], ["crossed", "skeptical"], ["chin", "thinking"], ["shrug", "worried"], ["wave", "joy"],
  ["present", "happy"], ["point", "determined"], ["cheer", "starstruck"], ["scratch", "curious"], ["reach", "money"]];

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const bg = paper(W, H, PAL.green, 41);
  const cell = (i) => [170 + (i % 6) * 316, 450 + Math.floor(i / 6) * 440];
  return {
    duration: 4, fps: 30, out,
    renderAt(t) {
      stage.frame({
        bg,
        art(c) { SHOW.forEach(([p, f], i) => { const [x, y] = cell(i); inkWick(c, x, y, 100, { face: f, arms: pose(t, [[0, p]]), t, seed: i * 1.7, glow: 0.8 }); }); },
        text(c) { SHOW.forEach(([p], i) => { const [x, y] = cell(i); label(c, p, x, y + 48, 28); }); },
      }, t);
    },
  };
}
