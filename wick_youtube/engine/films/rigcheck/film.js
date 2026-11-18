import { PAL, paper, inkWick, pose, makeStage } from "../../lib2d/ink.js";
export async function create({ W, H, out }) {
  out.width = W; out.height = H; const stage = makeStage(out); const bg = paper(W, H, PAL.navy, 3);
  return { duration: 2, fps: 30, out, renderAt(t) { stage.frame({ bg, art(c) {
    inkWick(c, 500, 900, 260, { face: "proud", crown: true, cape: true, t, arms: pose(t, [[0, "hips"]]) });
    inkWick(c, 1300, 900, 260, { face: "happy", t, walk: t * 1.6, arms: pose(t, [[0, "rest"]]), dy: -0.04 * Math.abs(Math.sin(t * 1.6 * Math.PI * 2)) });
  } }, t); } };
}
