// Character check: painted Wick vs Dre's reference framing, plus king + expressions.
import { drawWickHD, flameLight } from "../../lib2d/wickHD.js";
export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const renderAt = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0b0907"; ctx.fillRect(0, 0, W, H);
    const U = H / 3.2;
    ctx.setTransform(U, 0, 0, U, W * 0.17, H * 0.96);
    drawWickHD(ctx, 0, 0, 1, { t: 1, expr: "happy" });
    ctx.setTransform(U, 0, 0, U, W * 0.45, H * 0.96);
    drawWickHD(ctx, 0, 0, 1, { t: 1, expr: "laugh", king: true, look: 0.4 });
    const ex = ["curious", "alarmed", "proud", "delighted", "determined", "sombre"];
    ex.forEach((n, i) => { ctx.setTransform(U * 0.42, 0, 0, U * 0.42, W * (0.66 + (i % 3) * 0.12), H * (i < 3 ? 0.47 : 0.96)); drawWickHD(ctx, 0, 0, 1, { t: 1, expr: n, look: i === 1 ? -0.5 : 0 }); });
  };
  return { duration: 1, fps: 30, out, renderAt };
}
