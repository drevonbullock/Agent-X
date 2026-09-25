// MOTION STUDY, silent, 10 s. The three style frames brought to life, with the
// animation grammar borrowed from Dalio (draw-ons, hatch-in, one object becomes
// the next scene) and from PDoomVideo (moods that never snap, blinks, overshoot,
// a camera that never parks).
//   0.0–3.0  title card draws itself; camera dives into the grain
//   3.0–6.6  the grain IS the grain on the chessboard; pull back to King Wick
//   6.6–7.4  hatch-in to the green chapter
//   6.6–10   the stacks double, the blue line rides their tops
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, kf } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, sweat, sparkle, title, label, kicker, makeStage, chartLine, drawRect, drawRing } from "../../lib2d/ink.js";

const STEEL = "#6f97a8";
const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));   // zooms feel even in log space

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
      if (wp > 0.01) inkWick(c, 960, 298, 36 * wp, { face: "calm", glow: 0.7, t });
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
  const kingMood = [[0, "proud"], [2.95, "alarmed", "!"]];
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

      // King Wick: idles, raises his arm to point, then realises
      const m = mood(t, kingMood);
      const armR = kf(t, [[1.5, [0.74, -0.62]], [1.85, [1.04, -1.4]]], backOut);
      const armL = kf(t, [[2.95, [-0.78, -0.66]], [3.2, [-0.85, -1.55]]], backOut);
      const hop = t > 2.95 && t < 3.35 ? -0.22 * Math.sin(((t - 2.95) / 0.4) * Math.PI) : 0;
      inkWick(c, 300, 960, 232, { ...m, crown: true, cape: true, look: t < 2.95 ? 0.9 : 0.6, armR, armL, t: T, dy: hop,
        sq: m.sq + 0.015 * Math.sin(T * 2.4), crownBob: hop * 0.5, crownTilt: m.sq * 0.8 });
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
    return { x: 960, y: 540 + 6 * smooth(seg(t, 1.6, 4)), z: 1 + 0.035 * smooth(seg(t, 1.6, 4.4)) };
  }

  // ================= B: doubling (6.6 → 10) =================
  const counts = [1, 2, 4, 8, 16, 32, 64], BILL = 8.4, L = 120, D = 58;
  const stackX = (i) => 170 + i * 205, STACK_Y = 860, B0 = 6.6;
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
  const wickMoodB = [[0, "curious"], [2.35, "alarmed", "sweat"]];
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
      const up = backOut(seg(t, 2.35, 2.6));
      const hop = t > 2.35 && t < 2.75 ? -0.25 * Math.sin(((t - 2.35) / 0.4) * Math.PI) : 0;
      inkWick(c, 1700, 905, 170, { ...m, t: T, seed: 3, look: -1, lean: -0.1, dy: hop, sq: m.sq + 0.015 * Math.sin(T * 2.4 + 1),
        armL: [lerp(-0.74, -0.88, up), lerp(-0.62, -1.64, up)], armR: [lerp(0.74, 0.88, up), lerp(-0.62, -1.64, up)] });
    },
    text(c, T) {
      const t = T - B0;
      counts.forEach((n, i) => label(c, String(n), stackX(i) + 10, STACK_Y + 50, 30, PAL.paperText, "center", seg(t, stackStart(i), stackStart(i) + 0.25)));
      title(c, "Doubling", 330, 190, 80, PAL.paperText, "center", seg(t, 0.2, 0.55));
    },
  };
  const doublingCam = (T) => { const k = smooth(seg(T - B0, 0, 3.4)); return { x: 960 + 20 * k, y: 560 - 40 * k, z: 1.0 + 0.05 * k }; };

  return {
    duration: 10, fps: 30, out,
    renderAt(t) {
      if (t < A0) stage.frame({ ...card, cam: cardCam(t) }, t);
      else if (t < B0) stage.frame({ ...board, cam: boardCam(t) }, t);
      else if (t < 7.4) stage.hatchIn({ ...board, cam: boardCam(t), over: null }, { ...doubling, cam: doublingCam(t) }, seg(t, B0, 7.4), t);
      else stage.frame({ ...doubling, cam: doublingCam(t) }, t);
    },
  };
}
