// MONTAGE TEST v2, silent, ~21 s: the Clawd-film zoom-through, in Wick's world.
// One idea, many worlds: compounding is the same spiral as a galaxy's arms, a
// nautilus's chambers and a sunflower's seeds. 1,100 particles travel through it.
//   0.0–2.2   Wick studies one grain (chin → reach → aha burst + shake); dive in
//   2.2–4.6   a spiral galaxy blooms out of its core, tilting in 3D
//   4.6–5.2   the stars are sucked into the core, which flares
//   5.2–8.2   a nautilus grows chamber after chamber, forever (infinite zoom)
//   8.2–11.2  an iris opens on a sunflower; the seeds bloom from the centre
//  11.2–13.6  the seeds lift off as a murmuration over a sunset
//  13.6–16.8  a Dalio grid draws on; the flock lands as the compounding curve; Wick
// Choreography times; plays SLOW x slower. Frames are pure functions of t.
import { rng, seg, smooth, easeOut, easeIn, easeInOut, backOut, lerp, clamp } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, mood, pose, sparkle, title, label, makeStage, chartLine, burst } from "../../lib2d/ink.js";

const SLOW = 1.25, N = 1100, GOLDEN = Math.PI * (3 - Math.sqrt(5)), TAU = Math.PI * 2;
const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(",")})`; };
let LIVE = 0;

// times (beats)
const T_GAL = 2.2, T_SUCK = 4.6, T_NAU = 5.2, T_SUN = 8.2, T_FLOCK = 11.2, T_CURVE = 13.6, T_END = 16.8;

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const navy = paper(W, H, PAL.navy, 11);

  // ---- every particle's identity, decided once ----
  const r = rng(2026), P = [];
  for (let i = 0; i < N; i++) {
    const halo = r() < 0.18, arm = r() < 0.5 ? 0 : Math.PI, u = Math.pow(r(), halo ? 0.6 : 0.9);
    P.push({
      halo, arm, gr: 26 + 420 * u, gj: (r() - 0.5) * (halo ? 6.3 : 0.55), gsz: 1.3 + r() * 2.6,
      gcol: u < 0.12 ? "#fff3c4" : ["#ffc75a", "#7cc6f2", "#f28bb5", "#ffe08a"][Math.floor(r() * 4)],
      fu: r() * 2 - 1, fv: r() * 2 - 1, fph: r() * 6.28, cs: r(), cj: (r() - 0.5) * 18, d: r(), glint: r() < 0.03,
    });
  }
  [...P.keys()].sort((a, b) => P[a].gr - P[b].gr).forEach((idx, n) => (P[idx].n = n + 1));

  // ---- where a particle is, in each world ----
  const galTilt = (t) => 0.6 - 0.14 * Math.sin((t - T_GAL) * 0.45);
  const galaxy = (p, t) => {
    const bloom = easeOut(seg(t, T_GAL, T_GAL + 0.9)), rr = p.gr * bloom, w = 0.55 / (0.4 + p.gr / 280);
    const th = p.halo ? p.gj + w * t : p.arm + Math.log(p.gr / 26) / 0.3 + p.gj + w * t;
    const x = rr * Math.cos(th), y = rr * Math.sin(th) * galTilt(t), a = -0.28 + 0.06 * Math.sin(t * 0.3);
    return [960 + x * Math.cos(a) - y * Math.sin(a), 540 + x * Math.sin(a) + y * Math.cos(a)];
  };
  const suck = (p, t) => {                                          // spiral into the core
    const [x, y] = galaxy(p, t), k = easeIn(seg(t, T_SUCK + p.d * 0.25, T_NAU)), dx = x - 960, dy = y - 540;
    const rr = Math.hypot(dx, dy) * (1 - k), th = Math.atan2(dy, dx) + k * 2.5;
    return [960 + rr * Math.cos(th), 540 + rr * Math.sin(th)];
  };
  const SUN_C = 10.2;
  const sunflower = (p, t) => {
    const f = p.n / N, k = easeOut(seg(t, T_SUN + 0.1 + f * 0.45, T_SUN + 0.8 + f * 0.45));
    const rr = SUN_C * Math.sqrt(p.n) * k, th = p.n * GOLDEN + t * 0.06 + (1 - k) * 2;
    return [960 + rr * Math.cos(th), 540 + rr * Math.sin(th)];
  };
  const flock = (p, t) => {
    const cx = 960 + 360 * Math.sin(0.55 * t), cy = 430 + 80 * Math.sin(0.9 * t + 1), rot = 0.25 * Math.sin(0.5 * t);
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
    if (t < T_SUCK) return { xy: galaxy(p, t), col: p.gcol, sz: p.gsz, glow: 1 };
    if (t < T_NAU) return { xy: suck(p, t), col: p.gcol, sz: p.gsz, glow: 1, fade: 1 - seg(t, T_NAU - 0.12, T_NAU) };
    if (t < T_SUN) return null;
    if (t < T_FLOCK) {
      // light runs along one family of the seed spirals
      const m = ((t - T_SUN) * 9) % 34, dd = Math.min(Math.abs((p.n % 34) - m), 34 - Math.abs((p.n % 34) - m)), lit = Math.exp(-dd * dd * 0.35);
      return { xy: sunflower(p, t), col: mixHex(seedCol(p), "#ffd45c", lit * 0.85 * seg(t, T_SUN + 1.2, T_SUN + 1.6)), sz: 4.2 + lit, seed: 1 };
    }
    if (t < T_CURVE) { const [k, xy] = morph(sunflower(p, t), flock(p, t), t, T_FLOCK, 0.8, 0.45, p); return { xy, col: mixHex(seedCol(p), "#241827", k), sz: 4.2 - k * 1.2, bird: k, seed: 1 - k, trail: k > 0.04 && k < 0.7 ? morph(sunflower(p, t - 0.05), flock(p, t - 0.05), t - 0.05, T_FLOCK, 0.8, 0.45, p)[1] : null }; }
    const [k, xy] = morph(flock(p, t), curve(p), t, T_CURVE, 0.8, 0.4, p);
    return { xy, col: mixHex("#241827", PAL.blue, k), sz: lerp(3, 3.4, k), bird: 1 - k, fade: 1 - smooth(seg(t, T_CURVE + 1.5, T_CURVE + 2.1)) };
  }

  // ---- skies ----
  const stars = Array.from({ length: 170 }, (_, i) => { const q = rng(500 + i); return [q() * 1920, q() * 1080, 0.5 + q() * 1.8, q() * 6]; });
  const bubbles = Array.from({ length: 40 }, (_, i) => { const q = rng(700 + i); return [q() * 1920, q() * 1400, 3 + q() * 11, 40 + q() * 90, q() * 6]; });
  const fill = (c, alpha, style, clip) => { if (alpha <= 0) return; c.save(); if (clip) { c.beginPath(); clip(c); c.clip(); } c.globalAlpha = alpha; c.fillStyle = style; c.fillRect(-400, -400, 2720, 1880); c.restore(); };
  const irisR = (t) => 1400 * easeInOut(seg(t, T_SUN, T_SUN + 0.65));
  const nearStars = Array.from({ length: 36 }, (_, i) => { const q = rng(800 + i); return [q() * 1920, q() * 1080, 1.5 + q() * 2.5, q() * 6]; });
  const plankton = Array.from({ length: 110 }, (_, i) => { const q = rng(1200 + i); return [q() * 1920, q() * 1080, 0.8 + q() * 2.2, q() * 6, q()]; });
  const clouds = [[1500, 610, 420, 18, 0.0], [1150, 675, 520, 14, 1.3], [1650, 720, 360, 11, 2.1], [400, 300, 380, 12, 0.7]];
  const flyers = Array.from({ length: 6 }, (_, i) => { const q = rng(1500 + i); return [q() * 0.8, 180 + q() * 520, 14 + q() * 16, 0.55 + q() * 0.35, q() * 6]; });
  function sky(c, t) {
    const space = seg(t, T_GAL - 0.1, T_GAL + 0.1) * (1 - seg(t, T_NAU - 0.05, T_NAU));
    const ocean = seg(t, T_NAU - 0.05, T_NAU) * (t < T_SUN + 0.7 ? 1 : 0);
    const sunset = seg(t, T_FLOCK, T_FLOCK + 1.0) * (t < T_CURVE + 0.95 ? 1 : 0);
    const peach = (t >= T_SUN ? 1 : 0) * (1 - seg(t, T_FLOCK, T_FLOCK + 1.0));
    const g1 = c.createRadialGradient(960, 540, 60, 960, 540, 1100); g1.addColorStop(0, "#2a1f5e"); g1.addColorStop(0.5, "#141638"); g1.addColorStop(1, "#07081a");
    fill(c, space, g1);
    if (space > 0) {
      c.save(); c.globalAlpha = space;
      for (const [x, y, s, ph] of stars) { c.fillStyle = `rgba(255,248,230,${0.35 + 0.65 * (0.5 + 0.5 * Math.sin(LIVE * 2 + ph))})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
      // near stars drift outward faster: we're flying into the galaxy
      const fly = 1 + 0.35 * (t - T_GAL);
      for (const [x0, y0, s, ph] of nearStars) {
        const x = 960 + (x0 - 960) * fly, y = 540 + (y0 - 540) * fly;
        c.fillStyle = "rgba(255,244,220,0.18)"; c.beginPath(); c.arc(x, y, s * 3.2, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,250,240,${0.6 + 0.4 * Math.sin(LIVE * 3 + ph)})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
      }
      c.restore();
    }
    if (ocean > 0) {
      const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, "#1c5f73"); g.addColorStop(1, "#071b28");
      fill(c, ocean, g);
      c.save(); c.globalAlpha = ocean * 0.1; c.fillStyle = "#bff3ff";               // light shafts from the surface
      for (const [x0, w] of [[300, 140], [760, 90], [1250, 170], [1650, 80]]) { const sway = 40 * Math.sin(LIVE * 0.6 + x0); c.beginPath(); c.moveTo(x0 + sway, -50); c.lineTo(x0 + w + sway, -50); c.lineTo(x0 + w * 2.4 - 200, 1130); c.lineTo(x0 - 200, 1130); c.closePath(); c.fill(); }
      c.restore();
      c.save(); c.globalAlpha = ocean; c.strokeStyle = "rgba(210,245,255,0.55)"; c.lineWidth = 1.6;
      for (const [x, y0, s, sp, ph] of bubbles) {
        const y = ((y0 - (t - T_NAU) * sp) % 1400 + 1400) % 1400 - 100, bx = x + 8 * Math.sin(LIVE * 2 + ph);
        c.beginPath(); c.arc(bx, y, s, 0, TAU); c.stroke();
        c.beginPath(); c.arc(bx - s * 0.35, y - s * 0.35, s * 0.28, Math.PI, Math.PI * 1.6); c.stroke();      // a glint on each bubble
      }
      // caustic ripples near the surface
      c.strokeStyle = "rgba(200,245,255,0.13)"; c.lineWidth = 3;
      for (let j = 0; j < 7; j++) {
        c.beginPath();
        for (let x = -40; x <= 1960; x += 24) c.lineTo(x, 40 + j * 34 + 10 * Math.sin(x * 0.012 + LIVE * 1.4 + j * 1.7) + 6 * Math.sin(x * 0.031 - LIVE * 2 + j));
        c.stroke();
      }
      // plankton: specks drifting in the current
      for (const [x0, y0, s, ph, v] of plankton) {
        const x = ((x0 + LIVE * (8 + v * 14)) % 1960 + 1960) % 1960 - 20, y = y0 + 12 * Math.sin(LIVE * 0.8 + ph);
        c.fillStyle = `rgba(215,245,235,${0.25 + 0.35 * v})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        if (v > 0.8) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 7, y + 3 * Math.sin(LIVE * 5 + ph)); c.lineWidth = 1; c.strokeStyle = "rgba(215,245,235,0.4)"; c.stroke(); }
      }
      c.restore();
    }
    const gp = c.createLinearGradient(0, 0, 0, 1080); gp.addColorStop(0, "#f7d2a6"); gp.addColorStop(1, "#ef9f7e");
    fill(c, peach, gp, t < T_SUN + 0.7 ? (k) => k.arc(960, 540, irisR(t), 0, TAU) : null);
    if (sunset > 0) {
      const gs = c.createLinearGradient(0, 0, 0, 1080); gs.addColorStop(0, "#4f3789"); gs.addColorStop(0.55, "#c46f8f"); gs.addColorStop(1, "#f3a57c");
      fill(c, sunset, gs);
      c.save(); c.globalAlpha = sunset;
      const sy = 790 - 60 * seg(t, T_FLOCK, T_CURVE), sun = c.createRadialGradient(1320, sy, 0, 1320, sy, 330);
      sun.addColorStop(0, "rgba(255,236,190,1)"); sun.addColorStop(0.32, "rgba(255,214,150,0.95)"); sun.addColorStop(0.36, "rgba(255,190,130,0.35)"); sun.addColorStop(1, "rgba(255,160,120,0)");
      c.fillStyle = sun; c.beginPath(); c.arc(1320, sy, 330, 0, TAU); c.fill();
      // slow rays turning behind the sun
      c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = "rgba(255,220,170,0.07)";
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + LIVE * 0.05; c.beginPath(); c.moveTo(1320, sy); c.lineTo(1320 + Math.cos(a - 0.05) * 1500, sy + Math.sin(a - 0.05) * 1500); c.lineTo(1320 + Math.cos(a + 0.05) * 1500, sy + Math.sin(a + 0.05) * 1500); c.closePath(); c.fill(); }
      c.restore();
      // long thin clouds drifting across the sun
      for (const [x0, y, w, h, ph] of clouds) {
        const x = x0 - (t - T_FLOCK) * 40 + 10 * Math.sin(LIVE * 0.3 + ph);
        c.beginPath(); c.ellipse(x, y, w, h, 0, 0, TAU); c.ellipse(x + w * 0.35, y - h * 0.7, w * 0.45, h * 0.9, 0, 0, TAU);
        c.fillStyle = "rgba(250,196,170,0.85)"; c.fill(); c.lineWidth = 1.6; c.strokeStyle = "rgba(90,40,70,0.55)"; c.stroke();
        c.beginPath(); c.moveTo(x - w * 0.7, y + h * 0.4); c.lineTo(x + w * 0.6, y + h * 0.4); c.lineWidth = 1.2; c.strokeStyle = "rgba(255,235,210,0.6)"; c.stroke();
      }
      for (const [col, base, amp, f, ph] of [["#6b3f73", 840, 50, 0.004, 0], ["#3e2656", 900, 60, 0.0031, 2], ["#27183a", 965, 45, 0.0052, 4]]) {
        const hill = (k) => { k.moveTo(-50, 1200); for (let x = -50; x <= 1970; x += 30) k.lineTo(x, base + amp * Math.sin(x * f + ph) + amp * 0.4 * Math.sin(x * f * 2.7 + ph)); k.lineTo(1970, 1200); k.closePath(); };
        c.beginPath(); hill(c); c.fillStyle = col; c.fill();
        hatch(c, hill, { gap: 7, width: 1.1, color: "rgba(20,8,30,0.28)", cx: 960, cy: base + 150, R: 1400 });
        c.save(); c.translate(0, 3); c.beginPath(); for (let x = 700; x <= 1970; x += 30) c.lineTo(x, base + amp * Math.sin(x * f + ph) + amp * 0.4 * Math.sin(x * f * 2.7 + ph));
        c.lineWidth = 2; c.strokeStyle = "rgba(255,200,150,0.45)"; c.stroke(); c.restore();        // rim light on the sun side
        c.beginPath(); hill(c); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke();
      }
      c.restore();
    }
    // Dalio hatch-in from the sunset to the navy chart paper
    const hp = seg(t, T_CURVE, T_CURVE + 0.9);
    if (hp > 0 && hp < 1) {
      const Wc = c.canvas.width, Hc = c.canvas.height, gap = 26 * Wc / 1920, ang = -1.05, dx = Math.cos(ang), dy = Math.sin(ang), RR = Math.hypot(Wc, Hc);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath();
      for (let d = -RR; d < RR; d += gap) {
        const cx = Wc / 2 - dy * d, cy = Hc / 2 + dx * d, u = (cx / Wc + (1 - cy / Hc) * 0.35) / 1.35, q = clamp(hp * 1.6 - u * 0.6);
        if (q <= 0) continue;
        const w = (gap * 1.15 * smooth(q) + 1.5) / 2, nx = -dy * w, ny = dx * w;
        c.moveTo(cx - dx * RR + nx, cy - dy * RR + ny); c.lineTo(cx + dx * RR + nx, cy + dy * RR + ny); c.lineTo(cx + dx * RR - nx, cy + dy * RR - ny); c.lineTo(cx - dx * RR - nx, cy - dy * RR - ny); c.closePath();
      }
      c.clip(); c.drawImage(navy, 0, 0, Wc, Hc); c.restore();
    }
    return { space, ocean };
  }

  // ---- galaxy dressing ----
  function galaxyDressing(c, t, w) {
    if (w <= 0) return;
    const bloom = easeOut(seg(t, T_GAL, T_GAL + 0.9)), flare = seg(t, T_SUCK, T_NAU), tilt = galTilt(t);
    c.save(); c.globalAlpha = w; c.globalCompositeOperation = "screen";
    const cr = 190 * (0.4 + 0.6 * bloom) * (1 + flare * 2.5);
    const core = c.createRadialGradient(960, 540, 0, 960, 540, cr);
    core.addColorStop(0, "rgba(255,248,225,1)"); core.addColorStop(0.3, `rgba(255,205,120,${0.5 + flare * 0.5})`); core.addColorStop(1, "rgba(255,160,80,0)");
    c.fillStyle = core; c.beginPath(); c.arc(960, 540, cr, 0, TAU); c.fill();
    const q = rng(33);
    for (let i = 0; i < 6; i++) {
      const a = q() * 6.28 + t * 0.12, rr = (120 + q() * 260) * (1 - flare), x = 960 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr * tilt;
      const g = c.createRadialGradient(x, y, 0, x, y, 140 + q() * 120);
      g.addColorStop(0, q() < 0.5 ? "rgba(242,139,181,0.16)" : "rgba(80,200,210,0.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 260, 0, TAU); c.fill();
    }
    c.globalCompositeOperation = "source-over";
    // dark dust lanes trailing each arm
    const a0 = -0.28 + 0.06 * Math.sin(t * 0.3);
    for (const arm of [0, Math.PI]) {
      c.beginPath();
      for (let rr = 40; rr < 440; rr += 8) {
        const w = 0.55 / (0.4 + rr / 280), th = arm + Math.log(rr / 26) / 0.3 + w * t - 0.2, R2 = rr * bloom * (1 - flare);
        const x = R2 * Math.cos(th), y = R2 * Math.sin(th) * tilt;
        c.lineTo(960 + x * Math.cos(a0) - y * Math.sin(a0), 540 + x * Math.sin(a0) + y * Math.cos(a0));
      }
      c.lineWidth = 14; c.lineCap = "round"; c.strokeStyle = "rgba(12,8,30,0.32)"; c.stroke();
      c.lineWidth = 5; c.strokeStyle = "rgba(12,8,30,0.35)"; c.stroke();
    }
    c.strokeStyle = "rgba(190,205,255,0.28)";
    for (const [rx, lw, sp] of [[250, 1.4, 0.18], [390, 1.1, -0.1], [520, 0.9, 0.06]]) {
      c.beginPath(); c.ellipse(960, 540, rx * bloom * (1 - flare), rx * tilt * bloom * (1 - flare), -0.28, t * sp, t * sp + Math.PI * 1.6); c.lineWidth = lw; c.stroke();
    }
    c.restore();
  }

  // ---- the nautilus: a log spiral that grows a chamber at a time, forever ----
  // r(θ) = e^(bθ), 3x per whorl like the real shell. The camera zooms out and turns
  // exactly as fast as the shell grows, so the newest chamber stays the same size.
  const NB = Math.log(3) / TAU, rs = (th) => Math.exp(NB * th), DCH = TAU / 12;
  function nautilus(c, t) {
    if (t < T_NAU - 0.05 || t > T_SUN + 0.75) return;
    const tt = t - T_NAU, thMax = 30 + 2.6 * tt, R = rs(thMax), SCR = 400;
    const newest = (thMax / DCH) % 1, bump = 1 + 0.035 * Math.exp(-newest * 6);           // a small bounce each time a chamber closes
    const emerge = zoomLerp(9, 1, easeOut(seg(t, T_NAU, T_NAU + 1.1)));                    // out of the galaxy's core
    const z = (SCR / R) * bump;
    const shrink = easeIn(seg(t, T_SUN, T_SUN + 0.7));                      // swallowed by the iris
    const pop = emerge;
    const px = (n) => n / z, P2 = (th, rr) => [rr * Math.cos(th), rr * Math.sin(th)];
    const thMin = thMax - 4.3 * TAU;
    c.save();
    // the shell's bulk sits 0.21R toward the mouth and 0.16R toward the next whorl; offset the origin so the shell is centred
    c.translate(960 + 0.21 * SCR * pop, 540 - 0.16 * SCR * pop); c.scale(pop * (1 - shrink * 0.9), pop * (1 - shrink * 0.9));
    c.rotate(Math.PI - thMax + shrink * 3); c.scale(z, z);
    const shell = (k) => {
      for (let th = thMin; th <= thMax; th += 0.05) k.lineTo(...P2(th, rs(th)));
      k.lineTo(...P2(thMax, rs(thMax)));
      for (let th = thMax; th >= thMin; th -= 0.05) k.lineTo(...P2(th, rs(th - TAU)));
      k.closePath();
    };
    c.beginPath(); shell(c); c.fillStyle = "#f4e7cf"; c.fill();
    // chambers: older ones warmer, each wall bowed backward like the real shell
    const k0 = Math.ceil((thMin + TAU) / DCH), k1 = Math.floor(thMax / DCH);
    const septum = (k, th, reverse) => {
      const o = P2(th, rs(th)), i = P2(th, rs(th - TAU)), mid = P2(th - DCH * 0.45, (rs(th) + rs(th - TAU)) / 2);
      if (!reverse) { k.lineTo(...o); k.quadraticCurveTo(...mid, ...i); } else { k.lineTo(...i); k.quadraticCurveTo(...mid, ...o); }
    };
    for (let k = k0 + 1; k <= k1; k++) {
      const a = (k - 1) * DCH, b = k * DCH, age = (thMax - b) / (4 * TAU);
      c.beginPath();
      septum(c, a, true);
      for (let th = a; th <= b; th += 0.04) c.lineTo(...P2(th, rs(th)));
      septum(c, b, false);
      for (let th = b; th >= a; th -= 0.04) c.lineTo(...P2(th, rs(th - TAU)));
      c.closePath();
      c.fillStyle = mixHex("#f6ebd6", "#e3b98a", age * 1.3 + (k % 2) * 0.06); c.fill();
    }
    hatch(c, shell, { gap: px(7), width: px(1.2), color: "rgba(120,70,30,0.22)", cx: 0, cy: 0, R: R * 1.3 });
    // walls, the newest one drawing itself in
    c.strokeStyle = "#8a5a2e"; c.lineCap = "round";
    for (let k = k0; k <= k1; k++) {
      const th = k * DCH, grow = clamp((thMax - th) / (DCH * 0.6));
      const o = P2(th, rs(th)), i = P2(th, rs(th - TAU)), mid = P2(th - DCH * 0.45, (rs(th) + rs(th - TAU)) / 2);
      c.save(); if (grow < 1) { const L = rs(th) * 1.2; c.setLineDash([L * grow, L]); }
      c.beginPath(); c.moveTo(...o); c.quadraticCurveTo(...mid, ...i);
      c.lineWidth = px(4.2); c.strokeStyle = "#6d4524"; c.stroke();                           // the wall has thickness:
      c.lineWidth = px(1.5); c.strokeStyle = "#f8eedc"; c.stroke(); c.restore();               // dark edges, pale nacre inside
    }
    // the siphuncle: one thin tube threading every chamber
    c.beginPath();
    for (let th = thMin + TAU; th <= thMax - DCH * 0.3; th += 0.05) c.lineTo(...P2(th, rs(th) * 0.42 + rs(th - TAU) * 0.58));
    c.lineWidth = px(2.2); c.strokeStyle = "rgba(150,90,40,0.7)"; c.setLineDash([px(6), px(5)]); c.stroke(); c.setLineDash([]);
    // outer shell + the open mouth
    c.beginPath(); for (let th = thMin; th <= thMax; th += 0.05) c.lineTo(...P2(th, rs(th)));
    c.lineTo(...P2(thMax, rs(thMax - TAU))); c.lineWidth = px(4.5); c.lineJoin = "round"; c.strokeStyle = PAL.ink; c.stroke();
    // fine growth lines across the newest whorl, parallel to the mouth
    c.strokeStyle = "rgba(140,90,50,0.35)"; c.lineWidth = px(1);
    for (let th = thMax - TAU + 0.1; th < thMax; th += 0.07) {
      const o = rs(th), inner = rs(th - TAU), w = (o - inner) * (0.25 + 0.15 * Math.sin(th * 7));
      c.beginPath(); c.moveTo(...P2(th, o - px(3))); c.lineTo(...P2(th - 0.02, o - w)); c.stroke();
    }
    // tiger stripes on the newest whorl's rim
    c.strokeStyle = "rgba(170,85,35,0.75)"; c.lineWidth = px(5);
    for (let th = thMax - TAU + 0.3; th < thMax - 0.2; th += 0.42) {
      const o = rs(th), w = o * 0.12;
      c.beginPath(); c.moveTo(...P2(th, o - px(4))); c.quadraticCurveTo(...P2(th + 0.08, o - w * 0.6), ...P2(th - 0.05, o - w)); c.stroke();
    }
    c.restore();
  }

  // ---- sunflower petals + disk ----
  function sunflowerDressing(c, t) {
    const Rd = SUN_C * Math.sqrt(N) + 8, leave = smooth(seg(t, T_FLOCK, T_FLOCK + 0.7));
    const disk = seg(t, T_SUN + 0.05, T_SUN + 0.5) * (1 - leave);
    if (disk <= 0 && t < T_SUN + 0.5) return;
    c.save(); c.globalAlpha = 1 - smooth(seg(leave, 0.6, 1));
    for (const [ring, n, L, off, col] of [[0, 34, 150, 0, "#e9a114"], [1, 34, 128, Math.PI / 34, PAL.gold]]) {
      for (let j = 0; j < n; j++) {
        const t0 = T_SUN + 0.75 + j * 0.013 + ring * 0.08, k = backOut(seg(t, t0, t0 + 0.35)) * (1 - leave * 0.4);
        if (k <= 0) continue;
        const a = off + (j / n) * TAU + t * 0.06 + leave * (j % 2 ? 0.6 : -0.6);
        const l = L * k * (0.92 + 0.12 * Math.sin(j * 2.3)) * (1 + 0.03 * Math.sin(LIVE * 2 + j));
        const gust = leave * (0.7 + 0.6 * ((j * 37 + ring * 11) % 17) / 17), spin = gust * (((j * 13) % 7) - 3) * 1.2;
        c.save(); c.translate(960 + Math.cos(a) * (Rd - 12 + gust * 520) + gust * 380, 540 + Math.sin(a) * (Rd - 12 + gust * 520) + gust * gust * 260); c.rotate(a + spin);
        const petal = (k2) => { k2.moveTo(0, 0); k2.quadraticCurveTo(l * 0.45, -21, l, 0); k2.quadraticCurveTo(l * 0.45, 21, 0, 0); };
        c.beginPath(); petal(c); c.fillStyle = col; c.fill();
        hatch(c, (k2) => { k2.moveTo(0, 0); k2.quadraticCurveTo(l * 0.45, 21, l, 0); k2.closePath(); }, { gap: 5, width: 1, color: "rgba(150,80,0,0.45)", cx: l / 2, cy: 0, R: l });
        c.beginPath(); petal(c); c.lineWidth = 2.4; c.strokeStyle = PAL.ink; c.stroke();
        c.beginPath(); c.moveTo(8, 0); c.lineTo(l * 0.8, 0); c.lineWidth = 1.2; c.strokeStyle = "rgba(150,80,0,0.6)"; c.stroke();
        c.restore();
      }
    }
    c.restore();
    if (disk > 0) {
      c.save(); c.globalAlpha = disk; c.beginPath(); c.arc(960, 540, Rd * easeOut(seg(t, T_SUN + 0.05, T_SUN + 0.6)), 0, TAU);
      const dg = c.createRadialGradient(960, 540, 0, 960, 540, Rd); dg.addColorStop(0, "#c9b24a"); dg.addColorStop(0.3, "#a0782a"); dg.addColorStop(1, "#7a4e1a");
      c.fillStyle = dg; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke(); c.restore();
    }
  }

  // ---- Dalio grid behind the curve ----
  function grid(c, t) {
    const k = seg(t, T_CURVE - 0.2, T_CURVE + 0.8);
    if (k <= 0) return;
    c.save(); c.strokeStyle = "rgba(160,190,215,0.22)"; c.lineWidth = 1.5;
    for (let i = 0; i <= 14; i++) { const p = easeOut(clamp(k * 1.6 - i * 0.04)); if (p <= 0) continue; const x = 250 + i * 100; c.beginPath(); c.moveTo(x, 900); c.lineTo(x, 900 - 700 * p); c.stroke(); }
    for (let j = 0; j <= 7; j++) { const p = easeOut(clamp(k * 1.6 - j * 0.06)); if (p <= 0) continue; const y = 900 - j * 100; c.beginPath(); c.moveTo(250, y); c.lineTo(250 + 1400 * p, y); c.stroke(); }
    c.restore();
  }

  // ---- details that sit in front of the particles ----
  const beePath = (s) => [960 + 560 * Math.sin(s * 1.3) * Math.cos(s * 0.4) + (1 - clamp(s)) * 900, 520 + 230 * Math.sin(s * 2.6) - 60 * Math.cos(s * 0.9)];
  function frontDetails(c, t) {
    // florets: a ring of tiny flowers where the seeds meet the petals
    const fk = seg(t, T_SUN + 0.6, T_SUN + 1.0) * (1 - seg(t, T_FLOCK, T_FLOCK + 0.4));
    if (fk > 0) {
      const Rd = SUN_C * Math.sqrt(N) + 2;
      c.save(); c.globalAlpha = fk;
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * TAU + t * 0.06, rr = Rd - 6 * (i % 2), x = 960 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr, s2 = 4 + (i % 3);
        c.fillStyle = i % 2 ? "#f5c33b" : "#e8a92a"; c.beginPath();
        for (let k = 0; k < 10; k++) { const aa = (k / 10) * TAU, q = k % 2 ? s2 * 0.45 : s2; c.lineTo(x + Math.cos(aa + a) * q, y + Math.sin(aa + a) * q); }
        c.closePath(); c.fill(); c.fillStyle = "#5a3510"; c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.fill();
      }
      c.restore();
    }
    // a bee visits, leaving a dotted flight path
    const b0 = T_SUN + 1.2, b1 = T_FLOCK + 0.6;
    if (t > b0 && t < b1) {
      const s = (t - b0) / (b1 - b0) * 2.2, [bx, by] = beePath(s), [nx, ny] = beePath(s + 0.01), dir = Math.atan2(ny - by, nx - bx);
      c.save(); c.setLineDash([3, 9]); c.lineWidth = 2; c.strokeStyle = "rgba(60,30,10,0.55)"; c.beginPath();
      for (let q = Math.max(0, s - 0.9); q <= s; q += 0.01) c.lineTo(...beePath(q));
      c.stroke(); c.restore();
      c.save(); c.translate(bx, by + 4 * Math.sin(LIVE * 14)); c.rotate(dir); c.scale(1.9, 1.9); const flap = Math.abs(Math.sin(LIVE * 55));
      c.fillStyle = "rgba(235,245,255,0.8)"; c.strokeStyle = PAL.ink; c.lineWidth = 1.5;
      for (const sgn of [-1, 1]) { c.beginPath(); c.ellipse(-2, sgn * 9 * flap, 10, 6 * flap + 1, sgn * 0.4, 0, TAU); c.fill(); c.stroke(); }
      c.beginPath(); c.ellipse(0, 0, 15, 10, 0, 0, TAU); c.fillStyle = "#f5c33b"; c.fill();
      c.save(); c.clip(); c.fillStyle = PAL.ink; for (const x of [-7, 1]) c.fillRect(x, -12, 4.5, 24); c.restore();
      c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.moveTo(-15, 0); c.lineTo(-21, 0); c.stroke();
      c.fillStyle = PAL.ink; c.beginPath(); c.arc(11, -3, 1.8, 0, TAU); c.fill();
      c.restore();
    }
    // a few big birds close to the camera, crossing the sunset
    const bw = seg(t, T_FLOCK + 0.5, T_FLOCK + 0.9) * (t < T_CURVE + 0.5 ? 1 : 0);
    if (bw > 0) {
      c.save(); c.globalAlpha = bw; c.strokeStyle = "#1d1222"; c.lineCap = "round"; c.lineJoin = "round";
      for (const [x0, y, s2, sp, ph] of flyers) {
        const x = -200 + ((x0 * 2300 + (t - T_FLOCK) * sp * 420) % 2400), f = Math.sin(LIVE * 7 + ph);
        c.beginPath(); c.moveTo(x - s2, y - s2 * 0.5 * f); c.quadraticCurveTo(x - s2 * 0.45, y - s2 * 0.15 * f - 3, x, y); c.quadraticCurveTo(x + s2 * 0.45, y - s2 * 0.15 * f - 3, x + s2, y - s2 * 0.5 * f);
        c.lineWidth = 3.2; c.stroke();
      }
      c.restore();
    }
    // the chart: axis words, "slow" then "then fast", a glint riding the pen tip
    if (t >= T_CURVE) {
      const p = easeInOut(seg(t, T_CURVE + 0.8, T_CURVE + 1.7));
      if (p > 0 && p < 1) {
        const pts = Array.from({ length: 60 }, (_, i) => CURVE(i / 59)), L = [0];
        for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const want = L[L.length - 1] * p; let i = 1; while (i < L.length - 1 && L[i] < want) i++;
        const f = (want - L[i - 1]) / (L[i] - L[i - 1]), gx = lerp(pts[i - 1][0], pts[i][0], f), gy = lerp(pts[i - 1][1], pts[i][1], f);
        c.save(); c.globalCompositeOperation = "screen"; const g = c.createRadialGradient(gx, gy, 0, gx, gy, 60);
        g.addColorStop(0, "rgba(190,230,255,0.8)"); g.addColorStop(1, "rgba(120,180,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(gx, gy, 60, 0, TAU); c.fill(); c.restore();
        sparkle(c, gx, gy, 18 + 4 * Math.sin(LIVE * 20), "#eaf6ff");
      }
    }
  }

  // ---- speed lines (screen space) ----
  function speed(c, k, seed, inward = true) {
    if (k <= 0) return;
    const q = rng(seed); c.save(); c.strokeStyle = `rgba(255,246,225,${0.55 * Math.sin(Math.PI * k)})`; c.lineCap = "round";
    for (let i = 0; i < 60; i++) {
      const a = q() * TAU, r0 = 250 + q() * 700, len = 80 + q() * 260, m = ((inward ? 1 - k : k) * 1.4 + q()) % 1;
      const rr = r0 * (0.3 + m * 1.2);
      c.beginPath(); c.moveTo(960 + Math.cos(a) * rr, 540 + Math.sin(a) * rr); c.lineTo(960 + Math.cos(a) * (rr + len), 540 + Math.sin(a) * (rr + len));
      c.lineWidth = 1 + q() * 3; c.stroke();
    }
    c.restore();
  }

  // ---- the grain, close enough to fill the screen: crease, hatching, the little brush of
  // hairs at its tip, and (as we dive) a spiral of sparks forming inside it ----
  function drawGrain(c, t) {
    const z = cam(t).z, px = (n) => n / z, kern = (k) => { k.moveTo(-18, 0); k.bezierCurveTo(-16, -11, 12, -12, 18, -2); k.bezierCurveTo(19, 4, 10, 11, -2, 10); k.bezierCurveTo(-12, 9, -18, 5, -18, 0); k.closePath(); };
    c.save(); c.translate(...GRAIN); c.rotate(-0.25);
    c.beginPath(); kern(c); c.fillStyle = PAL.gold; c.fill();
    const hi = c.createRadialGradient(-4, -5, 0, -4, -5, 14); hi.addColorStop(0, "rgba(255,236,160,0.9)"); hi.addColorStop(1, "rgba(255,236,160,0)");
    c.fillStyle = hi; c.beginPath(); kern(c); c.fill();
    hatch(c, (k) => { k.moveTo(-18, 2); k.bezierCurveTo(-6, 6, 8, 5, 19, 0); k.lineTo(19, 14); k.lineTo(-18, 14); k.closePath(); }, { gap: Math.max(px(6), 0.5), width: Math.max(px(1.1), 0.1), color: "rgba(150,70,0,0.5)", cx: 0, cy: 5, R: 30 });
    c.beginPath(); c.moveTo(-13, 2); c.bezierCurveTo(-4, -2, 6, -2, 15, 1); c.lineWidth = Math.max(px(2), 0.35); c.strokeStyle = "rgba(120,60,0,0.85)"; c.stroke();
    c.strokeStyle = "rgba(120,70,10,0.8)"; c.lineWidth = Math.max(px(1.2), 0.15);
    for (let i = 0; i < 9; i++) { const a = -0.5 + i * 0.12; c.beginPath(); c.moveTo(18, -1 + i * 0.4); c.quadraticCurveTo(20 + Math.cos(a) * 2, -1 + Math.sin(a) * 2, 18 + Math.cos(a) * 5, -1 + Math.sin(a) * 5 + i * 0.3); c.stroke(); }
    const inner = seg(t, 1.75, 2.15);
    if (inner > 0) {
      c.save(); c.beginPath(); kern(c); c.clip(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 70; i++) { const rr = 0.4 + i * 0.12, th = i * 0.55 + t * 3; c.fillStyle = `rgba(255,${230 - (i % 3) * 30},${180 + (i % 4) * 18},${0.7 * inner})`; c.beginPath(); c.arc(Math.cos(th) * rr, Math.sin(th) * rr * 0.62, Math.max(px(2.2), 0.08), 0, TAU); c.fill(); }
      c.restore();
    }
    c.beginPath(); kern(c); c.lineWidth = Math.max(px(3), 0.4); c.strokeStyle = PAL.ink; c.stroke();
    c.restore();
  }

  // ---- the frame ----
  const GRAIN = [1080, 880];
  const motes = Array.from({ length: 55 }, (_, i) => { const q = rng(1700 + i); return [q() * 1920, q() * 1080, 0.8 + q() * 2.2, q() * 6]; });
  const scene = {
    bg: navy,
    art(c, t) {
      const { space } = sky(c, t);
      if (t < T_GAL + 0.1) {
        const pool = c.createRadialGradient(900, 900, 0, 900, 900, 420);
        pool.addColorStop(0, "rgba(255,190,90,0.16)"); pool.addColorStop(1, "rgba(255,190,90,0)");
        c.fillStyle = pool; c.beginPath(); c.ellipse(900, 900, 420, 90, 0, 0, TAU); c.fill();
        c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(GRAIN[0] + 4, GRAIN[1] + 8, 22, 5, 0, 0, TAU); c.fill();
        drawGrain(c, t);
        sparkle(c, GRAIN[0] + 26, GRAIN[1] - 24, 14 * (0.8 + 0.3 * Math.sin(LIVE * 6)));
        burst(c, GRAIN[0], GRAIN[1] - 10, seg(t, 1.3, 2.1), { r0: 40, r1: 900, color: "rgba(255,236,190,0.55)" });
        const m = mood(t, [[0, "thinking"], [0.8, "curious"], [1.3, "starstruck", "spark"]]);
        inkWick(c, 760, 910, 215, { ...m, arms: pose(t, [[0, "chin"], [0.8, "reach"], [1.3, "cheer"]]), t: LIVE, look: 1,
          rot: t > 0.8 && t < 1.3 ? 0.07 * smooth(seg(t, 0.8, 1.0)) : 0, dy: t > 1.3 && t < 1.65 ? -0.2 * Math.sin(((t - 1.3) / 0.35) * Math.PI) : 0 });
      }
      if (t >= T_GAL && t < T_NAU) galaxyDressing(c, t, space);
      nautilus(c, t);
      if (t >= T_SUN) sunflowerDressing(c, t);
      grid(c, t);
      c.lineCap = "round";
      for (const p of P) {
        if (t < T_GAL) break;
        const q = particle(p, t);
        if (!q || (q.fade ?? 1) <= 0.01) continue;
        const [x, y] = q.xy; c.globalAlpha = q.fade ?? 1;
        if (q.trail) { c.beginPath(); c.moveTo(...q.trail); c.lineTo(x, y); c.lineWidth = 1.6; c.strokeStyle = "rgba(60,30,20,0.35)"; c.stroke(); }
        if (p.glint && (q.glow || 0) > 0.5) sparkle(c, x, y, (5 + 7 * (0.5 + 0.5 * Math.sin(LIVE * 4 + p.fph))) * q.glow, "#fffbe8");
        if ((q.bird || 0) > 0.3) {
          const [x2, y2] = flock(p, t + 0.03), a = Math.atan2(y2 - y, x2 - x), L = 7 * q.bird, flap = 3 * Math.sin(LIVE * 18 + p.fph);
          c.beginPath(); c.moveTo(x - Math.cos(a) * L - Math.sin(a) * flap, y - Math.sin(a) * L + Math.cos(a) * flap); c.lineTo(x, y); c.lineTo(x - Math.cos(a) * L + Math.sin(a) * flap, y - Math.sin(a) * L - Math.cos(a) * flap);
          c.lineWidth = 2; c.strokeStyle = q.col; c.stroke();
        } else if ((q.seed || 0) > 0.5) {
          c.beginPath(); c.ellipse(x, y, q.sz * 1.3, q.sz * 0.85, Math.atan2(y - 540, x - 960), 0, TAU); c.fillStyle = q.col; c.fill();
        } else {
          if ((q.glow || 0) > 0.2) { c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.18 * q.glow * (q.fade ?? 1); c.beginPath(); c.arc(x, y, q.sz * 3, 0, TAU); c.fillStyle = q.col; c.fill(); c.globalAlpha = q.fade ?? 1; c.globalCompositeOperation = "source-over"; }
          c.beginPath(); c.arc(x, y, q.sz, 0, TAU); c.fillStyle = q.col; c.fill();
        }
      }
      c.globalAlpha = 1;
      frontDetails(c, t);
      // iris rim while the sunflower opens: double ring, turning ticks, sparks at the edge
      if (t > T_SUN && t < T_SUN + 0.7) {
        const ir = irisR(t), fadeI = 1 - seg(t, T_SUN + 0.5, T_SUN + 0.7);
        c.save(); c.globalAlpha = fadeI;
        c.beginPath(); c.arc(960, 540, ir, 0, TAU); c.lineWidth = 7; c.strokeStyle = PAL.ink; c.stroke();
        c.beginPath(); c.arc(960, 540, Math.max(0, ir - 16), 0, TAU); c.lineWidth = 2; c.stroke();
        for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU + t * 1.5; c.beginPath(); c.moveTo(960 + Math.cos(a) * (ir + 8), 540 + Math.sin(a) * (ir + 8)); c.lineTo(960 + Math.cos(a) * (ir + (i % 5 ? 20 : 34)), 540 + Math.sin(a) * (ir + (i % 5 ? 20 : 34))); c.lineWidth = i % 5 ? 1.5 : 3; c.stroke(); }
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU - t * 2; sparkle(c, 960 + Math.cos(a) * ir, 540 + Math.sin(a) * ir, 16, "#fff6d0"); }
        c.restore();
      }
      if (t >= T_CURVE) {
        chartLine(c, Array.from({ length: 30 }, (_, i) => CURVE(i / 29)), { width: 12, p: easeInOut(seg(t, T_CURVE + 0.8, T_CURVE + 1.7)) });
        if (t > T_CURVE + 1.0) {
          const m = mood(t, [[0, "happy"], [T_CURVE + 1.9, "joy"]]);
          inkWick(c, 1745, 960, 185, { ...m, arms: pose(t, [[0, "present"], [T_CURVE + 1.9, "wave"]]), t: LIVE, look: -1, flip: true, seed: 2,
            dy: -0.08 * backOut(seg(t, T_CURVE + 1.0, T_CURVE + 1.3)) + 0.08 });
        }
      }
    },
    text(c, t) {
      title(c, "Compounding", 560, 200, 90, PAL.paperText, "center", seg(t, T_CURVE + 1.7, T_CURVE + 2.05));
      const ax = seg(t, T_CURVE + 0.5, T_CURVE + 0.8);
      if (ax > 0) {
        label(c, "time", 1600, 950, 30, "rgba(200,215,230,0.85)", "center", ax);
        c.save(); c.translate(205, 520); c.rotate(-Math.PI / 2); label(c, "money", 0, 0, 30, "rgba(200,215,230,0.85)", "center", ax); c.restore();
      }
      title(c, "slow...", 470, 820, 46, PAL.paperText, "center", seg(t, T_CURVE + 1.2, T_CURVE + 1.5));
      title(c, "then fast", 1330, 330, 46, PAL.paperText, "center", seg(t, T_CURVE + 1.6, T_CURVE + 1.9));
    },
    over(c, t) {
      speed(c, seg(t, 1.6, 2.25), 11, true);
      speed(c, seg(t, T_GAL, T_GAL + 0.55), 12, false);
      speed(c, seg(t, T_SUCK + 0.1, T_NAU + 0.05), 13, true);
      const gold = seg(t, 1.95, 2.2) * (1 - seg(t, 2.2, 2.55));
      if (gold > 0) { c.fillStyle = `rgba(255,214,120,${0.95 * gold})`; c.fillRect(0, 0, 1920, 1080); }
      for (const [d, w] of [[0, 7], [0.09, 3.5], [0.17, 1.8]]) {
        const k = seg(t, T_NAU - 0.25 + d, T_NAU + 0.35 + d);
        if (k > 0 && k < 1) { c.beginPath(); c.arc(960, 540, 40 + 1300 * easeOut(k), 0, TAU); c.lineWidth = w * (1 - k) + 0.5; c.strokeStyle = `rgba(255,250,235,${0.9 * (1 - k)})`; c.stroke(); }
      }
      const rayK = seg(t, T_NAU - 0.35, T_NAU) * (1 - seg(t, T_NAU, T_NAU + 0.3));
      if (rayK > 0) {
        c.save(); c.globalCompositeOperation = "screen"; c.fillStyle = `rgba(255,236,190,${0.35 * rayK})`;
        for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU + t; c.beginPath(); c.moveTo(960, 540); c.lineTo(960 + Math.cos(a - 0.03) * 1500, 540 + Math.sin(a - 0.03) * 1500); c.lineTo(960 + Math.cos(a + 0.03) * 1500, 540 + Math.sin(a + 0.03) * 1500); c.closePath(); c.fill(); }
        c.restore();
      }
      // dust motes: the air in every world is alive
      for (const [x0, y0, s2, ph] of motes) {
        const x = ((x0 + LIVE * 9) % 1940 + 1940) % 1940 - 10, y = ((y0 - LIVE * 6 + 10 * Math.sin(LIVE * 0.7 + ph)) % 1100 + 1100) % 1100 - 10;
        c.fillStyle = `rgba(255,245,225,${0.1 + 0.12 * Math.sin(LIVE * 1.3 + ph)})`; c.beginPath(); c.arc(x, y, s2, 0, TAU); c.fill();
      }
      const white = seg(t, T_NAU - 0.2, T_NAU) * (1 - seg(t, T_NAU, T_NAU + 0.4));
      if (white > 0) { c.fillStyle = `rgba(255,248,228,${0.95 * white})`; c.fillRect(0, 0, 1920, 1080); }
    },
  };
  const cam = (t) => {
    const shake = t > 1.3 && t < 1.75 ? (1 - seg(t, 1.3, 1.75)) * 10 : 0;
    if (t < 1.5) return { x: 900 + shake * Math.sin(t * 90), y: 700 + shake * Math.cos(t * 77), z: 1.18 + 0.04 * t };
    if (t < T_GAL) { const k = easeIn(seg(t, 1.5, T_GAL)), m = smooth(seg(t, 1.5, 1.9)); return { x: lerp(900, GRAIN[0], m), y: lerp(700, GRAIN[1], m), z: zoomLerp(1.24, 40, k) }; }
    if (t < T_SUCK) { const k = easeOut(seg(t, T_GAL, T_GAL + 1.2)); return { x: 960, y: 540, z: zoomLerp(2.6, 1.0, k) + 0.05 * seg(t, T_GAL + 1.2, T_SUCK), r: 0.05 * Math.sin(t * 0.4) }; }
    if (t < T_NAU) return { x: 960, y: 540, z: zoomLerp(1.05, 3.2, easeIn(seg(t, T_SUCK, T_NAU))), r: 0.05 * Math.sin(t * 0.4) };
    if (t < T_SUN) return { x: 960, y: 540, z: 1 };
    if (t < T_FLOCK) return { x: 960, y: 540, z: 0.97 + 0.07 * smooth(seg(t, T_SUN + 0.6, T_FLOCK)), r: -0.03 * smooth(seg(t, T_SUN, T_FLOCK)) };
    if (t < T_CURVE) return { x: 960, y: 540, z: 1.02 - 0.02 * smooth(seg(t, T_FLOCK, T_FLOCK + 1)) };
    const k = smooth(seg(t, T_CURVE + 1.0, T_CURVE + 2.3));
    return { x: lerp(900, 960, k), y: lerp(560, 540, k), z: lerp(1.25, 1.0, k) };
  };

  return {
    duration: T_END * SLOW, fps: 30, out,
    renderAt(t) { LIVE = t; const c = t / SLOW; stage.frame({ ...scene, cam: cam(c) }, c, t); },
  };
}
