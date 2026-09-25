// KING-30 (Higgsfield stills edition). The eight shots are Higgsfield images
// generated with the locked Wick element (5e934732…) + the style block; code
// does everything else: camera moves, transitions, bubble, counters,
// sparkles, falling grain, captions, title. Audio = films/king-30/mix.wav.
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, pop, rng } from "../../lib2d/ease.js";

export const DURATION = 30.5;
const T = { reward: 9.15, gold: 11.45, land: 11.9, palace: 12.35, grain: 15.2, sq: [16.3, 18.3, 19.7],
  double: 21.8, noIdea: 25.9, title: 29.25, fade: [30.05, 30.5] };
// each shot: image, time span, camera move {s0,s1 scale; x0,x1,y0,y1 focus 0..1}
const SHOTS = [
  { img: 1, t0: 0, t1: 5.9, s0: 1.0, s1: 1.12, x0: 0.45, x1: 0.56, y0: 0.5, y1: 0.46 },
  { img: 2, t0: 5.9, t1: 10.95, s0: 1.04, s1: 1.2, x0: 0.5, x1: 0.5, y0: 0.5, y1: 0.42 },
  { img: 3, t0: 10.95, t1: 13.25, s0: 1.16, s1: 1.16, x0: 0.36, x1: 0.62, y0: 0.52, y1: 0.52 },
  { img: 4, t0: 13.25, t1: 15.95, s0: 1.0, s1: 1.1, x0: 0.5, x1: 0.56, y0: 0.45, y1: 0.42 },
  { img: 5, t0: 15.95, t1: 21.8, s0: 1.0, s1: 1.16, x0: 0.5, x1: 0.46, y0: 0.5, y1: 0.55 },
  { img: 6, t0: 21.8, t1: 22.75, s0: 1.2, s1: 1.02, x0: 0.5, x1: 0.5, y0: 0.5, y1: 0.5 },
  { img: 7, t0: 22.75, t1: 25.55, s0: 1.08, s1: 1.14, x0: 0.55, x1: 0.58, y0: 0.48, y1: 0.46, shake: true },
  { img: 8, t0: 25.55, t1: 99, s0: 1.28, s1: 1.04, x0: 0.55, x1: 0.5, y0: 0.45, y1: 0.5 },
];
const XF = 0.35; // crossfade length

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const S = W / 1920;
  const imgs = {};
  await Promise.all(SHOTS.map(async (s) => {
    const im = new Image(); im.src = `films/king-30-hf/img/${s.img}.png`; await im.decode(); imgs[s.img] = im;
  }));
  const noise = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const id = g.createImageData(256, 256); const r = rng(5); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; })();

  function drawShot(s, t, alpha) {
    const im = imgs[s.img], k = easeInOut(seg(t, s.t0, Math.min(s.t1, 30.5)));
    let sc = lerp(s.s0, s.s1, k), fx = lerp(s.x0, s.x1, k), fy = lerp(s.y0, s.y1, k);
    if (s.shake) { sc += 0.008 * Math.abs(Math.sin(t * 9)); fy += 0.004 * Math.sin(t * 9); }
    const base = Math.max(W / im.width, H / im.height) * sc;
    const w = im.width * base, h = im.height * base;
    const x = clamp(W / 2 - fx * w, W - w, 0), y = clamp(H / 2 - fy * h, H - h, 0);
    ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, h); ctx.globalAlpha = 1;
  }
  function sparkle(x, y, r, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2); g.addColorStop(0, "rgba(255,230,150,0.9)"); g.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff7d6"; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
    ctx.restore();
  }
  function textPop(text, t, t0, t1, x, y, size, fill = "#fff4dc", stroke = null, font = "700 {s}px Fredoka") {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.2) * (1 - seg(t, t1 - 0.3, t1)), s = lerp(0.8, 1, pop(seg(t, t0, t0 + 0.45)));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.font = font.replace("{s}", String(size * S)); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 18 * S; ctx.shadowOffsetY = 4 * S;
    if (stroke) { ctx.lineWidth = size * S * 0.16; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0); }
    ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function bubble(t) {
    const t0 = T.reward + 0.05, t1 = 10.9; if (t < t0 || t > t1) return;
    const k = pop(seg(t, t0, t0 + 0.4)) * (1 - seg(t, t1 - 0.25, t1));
    ctx.save(); ctx.translate(W * 0.25, H * 0.2); ctx.scale(k * 1.5 * S, k * 1.5 * S); ctx.rotate(-0.04);
    ctx.font = "44px Marker"; const text = "Name your reward!", tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(-tw / 2 - 26 + 6, -44 + 8, tw + 52, 84, 38); ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.roundRect(-tw / 2 - 26, -44, tw + 52, 84, 38); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tw / 2 - 30, 30); ctx.lineTo(tw / 2 + 40, 85); ctx.lineTo(tw / 2 - 70, 38); ctx.fill();
    ctx.fillStyle = "#2a1c10"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 0, 2);
    ctx.restore();
  }
  function fallingGrain(t) {
    if (t < 25.6) return;
    const r = rng(9), k = seg(t, 25.6, 26.4);
    for (let i = 0; i < 90; i++) {
      const x = r() * W, sp = 280 + r() * 380, ph = r() * H, sz = (5 + r() * 7) * S, rot = r() * 6;
      const y = ((t * sp + ph) % (H + 100)) - 50;
      ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.translate(x, y); ctx.rotate(rot + t * 3);
      ctx.fillStyle = "#f2bd4c"; ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(-sz * 0.3, -sz * 0.2, sz * 0.3, sz * 0.12, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  function counter(t) {
    // 1 → 2 → 4 builds along the bottom while the grains are placed
    const items = [["1", T.sq[0] + 0.3], ["2", T.sq[1] + 0.3], ["4", T.sq[2] + 0.3]];
    items.forEach(([n, t0], i) => {
      textPop(n, t, t0, T.double - 0.05, W / 2 + (i - 1) * 190 * S, H * 0.85, 110, "#ffd35a", "#3a2106");
      if (i > 0) textPop("→", t, t0 - 0.05, T.double - 0.05, W / 2 + (i - 1.5) * 190 * S, H * 0.85, 60, "#fff4dc");
    });
  }

  function renderAt(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const i = SHOTS.findIndex((s) => t >= s.t0 && t < s.t1);
    const cur = SHOTS[i < 0 ? SHOTS.length - 1 : i];
    drawShot(cur, t, 1);
    const next = SHOTS[(i < 0 ? SHOTS.length : i) + 1];
    if (next && t > next.t0 - XF) drawShot(next, t, easeInOut(seg(t, next.t0 - XF, next.t0)));
    // story accents
    if (t > T.gold - 0.1 && t < 13.25) [[T.gold, 0.47, 0.6], [T.land, 0.52, 0.72], [T.palace, 0.6, 0.55]].forEach(([t0, x, y], k) => sparkle(W * x, H * y, 26 * S, pop(seg(t, t0, t0 + 0.3)) * (1 - seg(t, t0 + 0.6, t0 + 1.0))));
    if (t > T.grain - 0.1 && t < 15.95) sparkle(W * 0.6, H * 0.4, 30 * S * (0.7 + 0.3 * Math.sin(t * 9)), seg(t, T.grain - 0.1, T.grain + 0.2));
    bubble(t);
    counter(t);
    textPop("× 2 on every square", t, T.double + 0.05, 22.75, W / 2, H * 0.87, 64);
    fallingGrain(t);
    textPop("By square 64...", t, T.noIdea + 0.4, 27.6, W / 2, H * 0.11, 60);
    textPop("~1,000 years of the world's wheat", t, 27.7, T.title - 0.05, W / 2, H * 0.11, 60);
    // chapter tag
    if (t > 0.5 && t < 4.0) {
      const a = seg(t, 0.5, 0.9) * (1 - seg(t, 3.6, 4.0));
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f0a31c"; ctx.fillRect(70 * S, 78 * S, 8 * S, 46 * S);
      ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 10 * S;
      ctx.fillText("THE INVENTOR'S PRICE", 92 * S, 102 * S); ctx.restore();
    }
    // title
    if (t > T.title) {
      const k = easeOut(seg(t, T.title, T.title + 0.6));
      const g = ctx.createLinearGradient(0, H * 0.4, 0, H); g.addColorStop(0, "rgba(8,5,3,0)"); g.addColorStop(1, `rgba(8,5,3,${0.85 * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      textPop("WICK'S WISDOM", t, T.title, 40, W / 2, H * 0.73, 30, "#f0a31c");
      textPop("The Chessboard That Bankrupted a King", t, T.title, 40, W / 2, H * 0.82, 72);
    }
    // grain + vignette
    ctx.save(); ctx.globalAlpha = 0.04; ctx.globalCompositeOperation = "overlay"; ctx.translate((t * 97) % 256, (t * 61) % 256);
    ctx.fillStyle = ctx.createPattern(noise, "repeat"); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const f = Math.max(1 - seg(t, 0, 0.5), seg(t, ...T.fade));
    if (f > 0) { ctx.globalAlpha = f; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  return { duration: DURATION, fps: 30, out, renderAt };
}
