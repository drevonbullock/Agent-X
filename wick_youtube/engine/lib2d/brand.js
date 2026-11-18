// Channel furniture every episode carries: the watermark (bottom-right, every frame) and the end
// "Subscribe" lower-third (visual only). Same drawing as N01 (films/n01c), shared so new episodes
// don't import from another episode's film.
import { seg, backOut } from "./ease.js";
const TAU = Math.PI * 2;

// call after stage.frame(...) in renderAt: watermark(out, t)
export function watermark(out, t) {
  const g = out.getContext("2d"), k = out.width / 1920;
  g.save(); g.scale(k, k); g.globalAlpha = 0.55; g.font = "900 26px Serif4"; g.textAlign = "right"; g.textBaseline = "alphabetic";
  g.fillStyle = "rgba(0,0,0,0.5)"; g.fillText("Wick's Wisdom", 1882, 1052); g.fillStyle = "#fff6e0"; g.fillText("Wick's Wisdom", 1880, 1050); g.restore();
}
// in the last world's over(c): subscribeCTA(c, t, END - 9) pops the bar in; endFade(c, t, END) fades out
export function subscribeCTA(c, t, t0) {
  const k = backOut(seg(t, t0, t0 + 0.6)); if (k <= 0.01) return;
  c.save(); c.translate(960, 1000); c.scale(k, k);
  c.fillStyle = "rgba(12,14,28,0.72)"; c.beginPath(); c.roundRect(-620, -52, 1240, 104, 52); c.fill();
  c.fillStyle = "#c0392b"; c.beginPath(); c.roundRect(230, -36, 360, 72, 36); c.fill();
  c.font = "700 34px Fira"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = "#fff6e0"; c.fillText("Subscribe for more money stories like this", -590, 2);
  c.font = "900 34px Serif4"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText("SUBSCRIBE", 410, 2);
  c.fillStyle = "#fff6e0"; c.beginPath(); c.arc(265, -2, 14, Math.PI, 0); c.lineTo(279, 10); c.lineTo(251, 10); c.closePath(); c.fill(); c.beginPath(); c.arc(265, 13, 4, 0, TAU); c.fill(); c.restore();
}
export function endFade(c, t, END, dur = 2.2) { const f = seg(t, END - dur, END); if (f > 0) { c.fillStyle = `rgba(8,10,20,${f})`; c.fillRect(0, 0, 1920, 1080); } }
