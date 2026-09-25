// MONTAGE TEST, silent, ~17 s: the Clawd-film zoom-through, in Wick's world.
// One idea shown three ways: compounding is the same curve as a spiral galaxy's
// arms and a sunflower's seeds. The same 1,100 particles travel the whole way:
//   0.0–2.2   Wick studies one grain (hand on chin → reach → aha burst); dive in
//   2.2–5.2   the grain is a spiral galaxy, blooming out of its core
//   5.2–8.0   the stars swirl into a sunflower's seed spiral; petals pop
//   8.0–10.4  the seeds lift off as a murmuration of birds at sunset
//  10.4–13.6  the flock settles into the compounding curve; pull back to Wick waving
// Choreography times; plays SLOW x slower. Frames are pure functions of t.
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, inkWick, mood, pose, sparkle, title, makeStage, chartLine, burst } from "../../lib2d/ink.js";

const SLOW = 1.25, N = 1100, GOLDEN = Math.PI * (3 - Math.sqrt(5));
const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(",")})`; };
let LIVE = 0;

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const navy = paper(W, H, PAL.navy, 11);

  // ---- every particle's identity, decided once ----
  const r = rng(2026), P = [];
  for (let i = 0; i < N; i++) {
    const halo = r() < 0.18, arm = r() < 0.5 ? 0 : Math.PI;
    const u = Math.pow(r(), halo ? 0.6 : 0.9);
    P.push({
      halo, arm, gr: 26 + 420 * u, gj: (r() - 0.5) * (halo ? 6.3 : 0.55), gsz: 1.3 + r() * 2.6,
      gcol: u < 0.12 ? "#fff3c4" : ["#ffc75a", "#7cc6f2", "#f28bb5", "#ffe08a"][Math.floor(r() * 4)],
      fu: r() * 2 - 1, fv: r() * 2 - 1, fph: r() * 6.28,
      cs: r(), cj: (r() - 0.5) * 18,
      d: r(),                                         // stagger for every morph
    });
  }
  // inner stars become inner seeds: rank by galaxy radius
  [...P.keys()].sort((a, b) => P[a].gr - P[b].gr).forEach((idx, n) => (P[idx].n = n + 1));

  const galaxy = (p, t) => {
    const bloom = easeOut(seg(t, 2.2, 3.1)), rr = p.gr * bloom;
    const w = 0.55 / (0.4 + p.gr / 280);
    const th = p.halo ? p.gj + w * t : p.arm + Math.log(p.gr / 26) / 0.3 + p.gj + w * t;
    const x = rr * Math.cos(th), y = rr * Math.sin(th) * 0.6, a = -0.28;
    return [960 + x * Math.cos(a) - y * Math.sin(a), 540 + x * Math.sin(a) + y * Math.cos(a)];
  };
  const SUN_C = 10.2;
  const sunflower = (p, t) => { const r = SUN_C * Math.sqrt(p.n), th = p.n * GOLDEN + t * 0.06; return [960 + r * Math.cos(th), 540 + r * Math.sin(th)]; };
  const flock = (p, t) => {
    const cx = 960 + 360 * Math.sin(0.55 * t), cy = 470 + 80 * Math.sin(0.9 * t + 1), rot = 0.25 * Math.sin(0.5 * t);
    const u = p.fu * Math.sqrt(1 - p.fv * p.fv * 0.5), v = p.fv;
    const x = u * 390 * (1 + 0.35 * Math.sin(0.8 * t)) + 60 * Math.sin(2.2 * v + 1.3 * t + p.fph * 0.2);
    const y = v * 130 * (1 + 0.3 * Math.cos(0.7 * t)) + 42 * Math.sin(2.7 * u + 1.1 * t);
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  };
  const CURVE = (s) => [250 + 1380 * s, 880 - 640 * (Math.pow(2, s * 6) - 1) / 63];
  const curve = (p) => { const [x, y] = CURVE(p.cs); return [x + p.cj * 0.5, y + p.cj * 0.5]; };
  const morph = (a, b, t, t0, dur, spread, p) => { const k = easeInOut(clamp((t - t0 - p.d * spread) / dur)); return [k, [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]]; };

  const seedCol = (p) => (p.n < 90 ? "#9bb83e" : p.n < 330 ? "#6b4a16" : "#2e1807");
  function particle(p, t) {
    if (t < 5.2) return { xy: galaxy(p, t), col: p.gcol, sz: p.gsz, glow: 1, bird: 0 };
    if (t < 8.0) { const [k, xy] = morph(galaxy(p, t), sunflower(p, t), t, 5.2, 0.9, 0.55, p); return { xy, col: mixHex(p.gcol, seedCol(p), k), sz: lerp(p.gsz, 4.2, k), glow: 1 - k, bird: 0, seed: k }; }
    if (t < 10.4) { const [k, xy] = morph(sunflower(p, t), flock(p, t), t, 8.0, 0.8, 0.45, p); return { xy, col: mixHex(seedCol(p), "#2a1d2e", k), sz: 4.2 - k * 1.2, glow: 0, bird: k, seed: 1 - k }; }
    const [k, xy] = morph(flock(p, t), curve(p), t, 10.4, 0.8, 0.4, p);
    return { xy, col: mixHex("#2a1d2e", PAL.blue, k), sz: lerp(3, 3.4, k), glow: 0, bird: 1 - k, fade: 1 - smooth(seg(t, 11.9, 12.5)) };
  }

  // ---- backgrounds: each world has its own sky, crossfaded ----
  const stars = Array.from({ length: 170 }, (_, i) => { const q = rng(500 + i); return [q() * 1920, q() * 1080, 0.5 + q() * 1.8, q() * 6]; });
  function sky(c, t) {
    const wSpace = seg(t, 2.1, 2.3) * (1 - seg(t, 5.3, 6.2)), wPeach = seg(t, 5.3, 6.2) * (1 - seg(t, 8.0, 9.0)), wSun = seg(t, 8.0, 9.0) * (1 - seg(t, 10.5, 11.4));
    const full = (w, stopsFn) => { if (w <= 0) return; c.save(); c.globalAlpha = w; c.fillStyle = stopsFn(); c.fillRect(-400, -400, 2720, 1880); c.restore(); };
    full(wSpace, () => { const g = c.createRadialGradient(960, 540, 60, 960, 540, 1100); g.addColorStop(0, "#2a1f5e"); g.addColorStop(0.5, "#141638"); g.addColorStop(1, "#07081a"); return g; });
    full(wPeach, () => { const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, "#f7d2a6"); g.addColorStop(1, "#ef9f7e"); return g; });
    full(wSun, () => { const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, "#5a3f8f"); g.addColorStop(0.55, "#c46f8f"); g.addColorStop(1, "#f3a57c"); return g; });
    if (wSpace > 0) {
      c.save(); c.globalAlpha = wSpace;
      for (const [x, y, s, ph] of stars) { c.fillStyle = `rgba(255,248,230,${0.35 + 0.65 * (0.5 + 0.5 * Math.sin(LIVE * 2 + ph))})`; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    return { wSpace, wPeach, wSun };
  }

  // ---- the galaxy's dressing: core, dust, sketched orbits ----
  function galaxyDressing(c, t, w) {
    if (w <= 0) return;
    const bloom = easeOut(seg(t, 2.2, 3.1));
    c.save(); c.globalAlpha = w; c.globalCompositeOperation = "screen";
    const core = c.createRadialGradient(960, 540, 0, 960, 540, 190 * (0.4 + 0.6 * bloom));
    core.addColorStop(0, "rgba(255,244,210,0.95)"); core.addColorStop(0.3, "rgba(255,200,110,0.5)"); core.addColorStop(1, "rgba(255,160,80,0)");
    c.fillStyle = core; c.beginPath(); c.arc(960, 540, 200, 0, Math.PI * 2); c.fill();
    const q = rng(33);
    for (let i = 0; i < 6; i++) {
      const a = q() * 6.28 + t * 0.12, rr = 120 + q() * 260, x = 960 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr * 0.6;
      const g = c.createRadialGradient(x, y, 0, x, y, 140 + q() * 120);
      g.addColorStop(0, q() < 0.5 ? "rgba(242,139,181,0.16)" : "rgba(80,200,210,0.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 260, 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = "source-over";
    c.strokeStyle = "rgba(190,205,255,0.28)";
    for (const [rx, lw, sp] of [[250, 1.4, 0.18], [390, 1.1, -0.1], [520, 0.9, 0.06]]) {
      c.beginPath(); c.ellipse(960, 540, rx * bloom, rx * 0.6 * bloom, -0.28, t * sp, t * sp + Math.PI * 1.6); c.lineWidth = lw; c.stroke();
    }
    c.restore();
  }

  // ---- sunflower petals + disk ----
  function petals(c, t) {
    const R = SUN_C * Math.sqrt(N) + 6, grow = seg(t, 6.1, 6.2), leave = smooth(seg(t, 8.0, 8.7));
    if (grow <= 0 || leave >= 1) return;
    c.save(); c.globalAlpha = 1 - leave;
    for (const [ring, n, L, off, col] of [[0, 34, 150, 0, "#e9a114"], [1, 34, 128, Math.PI / 34, PAL.gold]]) {
      for (let j = 0; j < n; j++) {
        const k = backOut(seg(t, 6.1 + j * 0.013 + ring * 0.08, 6.45 + j * 0.013 + ring * 0.08)) * (1 - leave * 0.4);
        if (k <= 0) continue;
        const a = off + (j / n) * Math.PI * 2 + t * 0.06 + leave * (j % 2 ? 0.6 : -0.6), l = L * k;
        c.save(); c.translate(960 + Math.cos(a) * (R - 10), 540 + Math.sin(a) * (R - 10)); c.rotate(a);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.45, -20, l, 0); c.quadraticCurveTo(l * 0.45, 20, 0, 0);
        c.fillStyle = col; c.fill(); c.lineWidth = 2.4; c.strokeStyle = PAL.ink; c.stroke();
        c.beginPath(); c.moveTo(8, 0); c.lineTo(l * 0.8, 0); c.lineWidth = 1.2; c.strokeStyle = "rgba(150,80,0,0.6)"; c.stroke();
        c.restore();
      }
    }
    c.restore();
    const disk = seg(t, 5.8, 6.3) * (1 - leave);
    return disk;
  }

  // ---- the frame ----
  const GRAIN = [1080, 880];
  const scene = {
    bg: navy,
    art(c, t) {
      const { wSpace } = sky(c, t);
      // intro: Wick studies a single grain
      if (t < 2.3) {
        c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(GRAIN[0] + 4, GRAIN[1] + 8, 22, 5, 0, 0, Math.PI * 2); c.fill();
        c.save(); c.translate(...GRAIN); c.rotate(-0.25);
        c.beginPath(); c.ellipse(0, 0, 17, 10, 0, 0, Math.PI * 2); c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke();
        c.beginPath(); c.moveTo(-10, 1); c.quadraticCurveTo(0, -4, 10, 1); c.lineWidth = 1.6; c.strokeStyle = "rgba(120,60,0,0.8)"; c.stroke();
        c.restore();
        sparkle(c, GRAIN[0] + 26, GRAIN[1] - 24, 14 * (0.8 + 0.3 * Math.sin(LIVE * 6)));
        burst(c, GRAIN[0], GRAIN[1] - 10, seg(t, 1.3, 2.1), { r0: 40, r1: 900, color: "rgba(255,236,190,0.55)" });
        const m = mood(t, [[0, "thinking"], [0.8, "curious"], [1.3, "starstruck", "spark"]]);
        inkWick(c, 760, 910, 190, { ...m, arms: pose(t, [[0, "chin"], [0.8, "reach"], [1.3, "cheer"]]), t: LIVE, look: 1,
          rot: t > 0.8 && t < 1.3 ? 0.07 * smooth(seg(t, 0.8, 1.0)) : 0, dy: t > 1.3 && t < 1.65 ? -0.2 * Math.sin(((t - 1.3) / 0.35) * Math.PI) : 0 });
      }
      // the particle journey
      if (t >= 2.2) {
        galaxyDressing(c, t, wSpace);
        const disk = petals(c, t);
        if (disk > 0) { c.save(); c.globalAlpha = disk; c.beginPath(); c.arc(960, 540, SUN_C * Math.sqrt(N) + 8, 0, Math.PI * 2); const dg = c.createRadialGradient(960, 540, 0, 960, 540, SUN_C * Math.sqrt(N) + 8);
          dg.addColorStop(0, "#c9b24a"); dg.addColorStop(0.3, "#a0782a"); dg.addColorStop(1, "#7a4e1a");
          c.fillStyle = dg; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.restore(); }
        for (const p of P) {
          const q = particle(p, t), [x, y] = q.xy;
          if ((q.fade ?? 1) <= 0.01) continue;
          c.globalAlpha = q.fade ?? 1;
          if (q.bird > 0.3) {                            // a bird: a short stroke along its heading
            const [x2, y2] = flock(p, t + 0.03), a = Math.atan2(y2 - y, x2 - x), L = 7 * q.bird;
            c.beginPath(); c.moveTo(x - Math.cos(a) * L, y - Math.sin(a) * L); c.lineTo(x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.4);
            c.lineWidth = 2.2; c.lineCap = "round"; c.strokeStyle = q.col; c.stroke();
          } else if (q.seed > 0.5) {
            const a = Math.atan2(y - 540, x - 960);
            c.beginPath(); c.ellipse(x, y, q.sz * 1.3, q.sz * 0.85, a, 0, Math.PI * 2); c.fillStyle = q.col; c.fill();
          } else {
            if (q.glow > 0.2) { c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.18 * q.glow; c.beginPath(); c.arc(x, y, q.sz * 3, 0, Math.PI * 2); c.fillStyle = q.col; c.fill(); c.globalAlpha = q.fade ?? 1; c.globalCompositeOperation = "source-over"; }
            c.beginPath(); c.arc(x, y, q.sz, 0, Math.PI * 2); c.fillStyle = q.col; c.fill();
          }
        }
        c.globalAlpha = 1;
        // the flock lands as the curve, and the curve draws itself solid
        const pts = Array.from({ length: 30 }, (_, i) => CURVE(i / 29));
        chartLine(c, pts, { width: 12, p: easeInOut(seg(t, 11.2, 12.1)) });
        if (t > 11.4) {
          const m = mood(t, [[0, "happy"], [12.3, "joy"]]);
          inkWick(c, 1790, 965, 150, { ...m, arms: pose(t, [[0, "present"], [12.3, "wave"]]), t: LIVE, look: -1, flip: true, seed: 2 });
        }
      }
    },
    text(c, t) { title(c, "Compounding", 520, 210, 86, PAL.paperText, "center", seg(t, 12.1, 12.45)); },
    over(c, t) {
      const a = seg(t, 1.95, 2.2) * (1 - seg(t, 2.2, 2.55));
      if (a > 0) { c.fillStyle = `rgba(255,214,120,${0.95 * a})`; c.fillRect(0, 0, 1920, 1080); }
    },
  };
  const cam = (t) => {
    if (t < 1.5) return { x: 960, y: 540, z: 1 + 0.03 * t };
    if (t < 2.2) { const k = easeIn(seg(t, 1.5, 2.2)); return { x: lerp(960, GRAIN[0], smooth(seg(t, 1.5, 1.9))), y: lerp(540, GRAIN[1], smooth(seg(t, 1.5, 1.9))), z: zoomLerp(1.045, 40, k) }; }
    if (t < 5.2) { const k = easeOut(seg(t, 2.2, 3.4)); return { x: 960, y: 540, z: zoomLerp(2.6, 1.0, k) + 0.04 * seg(t, 3.4, 5.2), r: 0.05 * Math.sin(t * 0.4) }; }
    if (t < 8.0) return { x: 960, y: 540, z: 0.98 + 0.05 * smooth(seg(t, 5.2, 8.0)), r: -0.03 * smooth(seg(t, 5.2, 8.0)) };
    if (t < 10.4) return { x: 960, y: 540, z: 1.03 - 0.03 * smooth(seg(t, 8.0, 9.0)) };
    const k = smooth(seg(t, 11.6, 12.9));
    return { x: lerp(900, 960, k), y: lerp(560, 540, k), z: lerp(1.28, 1.0, k) };
  };

  return {
    duration: 13.6 * SLOW, fps: 30, out,
    renderAt(t) { LIVE = t; const c = t / SLOW; stage.frame({ ...scene, cam: cam(c) }, c, t); },
  };
}
