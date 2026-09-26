// CHECK: the shared channel furniture (lib2d/brand.js) on a navy card: watermark + subscribe bar + end fade.
//   node render.mjs --film brand-check --stills 2,5.5
import { PAL, paper, inkWick, makeStage } from "../../lib2d/ink.js";
import { watermark, subscribeCTA, endFade } from "../../lib2d/brand.js";
export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out), bg = paper(W, H, PAL.navy, 11), END = 6;
  return {
    duration: END, fps: 30, out,
    renderAt(t) {
      stage.frame({ bg, art(c) { inkWick(c, 960, 900, 190, { face: "happy", t }); }, over(c) { subscribeCTA(c, t, 1); endFade(c, t, END); } }, t);
      watermark(out, t);
    },
  };
}
