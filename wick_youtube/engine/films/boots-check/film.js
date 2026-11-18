// CHECK: Wick in cheap vs good boots (standing, walking, close-up), the guard uniform, Dee's scarf, and the boot/jar/puddle/rain props.
//   node render.mjs --film boots-check --sheet 0.3,0.7,1.1 --cols 3
import { PAL, paper, inkWick, makeStage, mood, pose } from "../../lib2d/ink.js";
import { boot, rain, puddle, jar } from "../../lib2d/props.js";
import { coat, scarf } from "../../lib2d/scene.js";
export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out), bg = paper(W, H, PAL.navy, 11);
  return {
    duration: 2, fps: 30, out,
    renderAt(t) {
      const close = t > 1;
      stage.frame({ bg, cam: close ? { x: 560, y: 860, z: 4 } : { x: 960, y: 540, z: 1 },
        art(c) {
          c.fillStyle = "#2a3244"; c.fillRect(-200, 900, 2400, 400);
          puddle(c, 560, 900, 260, t, { splash: (t * 2) % 1 });
          inkWick(c, 560, 900, 170, { ...mood(t, [[0, "weary"]]), arms: pose(t, [[0, "rest"]]), t, boots: "cheap", split: 0.9, walk: t * 1.7 }); coat(c, 560, 900, 170, "guard");
          inkWick(c, 1000, 900, 170, { ...mood(t, [[0, "calm"]]), arms: pose(t, [[0, "rest"]]), t, boots: "good", seed: 2 }); coat(c, 1000, 900, 170, "guard"); scarf(c, 1000, 900, 170, "#c0392b", 0, t);
          boot(c, 1350, 900, 90, { cheap: true, split: 0.8, crack: 1 }); boot(c, 1550, 900, 90, {});
          jar(c, 1750, 900, 140, { fill: 0.4, label: "BOOTS" });
          rain(c, -200, -100, 2400, 1100, t);
        } }, t);
    },
  };
}
