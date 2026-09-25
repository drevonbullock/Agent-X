// Character check: flat Wick on black, same framing as Dre's reference, plus the expression row.
import { drawWick, EXPRESSIONS } from "../../lib2d/wick2d.js";
export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const renderAt = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    drawWick(ctx, W * 0.2, H * 0.93, H * 0.36, { expr: "happy", t: 1 });
    const names = Object.keys(EXPRESSIONS);
    names.forEach((n, i) => drawWick(ctx, W * (0.42 + (i % 5) * 0.12), H * (i < 5 ? 0.46 : 0.93), H * 0.15, { expr: n, t: 1 }));
  };
  return { duration: 1, fps: 30, out, renderAt };
}
