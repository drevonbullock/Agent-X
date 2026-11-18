// MOTION STUDY, silent, ~20 s. The style frames brought to life, with the
// animation grammar of Dalio (draw-ons, hatch-in, one object becomes the next
// scene), PDoomVideo and the Clawd films (moods that never snap, blinks,
// overshoot, the "aha" burst, a camera that never parks, zoom-through montage).
// Choreography times below are in "beats" and play SLOW x slower in the video.
//   0.0–3.0   title card draws itself; camera dives into the grain
//   3.0–7.4   the grain IS the grain on the chessboard; King Wick laughs, then realises
//   7.4–8.2   hatch-in to the green chapter
//   7.4–11.6  the stacks double; camera dives into the tallest one
//   11.6–16.4 zoom-out: the heap of all 64 squares, true scale (7.25 km, next to Everest)
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, kf } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, sweat, sparkle, title, label, kicker, makeStage, chartLine, drawRect, drawRing, burst } from "../../lib2d/ink.js";

const STEEL = "#6f97a8";
const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));   // zooms feel even in log space
const SLOW = 1.25;        // Dre: "a tiny bit" slower than the first cut
let LIVE = 0;             // real seconds: blinks, flicker and line boil run on this, not the choreography

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const navy = paper(W, H, PAL.navy, 11), green = paper(W, H, PAL.green, 23);

  // ================= C: title card (0 → 3.0) =================
  const growth = Array.from({ length: 25 }, (_, i) => [620 + i * 28, 905 - 175 * (Math.pow(2, i / 3.4) - 1) / (Math.pow(2, 24 / 3.4) - 1)]);
  const GRAIN_C = growth[0];
  const card = {
    bg: navy,
    cam: null,
    art(c, t) {
      c.lineJoin = "miter"; c.strokeStyle = STEEL;
      c.lineWidth = 12; drawRect(c, 70, 64, 1780, 952, easeOut(seg(t, 0, 0.9)));
      c.lineWidth = 3; drawRect(c, 94, 88, 1732, 904, easeOut(seg(t, 0.15, 1.05)));
      c.lineWidth = 5; drawRing(c, 960, 238, 70, 70, easeInOut(seg(t, 0.3, 0.9)));
      const wp = backOut(seg(t, 0.55, 0.95));
      if (wp > 0.01) inkWick(c, 960, 298, 36 * wp, { ...mood(t, [[0, "calm"], [1.75, "wink"]]), glow: 0.7, t: LIVE });
      const gp = backOut(seg(t, 1.5, 1.7));
      if (gp > 0.01) {
        c.save(); c.translate(...GRAIN_C); c.scale(gp, gp);
        c.fillStyle = PAL.gold; c.strokeStyle = PAL.ink; c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(0, 0, 9, 6, -0.3, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
      }
      chartLine(c, growth.slice(1).concat([[1328, 700]]), { width: 9, p: easeInOut(seg(t, 1.6, 2.4)) });
    },
    text(c, t) {
      kicker(c, "THE CHESSBOARD THAT", 960, 408, 30, PAL.blue, 0.32, seg(t, 0.9, 1.3));
      title(c, "BANKRUPTED", 960, 540, 132, PAL.paperText, "center", seg(t, 1.05, 1.4));
      title(c, "A KING", 960, 668, 132, PAL.paperText, "center", seg(t, 1.25, 1.6));
    },
    over(c, t) {                                    // the dive ends in a flash of gold
      const a = seg(t, 2.72, 3.0);
      if (a > 0) { c.fillStyle = `rgba(247,178,27,${0.95 * easeIn(a)})`; c.fillRect(0, 0, 1920, 1080); }
    },
  };
  function cardCam(t) {
    if (t < 2.3) return { x: 960, y: 540, z: 1 + 0.03 * smooth(seg(t, 0, 2.3)) };
    const k = easeIn(seg(t, 2.3, 3.0));
    return { x: lerp(960, GRAIN_C[0], smooth(seg(t, 2.3, 2.7))), y: lerp(540, GRAIN_C[1], smooth(seg(t, 2.3, 2.7))), z: zoomLerp(1.03, 18, k) };
  }

  // ================= A: the king's chessboard (3.0 → 7.4) =================
  const F = 900, HC = 3.3, HY = 300, CX = 1250, ZN = 5, DZ = 0.55;
  const P = (u, v) => { const z = ZN + v * DZ; return [CX + (F * (u - 4)) / z, HY + (F * HC) / z]; };
  const quad = (c, u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), d = P(u1, v1), e = P(u0, v1); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
  const [gx, gy] = P(0.5, 0.5);
  const A0 = 3.0;
  const kingMood = [[0, "proud"], [2.35, "joy"], [2.95, "shocked", "!"], [3.75, "worried", "sweat"]];
  const board = {
    bg: navy,
    art(c, T) {
      const t = T - A0;
      // the far corner: it swells when the king realises
      const far = P(8.6, 9.2), swell = 0.55 + 0.9 * smooth(seg(t, 2.6, 3.3)) + 0.06 * Math.sin(T * 2.2);
      c.save(); c.globalCompositeOperation = "screen";
      const glow = c.createRadialGradient(far[0], far[1], 0, far[0], far[1], 620 * (0.8 + 0.4 * swell));
      glow.addColorStop(0, `rgba(255,205,110,${0.5 * swell})`); glow.addColorStop(0.3, `rgba(255,180,80,${0.16 * swell})`); glow.addColorStop(1, "rgba(255,160,60,0)");
      c.fillStyle = glow; c.beginPath(); c.arc(far[0], far[1], 800, 0, Math.PI * 2); c.fill();
      c.restore();

      c.fillStyle = "rgba(0,0,0,0.32)"; c.beginPath(); quad(c, -0.7, -0.9, 8.6, 8.5); c.fill();
      const n0 = P(-0.4, -0.4), n1 = P(8.4, -0.4);
      const front = (k) => { k.moveTo(...n0); k.lineTo(...n1); k.lineTo(n1[0], n1[1] + 34); k.lineTo(n0[0], n0[1] + 34); k.closePath(); };
      c.beginPath(); front(c); c.fillStyle = "#5a3b20"; c.fill();
      hatch(c, front, { gap: 6, width: 1.4, color: "rgba(0,0,0,0.4)", cx: CX, cy: 900, R: 900 });
      c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.fillStyle = "#8a5d33"; c.fill();
      c.save(); c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.clip();
      const r = rng(9); c.beginPath();
      for (let i = 0; i < 26; i++) { const v = -0.4 + r() * 8.8; c.moveTo(...P(-0.4, v)); c.lineTo(...P(8.4, v + (r() - 0.5) * 0.1)); }
      c.lineWidth = 1.2; c.strokeStyle = "rgba(40,20,5,0.35)"; c.stroke(); c.restore();
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
        c.beginPath(); quad(c, u, v, u + 1, v + 1);
        c.fillStyle = (u + v) % 2 ? PAL.squareLight : PAL.squareDark; c.fill();
      }
      hatch(c, (k) => quad(k, 0, 3.5, 8, 8), { gap: 7, width: 1.2, color: "rgba(10,14,30,0.3)", cx: CX, cy: 500, R: 900 });
      hatch(c, (k) => quad(k, 0, 5.5, 8, 8), { angle: 35, gap: 7, width: 1.1, color: "rgba(10,14,30,0.28)", cx: CX, cy: 500, R: 900 });
      c.save(); c.globalCompositeOperation = "screen";
      c.beginPath(); quad(c, 7, 7, 8, 8); c.fillStyle = `rgba(255,200,100,${0.25 * swell})`; c.fill(); c.restore();
      c.beginPath();
      for (let i = 1; i < 8; i++) { c.moveTo(...P(i, 0)); c.lineTo(...P(i, 8)); c.moveTo(...P(0, i)); c.lineTo(...P(8, i)); }
      c.lineWidth = 1.6; c.strokeStyle = "rgba(18,16,21,0.6)"; c.stroke();
      c.lineJoin = "round"; c.strokeStyle = PAL.ink;
      c.beginPath(); quad(c, 0, 0, 8, 8); c.lineWidth = 3; c.stroke();
      c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.lineWidth = 5; c.stroke();
      c.beginPath(); front(c); c.stroke();

      // the grain (same one we dove into), a sparkle that turns, then the ring and leader draw on
      c.save(); c.translate(gx, gy); c.rotate(-0.3);
      c.beginPath(); c.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
      c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke();
      c.beginPath(); c.moveTo(-9, 1); c.quadraticCurveTo(0, -4, 9, 1); c.lineWidth = 1.6; c.strokeStyle = "rgba(120,60,0,0.8)"; c.stroke();
      c.restore();
      sparkle(c, gx + 24, gy - 22, 15 * (0.85 + 0.25 * Math.sin(T * 6)));
      c.strokeStyle = "#f3f7fb"; c.lineWidth = 6;
      drawRing(c, gx, gy, 58, 34, easeInOut(seg(t, 1.9, 2.3)), Math.PI);
      const lp = easeOut(seg(t, 2.2, 2.45));
      if (lp > 0) {
        const ex = gx + lerp(26, 104, lp), ey = gy + lerp(-33, -250, lp);
        c.beginPath(); c.moveTo(gx + 26, gy - 33); c.lineTo(ex, ey);
        c.lineWidth = 8; c.strokeStyle = PAL.ink; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = "#f3f7fb"; c.stroke();
      }

      // King Wick: points, laughs at one tiny grain, then realises (aha burst), then worries
      const m = mood(t, kingMood);
      burst(c, 300, 960 - 232 * 2.1, seg(t, 2.95, 3.9), { r0: 180, r1: 1100 });
      const armR = kf(t, [[1.5, [0.74, -0.62]], [1.85, [1.04, -1.4]], [2.95, [1.04, -1.4]], [3.2, [0.95, -1.7]], [3.75, [0.95, -1.7]], [4.1, [0.55, -1.2]]], backOut);
      const armL = kf(t, [[2.35, [-0.78, -0.66]], [2.5, [-0.62, -1.05]], [2.95, [-0.62, -1.05]], [3.2, [-0.95, -1.7]], [3.75, [-0.95, -1.7]], [4.1, [-0.55, -1.2]]], backOut);
      const hop = t > 2.95 && t < 3.35 ? -0.22 * Math.sin(((t - 2.95) / 0.4) * Math.PI) : 0;
      const laugh = t > 2.35 && t < 2.95 ? 0.05 * Math.abs(Math.sin((t - 2.35) * 16)) : 0;
      inkWick(c, 300, 960, 232, { ...m, crown: true, cape: true, look: t < 2.95 ? 0.9 : t < 3.75 ? 0.3 : 1, armR, armL, t: LIVE, dy: hop,
        sq: m.sq + laugh + 0.015 * Math.sin(LIVE * 2.4), rot: t > 2.35 && t < 2.95 ? -0.04 : 0, crownBob: hop * 0.5 - laugh, crownTilt: m.sq * 0.8 });
    },
    text(c, T) {
      title(c, "1 grain", gx + 112, gy - 262, 62, PAL.paperText, "left", seg(T - A0, 2.4, 2.7));
    },
    over(c, T) {                                   // the gold flash clears
      const a = 1 - seg(T - A0, 0, 0.3);
      if (a > 0) { c.fillStyle = `rgba(247,178,27,${0.95 * easeOut(a)})`; c.fillRect(0, 0, 1920, 1080); }
    },
  };
  function boardCam(T) {
    const t = T - A0;
    if (t < 1.6) { const k = easeOut(seg(t, 0, 1.6)); return { x: lerp(gx, 960, k), y: lerp(gy, 540, k), z: zoomLerp(6, 1, k) }; }
    return { x: 960, y: 540 + 6 * smooth(seg(t, 1.6, 4)), z: 1 + 0.035 * smooth(seg(t, 1.6, 4.4)) + 0.05 * Math.exp(-Math.max(0, t - 2.95) * 5) * (t > 2.95 ? 1 : 0) };
  }

  // ================= B: doubling (6.6 → 10) =================
  const counts = [1, 2, 4, 8, 16, 32, 64], BILL = 8.4, L = 120, D = 58;
  const stackX = (i) => 170 + i * 205, STACK_Y = 860, B0 = 7.4, D0 = 11.6;
  const stackStart = (i) => 0.5 + i * 0.28;
  const topOf = (i) => [stackX(i) + ((L - D) * c30) / 2, STACK_Y - ((L + D) * s30) / 2 - counts[i] * BILL];
  function stack(c, x, y, n, seed) {
    const r = rng(seed);
    let xb = x, yb = y;
    c.fillStyle = "rgba(0,0,0,0.3)";
    c.beginPath(); c.moveTo(x + 14, y + 7); c.lineTo(x + 14 + L * c30, y + 7 - L * s30); c.lineTo(x + 14 + (L - D) * c30, y + 7 - (L + D) * s30); c.lineTo(x + 14 - D * c30, y + 7 - D * s30); c.closePath(); c.fill();
    for (let b = 0; b < n; b++) {
      xb = x + (r() - 0.5) * 7; yb = y - b * BILL + (r() - 0.5) * 1.5;
      const light = r() < 0.3;
      const rx = xb + L * c30, ry = yb - L * s30, lx = xb - D * c30, ly = yb - D * s30;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(xb, yb); c.lineTo(xb, yb - BILL); c.lineTo(lx, ly - BILL); c.closePath();
      c.fillStyle = light ? "#63b05b" : PAL.cashL; c.fill();
      c.beginPath(); c.moveTo(xb, yb); c.lineTo(rx, ry); c.lineTo(rx, ry - BILL); c.lineTo(xb, yb - BILL); c.closePath();
      c.fillStyle = PAL.cashR; c.fill();
      c.save(); c.clip();
      hatch(c, (k) => { k.rect(xb - 5, ry - BILL - 5, L + 10, L); }, { gap: 6, width: 1.1, color: "rgba(0,30,0,0.35)", cx: xb, cy: yb, R: 160 });
      c.restore();
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(xb, yb); c.lineTo(rx, ry);
      c.lineWidth = b === 0 ? 4 : 1.4; c.strokeStyle = b === 0 ? PAL.ink : "rgba(10,40,10,0.75)"; c.stroke();
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, ly - BILL); c.moveTo(rx, ry); c.lineTo(rx, ry - BILL); c.moveTo(xb, yb); c.lineTo(xb, yb - BILL);
      c.lineWidth = 3.5; c.strokeStyle = PAL.ink; c.stroke();
    }
    const ty = yb - BILL, rx = xb + L * c30, ry = ty - L * s30, lx = xb - D * c30, ly = ty - D * s30, bx = rx - D * c30, by = ry - D * s30;
    c.beginPath(); c.moveTo(xb, ty); c.lineTo(rx, ry); c.lineTo(bx, by); c.lineTo(lx, ly); c.closePath();
    c.fillStyle = PAL.cashTop; c.fill(); c.lineWidth = 3.5; c.lineJoin = "round"; c.strokeStyle = PAL.ink; c.stroke();
    const mx = (xb + bx) / 2, my = (ty + by) / 2;
    c.save(); c.translate(mx, my); c.transform(c30, -s30, -c30, -s30, 0, 0);
    c.strokeStyle = "rgba(20,70,20,0.85)"; c.lineWidth = 1.5;
    c.strokeRect(-L / 2 + 9, -D / 2 + 7, L - 18, D - 14);
    c.beginPath(); c.ellipse(0, 0, 13, 15, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
    c.save(); c.font = "700 20px Serif4"; c.textAlign = "center"; c.fillStyle = "rgba(20,70,20,0.9)"; c.fillText("$", mx, my + 7); c.restore();
  }
  const wickMoodB = [[0, "curious"], [1.1, "thinking"], [2.35, "alarmed", "sweat"], [3.05, "starstruck", "spark"]];
  const doubling = {
    bg: green,
    art(c, T) {
      const t = T - B0;
      counts.forEach((n, i) => {
        const k = seg(t, stackStart(i), stackStart(i) + 0.45);
        if (k <= 0) return;
        const shown = Math.max(1, Math.round(n * backOut(k)));      // overshoots by a few bills, settles
        stack(c, stackX(i), STACK_Y, shown, 40 + i);
      });
      const pts = counts.map((_, i) => { const [x, y] = topOf(i); return [x, y - 38]; }).concat([[1500, 96]]);
      chartLine(c, pts, { width: 11, p: seg(t, 0.75, 2.75) });
      const m = mood(t, wickMoodB);
      if (t > 3.05) burst(c, 1700, 905 - 170 * 2.1, seg(t, 3.05, 3.9), { r0: 120, r1: 800, color: "rgba(240,245,225,0.45)" });
      const up = backOut(seg(t, 2.35, 2.6));
      const hop = t > 2.35 && t < 2.75 ? -0.25 * Math.sin(((t - 2.35) / 0.4) * Math.PI) : 0;
      inkWick(c, 1700, 905, 170, { ...m, t: LIVE, seed: 3, look: -1, lean: -0.1, dy: hop, sq: m.sq + 0.015 * Math.sin(T * 2.4 + 1),
        armL: [lerp(-0.74, -0.88, up), lerp(-0.62, -1.64, up)], armR: [lerp(0.74, 0.88, up), lerp(-0.62, -1.64, up)] });
    },
    text(c, T) {
      const t = T - B0;
      counts.forEach((n, i) => label(c, String(n), stackX(i) + 10, STACK_Y + 50, 30, PAL.paperText, "center", seg(t, stackStart(i), stackStart(i) + 0.25)));
      title(c, "Doubling", 330, 190, 80, PAL.paperText, "center", seg(t, 0.2, 0.55));
    },
  };
  const TOP64 = topOf(6);
  doubling.over = (c, T) => {                      // the dive into the tallest stack ends in gold
    const a = seg(T - B0, 3.95, 4.2);
    if (a > 0) { c.fillStyle = `rgba(247,178,27,${0.95 * easeIn(a)})`; c.fillRect(0, 0, 1920, 1080); }
  };
  const doublingCam = (T) => {
    const t = T - B0, k = smooth(seg(t, 0, 3.4));
    const base = { x: 960 + 20 * k, y: 560 - 40 * k, z: 1.0 + 0.05 * k };
    if (t < 3.5) return base;
    const d = easeIn(seg(t, 3.5, 4.2)), m = smooth(seg(t, 3.5, 3.9));
    return { x: lerp(base.x, TOP64[0], m), y: lerp(base.y, TOP64[1], m), z: zoomLerp(base.z, 22, d) };
  };

  // ================= D: the heap of all 64 squares (11.6 → 16.4) =================
  // World units are metres. 2^64 grains ≈ 1.2 trillion tonnes ≈ 1.54e12 m³ of wheat;
  // piled at a 27° slope that is a cone 7,250 m tall, 14,230 m in radius.
  const HEAP_H = 7250, HEAP_R = 14230, EVEREST = 8849;
  const heapH = (t) => zoomLerp(0.22, HEAP_H, smooth(seg(t, 0.25, 3.6)));
  const frameH = (t) => zoomLerp(4.2, 33000, smooth(seg(t, 0.1, 4.3)));
  const stars = Array.from({ length: 160 }, (_, i) => { const r = rng(900 + i); return [r() * 1920, r() * 1080, 0.6 + r() * 1.8]; });
  const heapCam = (T) => {
    const t = T - D0, fh = frameH(t), z = 1080 / fh;
    return { x: lerp(0, 8000, smooth(seg(t, 2.6, 4.4))), y: -fh * 0.3, z };
  };
  const heap = {
    bg: navy,
    art(c, T) {
      const t = T - D0, cam = heapCam(T), z = cam.z, px = (n) => n / z, H = heapH(t), R = H * (HEAP_R / HEAP_H);
      // sky: navy paper near the ground, space as we rise
      const space = smooth(seg(frameH(t), 1500, 25000));
      if (space > 0) {
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
        const W = c.canvas.width, Hh = c.canvas.height, g = c.createLinearGradient(0, 0, 0, Hh);
        g.addColorStop(0, `rgba(4,6,14,${space})`); g.addColorStop(0.75, `rgba(12,18,40,${space * 0.8})`); g.addColorStop(1, "rgba(20,30,60,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, Hh);
        c.fillStyle = `rgba(255,250,235,${space})`;
        for (const [x, y, s] of stars) { c.beginPath(); c.arc(x * W / 1920, y * Hh / 1080 * 0.7, s * W / 1920, 0, Math.PI * 2); c.fill(); }
        c.restore();
      }
      // ground
      c.fillStyle = "#1f2b45"; c.fillRect(-200000, 0, 400000, 200000);
      hatch(c, (k) => k.rect(-200000, 0, 400000, 200000), { gap: px(9), width: px(1.3), color: "rgba(0,0,0,0.35)", cx: cam.x, cy: 0, R: px(2400) });
      // Everest, true height, off to the right (only once the camera is far enough out to see it)
      if (z < 0.15) {
      const ev = (k) => { k.moveTo(14000, 0); k.lineTo(21000, -5200); k.lineTo(23500, -4700); k.lineTo(26000, -EVEREST); k.lineTo(28500, -6400); k.lineTo(31000, -6900); k.lineTo(38000, 0); k.closePath(); };
      c.beginPath(); ev(c); c.fillStyle = "#6c7a92"; c.fill();
      hatch(c, ev, { gap: px(7), width: px(1.2), color: "rgba(20,25,40,0.45)", cx: 30000, cy: -4000, R: 30000 });
      c.beginPath(); c.moveTo(24700, -7000); c.lineTo(26000, -EVEREST); c.lineTo(27400, -7300); c.lineTo(26600, -7600); c.lineTo(25700, -7200); c.lineTo(25100, -7500); c.closePath(); c.fillStyle = "#eef2f6"; c.fill();
      c.beginPath(); ev(c); c.lineWidth = px(3.5); c.lineJoin = "round"; c.strokeStyle = PAL.ink; c.stroke();
      }
      // a castle the heap will swallow
      c.save(); c.translate(120, 0);
      const castle = (k) => { k.rect(-30, -24, 60, 24); k.rect(-38, -40, 14, 40); k.rect(24, -40, 14, 40); k.rect(-10, -34, 20, 10); };
      c.beginPath(); castle(c); c.fillStyle = "#3b4868"; c.fill(); c.lineWidth = px(2.5); c.strokeStyle = PAL.ink; c.stroke();
      c.fillStyle = "#ffd45c"; for (const x of [-20, -5, 10]) c.fillRect(x, -16, 5, 7);
      c.restore();
      // clouds, behind
      const cloud = (x, y, s) => { c.beginPath(); for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.15, 0.75], [-0.9, 0.2, 0.7], [0.4, -0.45, 0.7]]) c.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.62, 0, 0, Math.PI * 2);
        c.fillStyle = "rgba(233,238,230,0.85)"; c.fill(); };
      cloud(-9000, -2600, 900); cloud(6000, -3100, 1200); cloud(19000, -2300, 800);
      // the heap: a 27° cone with a rounded top, grains that become specks as we pull away
      const hp = (k) => { k.moveTo(-R, 0); k.quadraticCurveTo(-R * 0.12, -H * 1.02, 0, -H); k.quadraticCurveTo(R * 0.12, -H * 1.02, R, 0); k.closePath(); };
      c.beginPath(); hp(c); c.fillStyle = PAL.gold; c.fill();
      c.save(); c.beginPath(); hp(c); c.clip();
      const gr = rng(77); c.fillStyle = "#c9820a";
      for (let i = 0; i < 520; i++) {
        const u = gr() * 2 - 1, v = gr() * (1 - Math.abs(u)), gx = u * R, gy = -v * H, sz = Math.max(px(2.2), 0.012);
        c.beginPath(); c.ellipse(gx, gy, sz * 1.5, sz, gr() * 3, 0, Math.PI * 2); c.fill();
      }
      hatch(c, (k) => k.rect(R * 0.05, -H * 1.1, R * 1.2, H * 1.2), { gap: px(7), width: px(1.3), color: "rgba(150,70,0,0.45)", cx: R * 0.5, cy: -H / 2, R: Math.max(R, H) * 2 });
      c.restore();
      c.beginPath(); hp(c); c.lineWidth = px(4); c.lineJoin = "round"; c.strokeStyle = PAL.ink; c.stroke();
      // cloud in front, the heap punches through it
      cloud(-1800, -2200, 1000);
      // Wick at the foot of it, looking up, shrinking out of view
      if (z > 0.6) inkWick(c, -2.2, 0, 0.55, { ...mood(t, [[0, "starstruck"], [1.1, "shocked", "!"]]), t: LIVE, look: 1, seed: 5,
        armL: [-0.9, -1.6], armR: [0.9, -1.6], dy: t > 1.1 && t < 1.45 ? -0.2 * Math.sin(((t - 1.1) / 0.35) * Math.PI) : 0 });
      // ring the summit once it has stopped growing
      c.strokeStyle = "#f3f7fb"; c.lineWidth = px(5);
      drawRing(c, 0, -H, px(70), px(40), easeInOut(seg(t, 3.7, 4.1)));
    },
    text(c, T) {
      const t = T - D0, cam = heapCam(T), px = (n) => n / cam.z;
      title(c, "square 64", px(90), -heapH(t) - px(70), px(56), PAL.paperText, "left", seg(t, 3.95, 4.25));
      label(c, "Everest", 26000, -EVEREST - px(28), px(30), PAL.paperText, "center", seg(t, 3.2, 3.5));
    },
    over(c, T) {
      const a = 1 - seg(T - D0, 0, 0.3);
      if (a > 0) { c.fillStyle = `rgba(247,178,27,${0.95 * easeOut(a)})`; c.fillRect(0, 0, 1920, 1080); }
    },
  };

  return {
    duration: 16.4 * SLOW, fps: 30, out,
    renderAt(t) {
      LIVE = t;
      const c = t / SLOW;
      if (c < A0) stage.frame({ ...card, cam: cardCam(c) }, c, t);
      else if (c < B0) stage.frame({ ...board, cam: boardCam(c) }, c, t);
      else if (c < B0 + 0.8) stage.hatchIn({ ...board, cam: boardCam(c), over: null }, { ...doubling, cam: doublingCam(c) }, seg(c, B0, B0 + 0.8), c, t);
      else if (c < D0) stage.frame({ ...doubling, cam: doublingCam(c) }, c, t);
      else stage.frame({ ...heap, cam: heapCam(c) }, c, t);
    },
  };
}
