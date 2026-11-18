// TEST FILM (flat 2D, plain JavaScript Canvas) — Script 01 beats B01–B06, ~59s.
// Same beat sheet and audio as the three.js test; every pixel drawn with the
// 2D canvas API. Look: "The Egg" (cosmic, glowing, flat) + Dalio (warm, textured).
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, pop, rng, camPath } from "../../lib2d/ease.js";
import { drawWick, roundRectPath } from "../../lib2d/wick2d.js";

export const DURATION = 59;
const T = {
  grain: 1.35, lastSquare: 5.15, wheat: 8.15, b02: 12.9, when: 20.35,
  toDesk: [22.25, 23.05], line1: [24.25, 25.45], gt: [25.5, 25.85], line2: [25.95, 27.75], stamp: 28.15,
  iris: [30.85, 31.55, 32.2], chess: 33.3, loves: 35.95, gold: 40.62, land: 41.55, palace: 42.25,
  waves: 43.5, asks: 45.5, sq: [47.25, 48.95, 49.95, 51.5], ripple: [52.9, 54.6], title: 54.9, fadeOut: [58.1, 59],
};

// ── isometric chessboard ─────────────────────────────────────────────────────
// tile (r, c): a1 = r0 c0 sits at the NEAR (bottom) corner, h8 at the far (top).
const LIGHT = "#ecd6a8", DARK = "#7c5334";
function iso(u, v, a) { return [(u - v) * a, (u + v) * a * 0.5 - 4 * a]; }
function tileUV(r, c) { return [7 - c, 7 - r]; }
function tileCenter(r, c, a) { const [u, v] = tileUV(r, c); return iso(u + 0.5, v + 0.5, a); }
function drawBoard(ctx, x, y, sc, a, glow = () => 0, dim = () => 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const th = a * 0.45, m = 0.35;
  const P = (u, v) => iso(u, v, a);
  // frame + sides
  const fr = [P(-m, -m), P(8 + m, -m), P(8 + m, 8 + m), P(-m, 8 + m)];
  ctx.fillStyle = "#3f2616";
  ctx.beginPath(); ctx.moveTo(...fr[1]); ctx.lineTo(...fr[2]); ctx.lineTo(fr[2][0], fr[2][1] + th); ctx.lineTo(fr[1][0], fr[1][1] + th); ctx.fill();
  ctx.fillStyle = "#4e2f1c";
  ctx.beginPath(); ctx.moveTo(...fr[2]); ctx.lineTo(...fr[3]); ctx.lineTo(fr[3][0], fr[3][1] + th); ctx.lineTo(fr[2][0], fr[2][1] + th); ctx.fill();
  ctx.fillStyle = "#5c3a22";
  ctx.beginPath(); fr.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill();
  // tiles
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const [u, v] = tileUV(r, c), g = 0.05;
    const q = [P(u + g, v + g), P(u + 1 - g, v + g), P(u + 1 - g, v + 1 - g), P(u + g, v + 1 - g)];
    ctx.fillStyle = (r + c) % 2 ? LIGHT : DARK;
    ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill();
    // tiny bevel edge for the flat-with-depth look
    ctx.strokeStyle = (r + c) % 2 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"; ctx.lineWidth = a * 0.04;
    ctx.beginPath(); ctx.moveTo(...q[3]); ctx.lineTo(...q[0]); ctx.lineTo(...q[1]); ctx.stroke();
    const d = dim(r, c); if (d > 0) { ctx.fillStyle = `rgba(20,10,20,${d})`; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill(); }
    const gl = glow(r, c); if (gl > 0) { ctx.fillStyle = `rgba(255,205,90,${Math.min(1, gl)})`; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill(); }
  }
  ctx.restore();
}
function grain(ctx, x, y, s, rot = 0.3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(0.05, 0.12, 0.3, 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c98a1b"; ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2bd4c"; ctx.beginPath(); ctx.ellipse(-0.02, -0.03, 0.27, 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.ellipse(-0.1, -0.07, 0.08, 0.03, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
const glowDisc = (ctx, x, y, r, col, a) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.4, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
};

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const S = W / 1920, U = 100 * S;                 // 1 world unit = 100px at 1080p
  let CAM = { x: 0, y: 0, z: 1 };
  const setCam = (c, par = 1) => { CAM = c; const z = c.z * U; ctx.setTransform(z, 0, 0, z, W / 2 - c.x * par * z, H / 2 - c.y * par * z); };
  const screen = (x, y) => [(x - CAM.x) * CAM.z * U + W / 2, (y - CAM.y) * CAM.z * U + H / 2];
  const r0 = rng(42);
  const stars = Array.from({ length: 320 }, () => ({ x: r0() * 2 - 1, y: r0() * 2 - 1, s: 0.6 + r0() * 1.8, p: r0() * 6, d: 0.02 + r0() * 0.06 }));
  // film grain tiles
  const noise = [0, 1, 2].map((k) => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const id = g.createImageData(256, 256); const r = rng(k + 1); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; });
  // desk paper (marker write-on)
  const paperC = document.createElement("canvas"); paperC.width = 2048; paperC.height = 1152;
  const pg = paperC.getContext("2d");
  function drawPaper(st) {
    const g = pg, w = 2048, h = 1152;
    g.fillStyle = "#f5eddb"; g.fillRect(0, 0, w, h);
    const r = rng(9); g.globalAlpha = 0.06;
    for (let i = 0; i < 600; i++) { g.fillStyle = r() > 0.5 ? "#b8a27a" : "#fff"; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.globalAlpha = 1;
    const write = (text, y, size, k) => {
      if (k <= 0) return;
      g.save(); g.font = `${size}px Marker`; g.textAlign = "center";
      const tw = g.measureText(text).width, x0 = w / 2 - tw / 2;
      g.beginPath(); g.rect(x0 - 20, y - size, (tw + 40) * k, size * 1.4); g.clip();
      g.fillStyle = "rgba(30,36,51,0.15)"; g.fillText(text, w / 2 + 3, y + 3);
      g.fillStyle = "#1e2433"; g.fillText(text, w / 2, y);
      g.restore();
    };
    write("10 years of a little", 360, 150, st.l1); write(">", 640, 230, st.gt); write("30 years of a lot", 930, 150, st.l2);
    if (st.q > 0) {
      g.save(); g.translate(w / 2 + 10, 600); g.rotate(-0.12); g.scale(st.q, st.q);
      const rr = rng(4); g.fillStyle = "rgba(240,163,28,0.85)";
      for (let i = 0; i < 18; i++) { const an = rr() * 7, d = 170 + rr() * 150; g.beginPath(); g.arc(Math.cos(an) * d, Math.sin(an) * d * 0.8, 6 + rr() * 16, 0, 7); g.fill(); }
      g.font = "700 520px Fredoka"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 26; g.strokeStyle = "#7a4a00"; g.strokeText("?", 0, 20); g.fillStyle = "#f0a31c"; g.fillText("?", 0, 20);
      g.restore();
    }
  }

  // ════════ camera paths per shot ════════
  const camCosmic = camPath([
    { t: 0, x: 0, y: 2.9, z: 4.2 }, { t: 4.9, x: 0, y: 3.0, z: 4.8 }, { t: 12.0, x: 0, y: -1.2, z: 0.8 },
    { t: 17.2, x: 0, y: 9.3, z: 1.55 }, { t: 22.7, x: 0.2, y: 9.45, z: 1.8 }]);
  const camDesk = camPath([{ t: 22.7, x: 0.9, y: 0.2, z: 0.88 }, { t: 28.9, x: 0.7, y: 0.2, z: 0.94 }, { t: 31.6, x: 0.05, y: 0.1, z: 2.3 }]);
  const camPalace = camPath([
    { t: 31.5, x: 0.3, y: 0.6, z: 0.8 }, { t: 35.8, x: 0.2, y: 0.8, z: 0.88 }, { t: 37.3, x: 5.3, y: -2.3, z: 2.0 },
    { t: 39.8, x: 5.3, y: -2.2, z: 2.1 }, { t: 40.5, x: 0.3, y: 3.2, z: 1.1 }, { t: 45.5, x: 0.2, y: 3.3, z: 1.15 }]);
  const camBoard = camPath([{ t: 45.5, x: -1.35, y: 2.35, z: 3.1 }, { t: 51.4, x: -1.3, y: 2.35, z: 3.3 }, { t: 54.4, x: 0, y: 0.3, z: 0.95 }, { t: 59, x: 0, y: 0.2, z: 0.9 }]);

  // ════════ SCENE: COSMIC (B01 + B02) ════════
  function cosmic(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1330"); bg.addColorStop(0.55, "#1c1f4d"); bg.addColorStop(1, "#0a0d20");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const c = camCosmic(t);
    for (const [x, y, col, r] of [[0.2, 0.3, "90,60,160", 0.5], [0.8, 0.65, "40,110,140", 0.55], [0.55, 0.15, "150,70,130", 0.35]]) glowDisc(ctx, x * W, (y - c.y * 0.01) * H, r * W, col, 0.22);
    for (const s of stars) {
      const x = ((s.x * 0.5 + 0.5) * W - c.x * s.d * U) , y = (((s.y * 0.5 + 0.5) * H - c.y * s.d * U * 3) % H + H) % H;
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.3 + s.p);
      ctx.fillStyle = "#ffeec0"; ctx.beginPath(); ctx.arc(x, y, s.s * S, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    setCam(c);
    const a = 0.9;
    // board flies down into Wick's lap on B02
    const bk = easeInOut(seg(t, T.b02 + 0.4, T.b02 + 4.4));
    const PL = { x: 0, y: 16, r: 5 }, WICK = { x: 0, y: 11.05, s: 1.7 };
    const lap = { x: WICK.x, y: WICK.y - 0.42 * WICK.s };
    const bob = 0.12 * Math.sin(t * 0.6);
    const bx = lerp(0, lap.x, bk), by = lerp(bob, lap.y, bk) - Math.sin(bk * Math.PI) * 1.2, bs = lerp(1, 0.085, bk);
    // planet + Wick (drawn first so the board lands in front)
    if (t > T.b02 - 1) {
      ctx.fillStyle = "#557f66"; ctx.beginPath(); ctx.arc(PL.x, PL.y, PL.r, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(PL.x, PL.y, PL.r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "#3f6450"; ctx.beginPath(); ctx.arc(PL.x + 1.6, PL.y + 1.4, PL.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(190,240,200,0.35)"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(PL.x, PL.y, PL.r - 0.05, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
      const r = rng(5);
      for (let i = 0; i < 9; i++) {
        const an = -Math.PI / 2 + (r() - 0.5) * 2.2; if (Math.abs(an + Math.PI / 2) < 0.28) continue;
        const px = PL.x + Math.cos(an) * PL.r, py = PL.y + Math.sin(an) * PL.r;
        ctx.save(); ctx.translate(px, py); ctx.rotate(an + Math.PI / 2);
        if (i % 2) { ctx.fillStyle = "#6b4a30"; ctx.fillRect(-0.06, -0.55, 0.12, 0.55); ctx.fillStyle = "#6e9b58"; ctx.beginPath(); ctx.arc(0, -0.75, 0.35, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = "#9c917e"; ctx.beginPath(); ctx.ellipse(0, -0.08, 0.28, 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      const holding = t > T.b02 + 4.2, reach = t > T.b02 + 2.4;
      let expr = t > T.b02 + 4.4 ? "happy" : "curious"; if (t > T.when - 0.1) expr = "curious";
      drawWick(ctx, WICK.x, WICK.y, WICK.s, { t, pose: "sit", expr,
        arms: holding ? { L: [-0.46, -0.44], R: [0.46, -0.44] } : reach ? { L: [-0.7, -1.2], R: [0.7, -1.2] } : undefined });
    }
    // far square glow + beam (fades as the board flies)
    const far = easeInOut(seg(t, T.lastSquare, 11.5)) * (1 - seg(t, T.b02, T.b02 + 1.2));
    const [hx, hy] = tileCenter(7, 7, a);
    if (far > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const bm = ctx.createLinearGradient(0, hy - 14, 0, hy);
      bm.addColorStop(0, "rgba(255,190,80,0)"); bm.addColorStop(1, `rgba(255,200,100,${0.55 * far})`);
      ctx.fillStyle = bm; ctx.fillRect(bx + hx * bs - 0.8, by + hy * bs - 14, 1.6, 14);
      glowDisc(ctx, bx + hx * bs, by + hy * bs, 1 + far * 7, "255,180,70", 0.85 * far);
      glowDisc(ctx, bx + hx * bs, by + hy * bs - 3, 2 + far * 5, "255,210,120", 0.35 * far);
      ctx.restore();
    }
    drawBoard(ctx, bx, by, bs, a, (r, c) => (r === 7 && c === 7 ? far * 0.95 : r === 0 && c === 0 && t > T.grain + 0.5 ? 0.35 * (1 - seg(t, T.grain + 0.6, T.grain + 2.2)) : 0));
    // first grain on a1
    if (t > T.grain) {
      const [gx, gy] = tileCenter(0, 0, a);
      const gk = seg(t, T.grain, T.grain + 0.55);
      const drop = gk < 1 ? 3 * (1 - easeIn(gk)) : 0;
      const bounce = t > T.grain + 0.55 ? Math.abs(Math.sin((t - T.grain - 0.55) * 9)) * Math.exp(-(t - T.grain - 0.55) * 6) * 0.25 : 0;
      grain(ctx, bx + gx * bs, by + (gy - drop - bounce) * bs, 0.55 * bs, -0.35);
      const rk = seg(t, T.grain + 0.55, T.grain + 1.6);
      if (rk > 0 && rk < 1) { ctx.strokeStyle = `rgba(255,200,90,${(1 - rk) * 0.7})`; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.ellipse(bx + gx * bs, by + gy * bs, (0.2 + rk * 1.2) * bs, (0.1 + rk * 0.6) * bs, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    // calendar pages on "when"
    [25, 35].forEach((n, i) => {
      const k = seg(t, T.when - 0.1 + i * 0.75, T.when + 2.1 + i * 0.75);
      if (k <= 0 || k >= 1) return;
      ctx.save(); ctx.translate(lerp(5.5, -5.5, k), 9.0 + 0.35 * Math.sin(k * 9 + i) + i * 0.4);
      ctx.rotate(0.35 * Math.sin(k * 6 + i * 2)); ctx.scale(Math.cos(k * 7 + i) * 0.35 + 0.65, 1);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-0.55, -0.62, 1.2, 1.4);
      ctx.fillStyle = "#f6efe0"; ctx.fillRect(-0.6, -0.7, 1.2, 1.4);
      ctx.fillStyle = "#c7453b"; ctx.fillRect(-0.6, -0.7, 1.2, 0.34);
      ctx.scale(0.01, 0.01); ctx.textAlign = "center";
      ctx.fillStyle = "#fff"; ctx.font = "700 20px Fredoka"; ctx.fillText("AGE", 0, -46);
      ctx.fillStyle = "#20263a"; ctx.font = "700 72px Fredoka"; ctx.fillText(String(n), 0, 50);
      ctx.restore();
    });
  }

  // ════════ SCENE: DESK (B03) ════════
  function desk(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#3b2718"; ctx.fillRect(0, 0, W, H);
    const c = camDesk(t); setCam(c);
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.04;
    for (let y = -12; y < 12; y += 1.6) { ctx.beginPath(); ctx.moveTo(-30, y); ctx.lineTo(30, y); ctx.stroke(); }
    glowDisc(ctx, -2, -2, 12, "255,220,170", 0.18);
    drawPaper({ l1: easeOut(seg(t, ...T.line1)), gt: seg(t, ...T.gt), l2: easeOut(seg(t, ...T.line2)), q: t > T.stamp ? lerp(2.3, 1, pop(seg(t, T.stamp, T.stamp + 0.45))) : 0 });
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-6.25, -3.4, 12.8, 7.2);
    ctx.drawImage(paperC, -6.4, -3.6, 12.8, 7.2);
    // marker + one lonely coin (background gag)
    ctx.save(); ctx.translate(-8.2, 2.6); ctx.rotate(-0.5);
    ctx.fillStyle = "#20263a"; roundRectPath(ctx, -1.1, -0.18, 2.0, 0.36, 0.12, 0.12); ctx.fill();
    ctx.fillStyle = "#f0a31c"; roundRectPath(ctx, 0.85, -0.2, 0.6, 0.4, 0.14, 0.14); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#d9a53a"; ctx.beginPath(); ctx.ellipse(-8.3, -2.4, 0.55, 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.ellipse(-8.3, -2.47, 0.5, 0.27, 0, 0, Math.PI * 2); ctx.fill();
    const jump = t > T.stamp && t < T.stamp + 0.5 ? Math.sin(seg(t, T.stamp, T.stamp + 0.5) * Math.PI) * 0.6 : 0;
    const ex = t < T.stamp ? "curious" : t < T.stamp + 1.1 ? "alarmed" : "determined";
    drawWick(ctx, 8.1, 3.4 - jump, 1.45, { t, expr: ex, arms: t > T.stamp && t < T.stamp + 1.1 ? { L: [-0.85, -1.6], R: [0.85, -1.6] } : undefined });
  }

  // ════════ SCENE: PALACE (B05) + BOARD (B06) ════════
  function palaceBack(c) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#2a1a30"; ctx.fillRect(0, 0, W, H);
    setCam(c);
    ctx.fillStyle = "#3a2442"; ctx.fillRect(-30, -14, 60, 16);                         // back wall
    ctx.fillStyle = "#6f4a33"; ctx.fillRect(-30, 2, 60, 20);                            // floor
    ctx.strokeStyle = "#5a3a28"; ctx.lineWidth = 0.05;
    for (let i = 0; i < 9; i++) { const y = 2 + Math.pow(i / 8, 1.8) * 14; ctx.beginPath(); ctx.moveTo(-30, y); ctx.lineTo(30, y); ctx.stroke(); }
    for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * 1.4, 2); ctx.lineTo(i * 4.2, 16); ctx.stroke(); }
    for (const x of [-8, 0, 8]) {                                                      // windows
      ctx.fillStyle = "#e6d6b6"; roundRectPath(ctx, x - 1.55, -7.3, 3.1, 5.9, 1.55, 0.1); ctx.fill();
      ctx.fillStyle = "#141c44"; roundRectPath(ctx, x - 1.3, -7.05, 2.6, 5.5, 1.3, 0.05); ctx.fill();
      const r = rng(x + 20); ctx.fillStyle = "#ffe9b0";
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 2.2, -6.5 + r() * 4.8, 0.035 + r() * 0.03, 0, 7); ctx.fill(); }
    }
    for (const x of [-11.5, -4.2, 4.2, 11.5]) {                                        // pillars
      ctx.fillStyle = "#e6d6b6"; ctx.fillRect(x - 0.6, -14, 1.2, 16.2);
      ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(x + 0.2, -14, 0.4, 16.2);
      ctx.fillStyle = "#d8c6a2"; ctx.fillRect(x - 0.85, 1.6, 1.7, 0.6);
    }
    // carpet
    ctx.fillStyle = "#e0a82e"; ctx.beginPath(); ctx.moveTo(-1.5, 2); ctx.lineTo(1.5, 2); ctx.lineTo(3.9, 16); ctx.lineTo(-3.9, 16); ctx.fill();
    ctx.fillStyle = "#9a2c38"; ctx.beginPath(); ctx.moveTo(-1.3, 2); ctx.lineTo(1.3, 2); ctx.lineTo(3.5, 16); ctx.lineTo(-3.5, 16); ctx.fill();
    // lamps
    for (const x of [-6.2, 6.2]) {
      ctx.strokeStyle = "#222"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x, -4.9); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDisc(ctx, x, -4.5, 4.5, "255,170,70", 0.4); ctx.restore();
      ctx.fillStyle = "#ffd28a"; ctx.beginPath(); ctx.arc(x, -4.5, 0.42, 0, Math.PI * 2); ctx.fill();
    }
  }
  function throne() {
    ctx.fillStyle = "#4c3a58"; roundRectPath(ctx, 2.6, 1.3, 5.4, 1.0, 0.15, 0.1); ctx.fill();
    ctx.fillStyle = "#c9952c"; roundRectPath(ctx, 4.0, -6.1, 2.6, 7.0, 1.2, 0.1); ctx.fill();
    ctx.fillStyle = "#e0ad3c"; roundRectPath(ctx, 4.25, -5.8, 2.1, 6.5, 1.0, 0.1); ctx.fill();
    ctx.fillStyle = "#c9952c"; roundRectPath(ctx, 3.7, 0.2, 3.2, 1.2, 0.15, 0.1); ctx.fill();
    ctx.fillStyle = "#9a2c38"; roundRectPath(ctx, 3.85, -0.1, 2.9, 0.45, 0.2, 0.2); ctx.fill();
  }
  function stand(x, y) {
    ctx.fillStyle = "#4a2f1e"; ctx.beginPath(); ctx.moveTo(x - 0.35, y - 1.4); ctx.lineTo(x + 0.35, y - 1.4); ctx.lineTo(x + 0.6, y); ctx.lineTo(x - 0.6, y); ctx.fill();
    ctx.fillStyle = "#e0a82e"; ctx.beginPath(); ctx.ellipse(x, y - 1.45, 1.25, 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4630"; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 1.18, 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  function gifts(t) {
    const away = easeIn(seg(t, T.waves + 0.2, T.waves + 1.2));
    const items = [[-0.4, 6.5, T.gold, -1, "chest"], [1.7, 6.8, T.land, -1, "map"], [3.8, 6.4, T.palace, 1, "toy"]];
    for (const [x, y, t0, dir, kind] of items) {
      if (t < t0 || away >= 1) continue;
      const k = pop(seg(t, t0, t0 + 0.5)) * (1 - away * 0.6);
      ctx.save(); ctx.translate(x + dir * away * 6, y); ctx.scale(k * 1.3, k * 1.3);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 0.8, 0.14, 0, 0, Math.PI * 2); ctx.fill();
      if (kind === "chest") {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDisc(ctx, 0, -0.9, 1.4, "255,190,60", 0.5); ctx.restore();
        ctx.fillStyle = "#7b4b2a"; roundRectPath(ctx, -0.6, -0.75, 1.2, 0.75, 0.08, 0.08); ctx.fill();
        ctx.fillStyle = "#f2c14e"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(-0.45 + i * 0.11, -0.8 - (i % 3) * 0.07, 0.12, 0.07, 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = "#8a5632"; ctx.save(); ctx.translate(0, -0.95); ctx.rotate(-0.25); roundRectPath(ctx, -0.62, -0.35, 1.24, 0.35, 0.2, 0.02); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#d9a53a"; ctx.fillRect(-0.4, -0.75, 0.1, 0.75); ctx.fillRect(0.3, -0.75, 0.1, 0.75);
      } else if (kind === "map") {
        ctx.fillStyle = "#efe3c4"; ctx.save(); ctx.transform(1, 0, -0.3, 0.7, 0, 0); ctx.fillRect(-0.6, -0.9, 1.2, 0.9);
        const gr = ["#7fa35a", "#9bb86a", "#c7b25a", "#6d9150"];
        for (let i = 0; i < 9; i++) { ctx.fillStyle = gr[i % 4]; ctx.fillRect(-0.52 + (i % 3) * 0.36, -0.82 + Math.floor(i / 3) * 0.27, 0.32, 0.23); }
        ctx.restore();
        ctx.fillStyle = "#e3d5b0"; roundRectPath(ctx, -0.75, -0.2, 1.1, 0.2, 0.1, 0.1); ctx.fill();
      } else {
        ctx.fillStyle = "#e7b7b0"; roundRectPath(ctx, -0.6, -0.6, 1.2, 0.6, 0.06, 0.04); ctx.fill();
        for (const [tx, th] of [[-0.45, 1.2], [0.45, 1.2], [0, 1.5]]) {
          ctx.fillStyle = "#f0d2c8"; ctx.fillRect(tx - 0.14, -th, 0.28, th);
          ctx.fillStyle = "#3e8c8a"; ctx.beginPath(); ctx.moveTo(tx - 0.2, -th); ctx.lineTo(tx + 0.2, -th); ctx.lineTo(tx, -th - 0.42); ctx.fill();
        }
        ctx.fillStyle = "#d9a53a"; ctx.beginPath(); ctx.arc(0, -0.6, 0.22, Math.PI, 0); ctx.fill();
      }
      ctx.restore();
    }
  }
  function palace(t) {
    const c = camPalace(t);
    palaceBack(c);
    throne();
    const loveK = seg(t, T.loves, T.loves + 0.6) * (1 - seg(t, T.loves + 3.6, T.loves + 4.4));
    let kE = "calm"; if (t > T.chess + 0.6) kE = "curious"; if (t > T.loves) kE = "happy"; if (t > T.waves + 0.3) kE = "curious";
    const present = seg(t, T.gold - 0.4, T.gold) * (1 - seg(t, T.waves, T.waves + 0.6));
    drawWick(ctx, 5.3, 0.72, 2.3, { t, pose: "throne", costume: "king", expr: kE, flare: loveK, opts: { wax: "#e9d7b6", seed: 9, bodyScale: 1.25 },
      arms: { L: [-0.85, -0.3], R: [lerp(0.85, 1.05, present), lerp(-0.3, -0.9, present)] } });
    stand(-1.3, 5.9);
    // Wick presents the board, it hops onto the stand, he waves the gifts away
    let wE = "calm"; if (t > T.chess) wE = "proud"; if (t > T.gold - 0.2) wE = "curious"; if (t > T.waves) wE = "calm";
    const lift = seg(t, T.loves, T.loves + 0.8) * (1 - seg(t, T.waves - 0.6, T.waves - 0.3));
    const holding = t > T.chess && t < T.waves - 0.3;
    const arms = holding ? { L: [-0.42, lerp(-0.75, -1.05, lift)], R: [0.42, lerp(-0.75, -1.05, lift)] }
      : t > T.waves && t < T.waves + 1.9 ? { R: [0.75 + 0.12 * Math.sin(t * 14), -1.55 + 0.08 * Math.cos(t * 14)] } : undefined;
    const WX = -4.4, WY = 6.2, WS = 2.0;
    drawWick(ctx, WX, WY, WS, { t, expr: wE, costume: "tunic", arms });
    if (t > T.chess) {
      const hk = easeInOut(seg(t, T.waves - 0.3, T.waves + 0.35));
      const hx = WX, hy = WY + lerp(-0.8, -1.1, lift) * WS;
      const x = lerp(hx, -1.3, hk), y = lerp(hy, 5.9 - 1.55, hk) - Math.sin(hk * Math.PI) * 1.0;
      drawBoard(ctx, x, y, 0.13 * pop(seg(t, T.chess, T.chess + 0.5)), 0.9);
    }
    gifts(t);
  }
  function board(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.7);
    bg.addColorStop(0, "#7a4d33"); bg.addColorStop(1, "#2a1712"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const c = camBoard(t); setCam(c);
    const a = 0.9;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 0.9, 9.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    const dim = seg(t, T.asks, T.asks + 0.8) * (1 - seg(t, T.ripple[0], T.ripple[0] + 1));
    drawBoard(ctx, 0, 0, 1, a,
      (r, c) => {
        let e = 0;
        if (r === 0 && c < 4 && t > T.sq[c]) e = 0.35 * (1 - seg(t, T.sq[c] + 0.2, T.sq[c] + 1.4));
        const d = Math.hypot(r, c);
        const w = t > T.ripple[0] ? Math.max(0, 1 - Math.abs((t - T.ripple[0]) - d * 0.12) * 3.2) : 0;
        return e + w * 0.85 + seg(t, T.ripple[0] + 1.2, T.ripple[1] + 0.6) * 0.12;
      },
      (r, c) => (r === 0 && c < 4 ? 0 : dim * 0.5));
    const rg = rng(12);
    [1, 2, 4, 8].forEach((n, col) => {
      const [cx, cy] = tileCenter(0, col, a);
      for (let j = 0; j < n; j++) {
        const t0 = T.sq[col] + j * 0.06, an = rg() * 7, d = n === 1 ? 0 : 0.08 + rg() * 0.2;
        if (t < t0) continue;
        const k = pop(seg(t, t0, t0 + 0.35));
        grain(ctx, cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.5 - (1 - Math.min(1, k)) * 0.4, 0.28 * k, rg() * 3);
      }
    });
    // Wick watching from the edge when the camera pulls back
    drawWick(ctx, -8.6, 3.2, 1.9, { t, expr: t > T.sq[3] ? "happy" : "calm" });
    return a;
  }

  // ════════ 2D overlays ════════
  function caption(text, t, t0, t1, y = 0.86, size = 60) {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.25) * (1 - seg(t, t1 - 0.3, t1)), s = lerp(0.85, 1, pop(seg(t, t0, t0 + 0.45)));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * y); ctx.scale(s, s);
    ctx.font = `700 ${size * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 18 * S; ctx.shadowOffsetY = 4 * S;
    ctx.fillStyle = "#fff4dc"; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function chapter(text, t, t0, t1) {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.4) * (1 - seg(t, t1 - 0.4, t1)), sl = easeOut(seg(t, t0, t0 + 0.5));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f0a31c"; ctx.fillRect(70 * S, 78 * S, 8 * S, 46 * S);
    ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10 * S; ctx.fillText(text, (92 - 20 * (1 - sl)) * S, 102 * S); ctx.restore();
  }
  function counts(t, a) {
    [1, 2, 4, 8].forEach((n, col) => {
      const t0 = T.sq[col]; if (t < t0 + 0.05) return;
      const [x, y] = tileCenter(0, col, a), [sx, sy] = screen(x, y - 0.55);
      const k = pop(seg(t, t0 + 0.05, t0 + 0.5)), fade = 1 - seg(t, T.ripple[0] + 0.4, T.ripple[0] + 1.2);
      ctx.save(); ctx.globalAlpha = Math.min(1, k) * fade; ctx.translate(sx, sy - 20 * S * k); ctx.scale(k, k);
      ctx.font = `700 ${64 * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 10 * S; ctx.strokeStyle = "#3a2106"; ctx.strokeText(String(n), 0, 0); ctx.fillStyle = "#ffc94a"; ctx.fillText(String(n), 0, 0);
      ctx.restore();
    });
  }
  function iris(t) {
    const [a, b, c] = T.iris; if (t < a || t > c) return;
    const maxR = Math.hypot(W, H) / 2, r = t < b ? maxR * (1 - easeIn(seg(t, a, b))) : maxR * easeOut(seg(t, b + 0.05, c));
    ctx.save(); ctx.fillStyle = "#07060a"; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill(); ctx.restore();
  }
  function title(t) {
    if (t < T.title) return;
    const k = easeOut(seg(t, T.title, T.title + 0.9));
    ctx.save();
    const grd = ctx.createLinearGradient(0, H * 0.3, 0, H); grd.addColorStop(0, "rgba(10,8,14,0)"); grd.addColorStop(1, `rgba(10,8,14,${0.82 * k})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20 * S;
    ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#f0a31c"; ctx.fillText("WICK'S WISDOM  ·  EPISODE 1", W / 2, H * 0.66 + (1 - k) * 20 * S);
    ctx.font = `700 ${84 * S}px Fredoka`; ctx.fillStyle = "#fff4dc";
    ctx.fillText("The Chessboard That", W / 2, H * 0.755 + (1 - k) * 30 * S); ctx.fillText("Bankrupted a King", W / 2, H * 0.845 + (1 - k) * 40 * S);
    ctx.restore();
  }
  function finish(t) {
    // Dalio-style texture: grain + vignette over everything
    ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = "overlay";
    const n = noise[Math.floor(t * 12) % 3]; const p = ctx.createPattern(n, "repeat"); ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function renderAt(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    let a = 0.9;
    if (t < T.toDesk[0] + 0.45) cosmic(t);
    else if (t < T.iris[1]) desk(t);
    else if (t < T.asks) palace(t);
    else a = board(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(t);
    caption("1 grain", t, T.grain + 0.7, T.lastSquare - 0.1);
    caption("Square 64: ~1,000 years of the world's wheat", t, T.wheat + 0.2, 12.4, 0.86, 52);
    caption("It cares about when.", t, T.when + 0.15, T.toDesk[0] + 0.2);
    chapter("THE INVENTOR'S PRICE", t, 32.3, 36.2);
    if (t >= T.asks) counts(t, a);
    const seq = t > T.sq[3] ? "1, 2, 4, 8..." : t > T.sq[2] ? "1, 2, 4" : t > T.sq[1] ? "1, 2" : t > T.sq[0] ? "1" : "";
    if (seq) caption(seq, t, T.sq[0], T.title - 0.1, 0.9, 56);
    iris(t); title(t);
    if (t < T.fadeOut[0]) { ctx.save(); ctx.globalAlpha = 0.45; ctx.font = `600 ${22 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.textAlign = "right"; ctx.fillText("WICK'S WISDOM", W - 40 * S, H - 36 * S); ctx.restore(); }
    const fade = Math.max(seg(t, T.toDesk[0], T.toDesk[0] + 0.45) * (1 - seg(t, T.toDesk[0] + 0.45, T.toDesk[1])), seg(t, ...T.fadeOut), 1 - seg(t, 0, 0.8));
    if (fade > 0) { ctx.globalAlpha = fade; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  return { duration: DURATION, fps: 30, out, renderAt };
}
