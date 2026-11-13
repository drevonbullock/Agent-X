// KING-30 — 30s parable test. Painted 2D, plain Canvas. Wick plays every role:
// the inventor (plain Wick) and the king (crown, cape, ermine).
// Beat times = VO (ElevenLabs "Alex", sped 1.06x) + 0.3s offset.
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, pop, rng, camPath } from "../../lib2d/ease.js";
import { drawWickHD, flameLight } from "../../lib2d/wickHD.js";

export const DURATION = 30.5;
const T = {
  walk: [0.2, 3.1], chess: 4.1, bow: [4.2, 4.9], present: [4.9, 5.9],
  loves: 6.2, reward: 9.15, gold: 11.45, land: 11.9, palace: 12.35,
  smiled: 13.45, grain: 15.2, board: 15.95,
  sq: [16.3, 18.3, 19.7], double: 21.8, laughed: 23.05, noIdea: 25.9, pile: [25.9, 29.2],
  crown: 28.0, title: 29.25, fade: [30.05, 30.5],
};
const SHOTS = [
  { t0: 0, t1: 5.9, set: "hall", cam: camPath([{ t: 0, x: 0.2, y: -1.25, z: 1.34 }, { t: 5.9, x: 0.55, y: -1.2, z: 1.5 }]) },
  { t0: 5.9, t1: 10.95, set: "hall", cam: camPath([{ t: 5.9, x: 3.05, y: -1.45, z: 2.55 }, { t: 10.95, x: 3.0, y: -1.5, z: 2.8 }]) },
  { t0: 10.95, t1: 13.25, set: "hall", cam: camPath([{ t: 10.95, x: 1.0, y: -1.1, z: 1.9 }, { t: 13.25, x: 1.0, y: -1.1, z: 2.0 }]) },
  { t0: 13.25, t1: 15.95, set: "hall", cam: camPath([{ t: 13.25, x: -0.95, y: -0.35, z: 3.15 }, { t: 15.95, x: -0.95, y: -0.45, z: 3.45 }]) },
  { t0: 15.95, t1: 22.75, set: "board", cam: camPath([{ t: 15.95, x: -0.95, y: 2.35, z: 1.85 }, { t: 21.4, x: -0.9, y: 2.3, z: 2.0 }, { t: 22.75, x: 0, y: 0.6, z: 1.1 }]) },
  { t0: 22.75, t1: 25.55, set: "hall", cam: camPath([{ t: 22.75, x: 1.3, y: -1.3, z: 1.85 }, { t: 25.55, x: 1.3, y: -1.35, z: 1.95 }]) },
  { t0: 25.55, t1: 99, set: "hall", cam: camPath([{ t: 25.55, x: 1.0, y: -1.8, z: 1.75 }, { t: 29.3, x: 0.9, y: -2.7, z: 1.18 }, { t: 30.5, x: 0.9, y: -2.8, z: 1.12 }]) },
];

// ── painted helpers ─────────────────────────────────────────────────────────
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; }
function rad(ctx, x, y, r, stops) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; }
function glow(ctx, x, y, r, rgb, a) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rad(ctx, x, y, r, [[0, `rgba(${rgb},${a})`], [0.4, `rgba(${rgb},${a * 0.35})`], [1, `rgba(${rgb},0)`]]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
function sparkle(ctx, x, y, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.fillStyle = "#fff4c2";
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
  ctx.restore();
}
function grain(ctx, x, y, s, rot = 0.3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = "rgba(40,20,0,0.35)"; ctx.beginPath(); ctx.ellipse(0.04, 0.1, 0.28, 0.09, 0, 0, 7); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -0.17, 0, 0.17, [[0, "#ffe08a"], [0.5, "#f0b440"], [1, "#b8791a"]]);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.16, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(150,90,10,0.6)"; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.22, 0.01); ctx.quadraticCurveTo(0, 0.05, 0.22, 0.01); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(-0.1, -0.07, 0.08, 0.028, -0.1, 0, 7); ctx.fill();
  ctx.restore();
}
// isometric board, painted. a = half tile width. a1 (r0,c0) at the near corner.
function tileUV(r, c) { return [7 - c, 7 - r]; }
function iso(u, v, a) { return [(u - v) * a, (u + v) * a * 0.5 - 4 * a]; }
function tileCenter(r, c, a) { const [u, v] = tileUV(r, c); return iso(u + 0.5, v + 0.5, a); }
function drawBoard(ctx, x, y, a, glowFn = () => 0) {
  ctx.save(); ctx.translate(x, y);
  const P = (u, v) => iso(u, v, a), th = a * 0.55, m = 0.4;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, th + a * 0.8, 9.2 * a, 4.4 * a, 0, 0, 7); ctx.fill();
  const fr = [P(-m, -m), P(8 + m, -m), P(8 + m, 8 + m), P(-m, 8 + m)];
  ctx.fillStyle = lin(ctx, fr[1][0], 0, fr[2][0], 0, [[0, "#3a2213"], [1, "#2a170c"]]);
  ctx.beginPath(); ctx.moveTo(...fr[1]); ctx.lineTo(...fr[2]); ctx.lineTo(fr[2][0], fr[2][1] + th); ctx.lineTo(fr[1][0], fr[1][1] + th); ctx.fill();
  ctx.fillStyle = lin(ctx, fr[3][0], 0, fr[2][0], 0, [[0, "#5a361d"], [1, "#46291a"]]);
  ctx.beginPath(); ctx.moveTo(...fr[2]); ctx.lineTo(...fr[3]); ctx.lineTo(fr[3][0], fr[3][1] + th); ctx.lineTo(fr[2][0], fr[2][1] + th); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, fr[0][1], 0, fr[2][1], [[0, "#8a5a33"], [1, "#6a4125"]]);
  ctx.beginPath(); fr.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const [u, v] = tileUV(r, c), g = 0.04;
    const q = [P(u + g, v + g), P(u + 1 - g, v + g), P(u + 1 - g, v + 1 - g), P(u + g, v + 1 - g)];
    const light = (r + c) % 2 === 1;
    ctx.fillStyle = lin(ctx, q[0][0], q[0][1], q[2][0], q[2][1], light ? [[0, "#f6e5bf"], [1, "#dcc394"]] : [[0, "#8a5e3c"], [1, "#6c4428"]]);
    ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill();
    ctx.strokeStyle = light ? "rgba(255,255,255,0.45)" : "rgba(255,230,200,0.15)"; ctx.lineWidth = a * 0.05;
    ctx.beginPath(); ctx.moveTo(...q[3]); ctx.lineTo(...q[0]); ctx.lineTo(...q[1]); ctx.stroke();
    const gl = glowFn(r, c);
    if (gl > 0) { ctx.fillStyle = `rgba(255,200,80,${Math.min(0.95, gl)})`; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill(); }
  }
  ctx.restore();
}

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const S = W / 1920, U = 100 * S;
  let CAM = { x: 0, y: 0, z: 1 };
  const setCam = (c) => { CAM = c; const z = c.z * U; ctx.setTransform(z, 0, 0, z, W / 2 - c.x * z, H / 2 - c.y * z); };
  const toScreen = (x, y) => [(x - CAM.x) * CAM.z * U + W / 2, (y - CAM.y) * CAM.z * U + H / 2];

  // ── painted throne hall, rendered once, softly blurred (depth of field) ──
  const PX = 110, BX0 = -12, BY0 = -9, BW = 24, BH = 16;
  const hall = document.createElement("canvas"); hall.width = BW * PX; hall.height = BH * PX;
  {
    const raw = document.createElement("canvas"); raw.width = hall.width; raw.height = hall.height;
    const g = raw.getContext("2d");
    g.setTransform(PX, 0, 0, PX, -BX0 * PX, -BY0 * PX);
    // back wall
    g.fillStyle = lin(g, 0, -9, 0, -0.6, [[0, "#1d0f16"], [0.55, "#3e2020"], [1, "#6a3b25"]]); g.fillRect(-12, -9, 24, 8.4);
    // stone block hints
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 0.03;
    for (let y = -8.4; y < -0.6; y += 0.7) { g.beginPath(); g.moveTo(-12, y); g.lineTo(12, y); g.stroke(); for (let x = -12 + ((y * 10) % 2 ? 0 : 0.7); x < 12; x += 1.4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 0.7); g.stroke(); } }
    // windows with night sky and a moon
    for (const x of [-6.2, 0.2, 6.6]) {
      g.fillStyle = "#6e5038"; rr(g, x - 1.45, -7.3, 2.9, 5.2, [1.45, 1.45, 0.1, 0.1]); g.fill();
      g.fillStyle = lin(g, 0, -7, 0, -2.3, [[0, "#0b1433"], [1, "#2b3a6e"]]); rr(g, x - 1.2, -7.05, 2.4, 4.8, [1.2, 1.2, 0.05, 0.05]); g.fill();
      const r = rng(x * 7 + 3); g.fillStyle = "#ffeec0";
      for (let i = 0; i < 14; i++) { g.globalAlpha = 0.5 + r() * 0.5; g.beginPath(); g.arc(x + (r() - 0.5) * 2.1, -6.6 + r() * 4, 0.02 + r() * 0.03, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = "#5a3f2b"; g.lineWidth = 0.08; g.beginPath(); g.moveTo(x, -7.05); g.lineTo(x, -2.25); g.moveTo(x - 1.2, -4.6); g.lineTo(x + 1.2, -4.6); g.stroke();
      g.fillStyle = "#8a6a4e"; g.fillRect(x - 1.6, -2.3, 3.2, 0.22);
    }
    g.fillStyle = "#f6edd0"; g.beginPath(); g.arc(0.7, -5.9, 0.34, 0, 7); g.fill();
    g.fillStyle = "#22305f"; g.beginPath(); g.arc(0.83, -5.98, 0.3, 0, 7); g.fill();
    // banners with a golden flame emblem
    for (const x of [-3.1, 3.5]) {
      g.fillStyle = lin(g, x - 0.6, 0, x + 0.6, 0, [[0, "#5e0f1c"], [0.45, "#a3243a"], [1, "#4f0c17"]]);
      g.beginPath(); g.moveTo(x - 0.6, -7.6); g.lineTo(x + 0.6, -7.6); g.lineTo(x + 0.6, -4.2); g.lineTo(x, -3.7); g.lineTo(x - 0.6, -4.2); g.closePath(); g.fill();
      g.strokeStyle = "#e0ab3a"; g.lineWidth = 0.05; g.stroke();
      g.fillStyle = "#f2b72e"; g.beginPath(); g.moveTo(x - 0.05, -6.5); g.quadraticCurveTo(x + 0.35, -5.9, x + 0.25, -5.55); g.quadraticCurveTo(x, -5.2, x - 0.25, -5.55); g.quadraticCurveTo(x - 0.35, -5.9, x - 0.05, -6.5); g.fill();
      g.fillStyle = "#3a2210"; g.fillRect(x - 0.75, -7.75, 1.5, 0.12);
    }
    // pillars
    for (const x of [-9.4, 9.8]) {
      g.fillStyle = lin(g, x - 0.55, 0, x + 0.55, 0, [[0, "#5a3e2a"], [0.35, "#b48e64"], [0.6, "#9a7652"], [1, "#4a3222"]]); g.fillRect(x - 0.55, -9, 1.1, 8.5);
      g.fillStyle = "#6e5038"; g.fillRect(x - 0.75, -1.0, 1.5, 0.45);
    }
    // wall sconces
    for (const x of [-4.7, 5.1]) {
      g.fillStyle = "#3a2618"; rr(g, x - 0.12, -3.6, 0.24, 0.5, 0.05); g.fill();
      g.fillStyle = "#efe0bd"; rr(g, x - 0.09, -3.95, 0.18, 0.38, 0.04); g.fill();
      g.save(); g.globalCompositeOperation = "lighter";
      g.fillStyle = rad(g, x, -4.1, 2.6, [[0, "rgba(255,170,70,0.45)"], [0.3, "rgba(255,150,50,0.15)"], [1, "rgba(255,150,50,0)"]]); g.beginPath(); g.arc(x, -4.1, 2.6, 0, 7); g.fill();
      g.restore();
      g.fillStyle = "#ffcf5a"; g.beginPath(); g.ellipse(x, -4.08, 0.07, 0.13, 0, 0, 7); g.fill();
    }
    // floor with perspective tiles
    g.fillStyle = lin(g, 0, -0.6, 0, 7, [[0, "#5a3524"], [0.5, "#3a2016"], [1, "#1e100a"]]); g.fillRect(-12, -0.6, 24, 7.6);
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.025;
    for (let i = 0; i < 10; i++) { const y = -0.6 + Math.pow(i / 9, 1.7) * 7.6; g.beginPath(); g.moveTo(-12, y); g.lineTo(12, y); g.stroke(); }
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(i * 0.9, -0.6); g.lineTo(i * 2.6, 7); g.stroke(); }
    // dais + carpet
    g.fillStyle = lin(g, 0, -0.6, 0, 0.55, [[0, "#4a2d3a"], [1, "#2e1a24"]]); rr(g, 1.3, -0.75, 4.1, 1.25, 0.12); g.fill();
    g.fillStyle = "rgba(255,210,150,0.12)"; g.fillRect(1.4, -0.72, 3.9, 0.08);
    g.fillStyle = "#c9912a"; g.beginPath(); g.moveTo(2.15, 0.5); g.lineTo(4.45, 0.5); g.lineTo(6.2, 7); g.lineTo(0.6, 7); g.fill();
    g.fillStyle = lin(g, 0, 0.5, 0, 7, [[0, "#8e2233"], [1, "#5e1220"]]); g.beginPath(); g.moveTo(2.3, 0.5); g.lineTo(4.3, 0.5); g.lineTo(5.95, 7); g.lineTo(0.85, 7); g.fill();
    // throne
    g.fillStyle = lin(g, 2.05, 0, 4.35, 0, [[0, "#8a5e14"], [0.3, "#f2c24e"], [0.55, "#d9a032"], [1, "#7a4f0e"]]);
    rr(g, 2.05, -4.3, 2.3, 4.2, [1.15, 1.15, 0.1, 0.1]); g.fill();
    g.fillStyle = lin(g, 0, -4, 0, -0.3, [[0, "#9e1f31"], [1, "#6a1020"]]); rr(g, 2.35, -3.9, 1.7, 3.5, [0.85, 0.85, 0.05, 0.05]); g.fill();
    g.fillStyle = lin(g, 1.9, 0, 4.5, 0, [[0, "#8a5e14"], [0.35, "#f2c24e"], [1, "#7a4f0e"]]); rr(g, 1.9, -0.35, 2.6, 0.6, 0.1); g.fill();
    g.fillStyle = "#fff1b0"; for (const x of [2.2, 4.2]) { g.beginPath(); g.arc(x, -4.1, 0.13, 0, 7); g.fill(); }
    // blur a touch for depth
    const hg = hall.getContext("2d"); hg.filter = "blur(2px)"; hg.drawImage(raw, 0, 0);
  }
  // wooden table for the board close-up
  const table = document.createElement("canvas"); table.width = 2000; table.height = 1200;
  {
    const g = table.getContext("2d");
    g.fillStyle = lin(g, 0, 0, 0, 1200, [[0, "#5a3620"], [1, "#2a160c"]]); g.fillRect(0, 0, 2000, 1200);
    const r = rng(21); g.globalAlpha = 0.18;
    for (let i = 0; i < 140; i++) { g.strokeStyle = r() > 0.5 ? "#2a150a" : "#8a5a36"; g.lineWidth = 1 + r() * 3; const y = r() * 1200; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(600, y + (r() - 0.5) * 40, 1400, y + (r() - 0.5) * 40, 2000, y + (r() - 0.5) * 30); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = rad(g, 1000, 520, 900, [[0, "rgba(255,190,110,0.35)"], [1, "rgba(0,0,0,0)"]]); g.fillRect(0, 0, 2000, 1200);
  }
  // grain pile specks (for the ending)
  const pileSpecks = (() => { const r = rng(77); return Array.from({ length: 420 }, () => { const a = r() * Math.PI, d = Math.sqrt(r()); return { x: Math.cos(a) * d, y: -Math.sin(a) * d, rot: r() * 3, s: 0.6 + r() * 0.6 }; }); })();
  const noise = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const id = g.createImageData(256, 256); const r = rng(5); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; })();

  // ── characters ──
  const KING = { x: 3.2, y: 0.28, s: 1.05 };
  const INV = { y: 1.3, s: 1.0 };
  const STAND = { x: 0.9, y: 1.02 };
  function invX(t) { return lerp(-7.9, -1.05, easeOut(seg(t, ...T.walk))); }

  function drawGifts(t, cam) {
    const away = easeIn(seg(t, T.smiled - 0.1, T.smiled + 0.5));
    const items = [["chest", -0.05, 1.3, T.gold], ["map", 0.95, 1.55, T.land], ["palace", 1.85, 1.2, T.palace]];
    for (const [kind, x, y, t0] of items) {
      if (t < t0 || away >= 1) continue;
      const k = pop(seg(t, t0, t0 + 0.45)) * (1 - away);
      ctx.save(); ctx.translate(x + (kind === "palace" ? 1 : -1) * away * 4, y); ctx.scale(k, k);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.1, 0, 0, 7); ctx.fill();
      if (kind === "chest") {
        glow(ctx, 0, -0.55, 1.1, "255,190,60", 0.55);
        ctx.fillStyle = lin(ctx, -0.45, 0, 0.45, 0, [[0, "#4a2a14"], [0.4, "#8a5630"], [1, "#3e2210"]]); rr(ctx, -0.45, -0.55, 0.9, 0.55, 0.06); ctx.fill();
        ctx.fillStyle = "#f5c84e"; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(-0.35 + i * 0.08, -0.6 - (i % 3) * 0.05, 0.09, 0.05, 0, 0, 7); ctx.fill(); }
        ctx.save(); ctx.translate(0, -0.66); ctx.rotate(-0.35); ctx.fillStyle = lin(ctx, -0.45, 0, 0.45, 0, [[0, "#5a3218"], [0.4, "#9a6038"], [1, "#4a2812"]]); rr(ctx, -0.46, -0.28, 0.92, 0.28, [0.14, 0.14, 0.02, 0.02]); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#e0ab3a"; ctx.fillRect(-0.3, -0.55, 0.07, 0.55); ctx.fillRect(0.23, -0.55, 0.07, 0.55);
        for (let i = 0; i < 3; i++) sparkle(ctx, -0.3 + i * 0.3, -0.95 - (i % 2) * 0.15, 0.08, 0.5 + 0.5 * Math.sin(t * 6 + i * 2));
      } else if (kind === "map") {
        ctx.save(); ctx.transform(1, 0, -0.35, 0.62, 0, 0);
        ctx.fillStyle = "#efe0bc"; ctx.fillRect(-0.5, -0.75, 1.0, 0.75);
        const gr = ["#7fa35a", "#9bb86a", "#c7b25a", "#6d9150"];
        for (let i = 0; i < 9; i++) { ctx.fillStyle = gr[i % 4]; ctx.fillRect(-0.44 + (i % 3) * 0.3, -0.69 + Math.floor(i / 3) * 0.23, 0.27, 0.2); }
        ctx.strokeStyle = "#5a86a8"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.5, -0.3); ctx.quadraticCurveTo(0, -0.5, 0.5, -0.2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = lin(ctx, 0, -0.18, 0, 0, [[0, "#f7ead0"], [1, "#c9b48a"]]); rr(ctx, -0.62, -0.18, 1.0, 0.18, 0.09); ctx.fill();
      } else {
        ctx.fillStyle = lin(ctx, -0.5, 0, 0.5, 0, [[0, "#c98f88"], [0.4, "#f0c0b8"], [1, "#b57c76"]]); rr(ctx, -0.5, -0.45, 1.0, 0.45, 0.04); ctx.fill();
        for (const [tx, th] of [[-0.38, 0.95], [0.38, 0.95], [0, 1.2]]) {
          ctx.fillStyle = lin(ctx, tx - 0.12, 0, tx + 0.12, 0, [[0, "#d9aea6"], [0.5, "#fbe0d8"], [1, "#c8958d"]]); ctx.fillRect(tx - 0.12, -th, 0.24, th);
          ctx.fillStyle = lin(ctx, tx - 0.17, 0, tx + 0.17, 0, [[0, "#2f7472"], [0.5, "#4aa3a0"], [1, "#276260"]]);
          ctx.beginPath(); ctx.moveTo(tx - 0.17, -th); ctx.lineTo(tx + 0.17, -th); ctx.lineTo(tx, -th - 0.38); ctx.fill();
        }
        ctx.fillStyle = "#e0ab3a"; ctx.beginPath(); ctx.arc(0, -0.45, 0.17, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#3a2a2a"; rr(ctx, -0.08, -0.25, 0.16, 0.25, [0.08, 0.08, 0, 0]); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawStand(t) {
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(STAND.x, STAND.y + 0.02, 0.7, 0.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, STAND.x - 0.2, 0, STAND.x + 0.2, 0, [[0, "#3a2213"], [0.5, "#7a4d2c"], [1, "#2e1a0d"]]);
    ctx.beginPath(); ctx.moveTo(STAND.x - 0.14, STAND.y - 0.8); ctx.lineTo(STAND.x + 0.14, STAND.y - 0.8); ctx.lineTo(STAND.x + 0.3, STAND.y); ctx.lineTo(STAND.x - 0.3, STAND.y); ctx.fill();
    ctx.fillStyle = "#c9912a"; ctx.beginPath(); ctx.ellipse(STAND.x, STAND.y - 0.82, 0.75, 0.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, STAND.y - 1, 0, STAND.y - 0.7, [[0, "#8a5a36"], [1, "#5a3620"]]); ctx.beginPath(); ctx.ellipse(STAND.x, STAND.y - 0.86, 0.7, 0.17, 0, 0, 7); ctx.fill();
    drawBoard(ctx, STAND.x, STAND.y - 0.93, 0.055, (r, c) => (t > T.double ? 0.15 + 0.1 * Math.sin(t * 3 + r + c) : 0));
  }
  function drawPile(t) {
    const k = easeInOut(seg(t, ...T.pile));
    if (k <= 0) return;
    const cx = STAND.x, cy = STAND.y - 0.9, w = 0.6 + k * 8.5, h = 0.3 + k * 7.2;
    glow(ctx, cx, cy - h * 0.5, w * 1.1, "255,190,70", 0.35 * k);
    ctx.fillStyle = lin(ctx, 0, cy - h, 0, cy, [[0, "#ffe08a"], [0.5, "#f0b440"], [1, "#b8791a"]]);
    ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.bezierCurveTo(cx - w * 0.55, cy - h * 0.2, cx - w * 0.28, cy - h, cx, cy - h); ctx.bezierCurveTo(cx + w * 0.28, cy - h, cx + w * 0.55, cy - h * 0.2, cx + w, cy); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    for (const p of pileSpecks) grain(ctx, cx + p.x * w, cy + p.y * h * 1.05, 0.11 + k * 0.1 * p.s, p.rot);
    ctx.restore();
    // grain pouring from above
    const r = rng(9);
    for (let i = 0; i < 70; i++) {
      const sx = cx + (r() - 0.5) * w * 0.4, sp = 3 + r() * 3, ph = r();
      const yy = cy - h - 6 + ((t * sp + ph * 8) % 6);
      if (yy < cy - h + 0.1) grain(ctx, sx, yy, 0.12, r() * 3 + t * 4);
    }
  }
  // speech bubble, hand-lettered
  function bubble(t, text, x, y, t0, t1) {
    if (t < t0 || t > t1) return;
    const k = pop(seg(t, t0, t0 + 0.4)) * (1 - seg(t, t1 - 0.25, t1));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(x, y); ctx.scale(k * 1.35 * S, k * 1.35 * S); ctx.rotate(-0.04); ctx.translate(-160, -40);
    ctx.font = "42px Marker"; const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; rr(ctx, -tw / 2 - 25 + 6, -42 + 8, tw + 50, 80, 35); ctx.fill();
    ctx.fillStyle = "#fffaf0"; rr(ctx, -tw / 2 - 25, -42, tw + 50, 80, 35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tw / 2 - 20, 30); ctx.lineTo(tw / 2 + 35, 75); ctx.lineTo(tw / 2 - 55, 36); ctx.fill();
    ctx.fillStyle = "#2a1c10"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 0, 2);
    ctx.restore(); setCam(CAM);
  }

  function hallScene(t, shot) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#120a08"; ctx.fillRect(0, 0, W, H);
    const c = shot.cam(t); setCam(c);
    ctx.drawImage(hall, BX0, BY0, BW, BH);
    drawPile(t);
    // king
    let kE = "curious", kFlare = 0, kArms, kBob = 0, kTilt = 0, kLook = -0.45, kLean = 0;
    if (t > T.chess) kE = "delighted";
    if (t > T.loves) { kFlare = seg(t, T.loves, T.loves + 0.5) * (1 - seg(t, T.reward - 0.2, T.reward + 0.4)); kLean = -0.03 * seg(t, T.loves, T.loves + 0.6); }
    if (t > T.reward) { kE = "happy"; const o = easeOut(seg(t, T.reward, T.reward + 0.4)); kArms = { L: [lerp(-0.64, -1.05, o), lerp(-0.53, -1.25, o)], R: [lerp(0.64, 1.05, o), lerp(-0.53, -1.25, o)] }; }
    if (t > T.gold - 0.3 && t < T.smiled) { kE = "happy"; const p = Math.max(pop(seg(t, T.gold - 0.2, T.gold + 0.2)), 0); kArms = { L: [-0.95 - 0.1 * Math.sin(t * 5), -0.95], R: [0.64, -0.53] }; kLook = -0.6; }
    if (t > T.smiled) { kE = "curious"; kArms = undefined; }
    if (t > T.laughed) { kE = "laugh"; kBob = -Math.abs(Math.sin((t - T.laughed) * 9)) * 0.07; kTilt = 0.06 * Math.sin((t - T.laughed) * 9); kArms = { L: [-0.34, -0.56], R: [0.34, -0.56] }; kLook = 0; }
    if (t > T.noIdea + 0.2) { kE = "alarmed"; kBob = 0; kTilt = 0; kLook = -0.35; const o = easeOut(seg(t, T.noIdea + 0.2, T.noIdea + 0.6)); kArms = { L: [lerp(-0.34, -0.95, o), lerp(-0.56, -1.55, o)], R: [lerp(0.34, 0.95, o), lerp(-0.56, -1.55, o)] }; }
    const crownOn = t < T.crown;
    drawWickHD(ctx, KING.x, KING.y, KING.s, { t, expr: kE, pose: "sit", king: true, crown: crownOn, look: kLook, flare: kFlare, arms: kArms, bob: kBob, headTilt: kTilt, lean: kLean, seed: 9 });
    if (!crownOn) { // the crown pops off and tumbles
      const u = t - T.crown;
      ctx.save(); ctx.translate(KING.x + 0.8 * u, KING.y - 3.1 - 2.4 * u + 3.2 * u * u); ctx.rotate(u * 5); ctx.scale(KING.s, KING.s);
      // reuse the crown by drawing a crowned flame-less Wick is heavy; draw a simple crown
      ctx.fillStyle = lin(ctx, 0, -0.3, 0, 0.08, [[0, "#ffe486"], [0.45, "#f2b72e"], [1, "#a86a0c"]]);
      ctx.beginPath(); ctx.moveTo(-0.27, 0.06); ctx.lineTo(-0.3, -0.2); ctx.lineTo(-0.16, -0.07); ctx.lineTo(-0.08, -0.29); ctx.lineTo(0, -0.1); ctx.lineTo(0.09, -0.29); ctx.lineTo(0.17, -0.07); ctx.lineTo(0.31, -0.2); ctx.lineTo(0.28, 0.06); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // gifts + stand
    drawGifts(t);
    if (t > T.laughed - 1) drawStand(t);
    // inventor
    const x = invX(t), moving = t > T.walk[0] && t < T.walk[1] - 0.15;
    let iE = "happy", iArms, iSq = 0, iBob = 0, iLook = 0.45, iTilt = 0, pose = moving ? "walk" : "stand";
    const holding = t < T.present[1] + 0.2 && t > 0;
    if (holding) iArms = { L: [-0.34, -0.7], R: [0.34, -0.7] };
    if (t > T.bow[0] && t < T.bow[1] + 0.3) { const b = Math.sin(seg(t, T.bow[0], T.bow[1] + 0.3) * Math.PI); iSq = b * 0.07; iBob = b * 0.12; iTilt = b * 0.1; iE = "calm"; }
    let lift = 0;
    if (t > T.present[0]) { lift = easeOut(seg(t, T.present[0], T.present[0] + 0.4)); iArms = { L: [-0.36, lerp(-0.7, -1.15, lift)], R: [0.36, lerp(-0.7, -1.15, lift)] }; iE = "smile"; }
    if (t > T.present[1] + 0.2) { iArms = undefined; iE = "smile"; }
    if (t > T.gold - 0.2 && t < T.smiled) { iE = "curious"; iLook = 0.3 + 0.25 * Math.sin(t * 2); }
    if (t > T.smiled) { iE = "calm"; iLook = 0.5 * Math.sin((t - T.smiled) * 7) * (1 - seg(t, T.smiled + 0.9, T.smiled + 1.3)); iArms = { R: [0.72 + 0.1 * Math.sin(t * 13), -1.15] }; }
    if (t > T.smiled + 1.2) { iE = "smile"; iArms = undefined; iLook = 0.2; }
    if (t > T.grain - 0.1) { iE = "smile"; iArms = { L: [-0.42, -1.62, true] }; }
    if (t > T.laughed - 0.5) { iE = "smile"; iArms = undefined; iLook = 0.5; }
    if (t > T.noIdea) { iE = "calm"; iLook = 0.35; }
    drawWickHD(ctx, x, INV.y, INV.s, { t, expr: iE, pose, walk: (x + 7.9) * 3.3, arms: iArms, squash: iSq, bob: iBob, headTilt: iTilt, look: iLook, seed: 3 });
    if (holding) {
      const bx = x, by = INV.y + lerp(-0.66, -1.12, lift) * INV.s + (moving ? -Math.abs(Math.sin((x + 7.9) * 3.3)) * 0.05 : 0) + iBob;
      drawBoard(ctx, bx, by, 0.052);
    }
    if (t > T.grain - 0.1 && t < T.laughed - 0.5) { // a single glinting grain held up
      const gx = x - 0.42 * INV.s, gy = INV.y - 1.77 * INV.s;
      glow(ctx, gx, gy, 0.5, "255,210,110", 0.5);
      grain(ctx, gx, gy - 0.05, 0.3, -0.6);
      sparkle(ctx, gx + 0.16, gy - 0.16, 0.13 * (0.6 + 0.4 * Math.sin(t * 8)), 1);
      sparkle(ctx, gx - 0.14, gy - 0.02, 0.08 * (0.6 + 0.4 * Math.sin(t * 6 + 2)), 1);
    }
    // flame light on the room
    flameLight(ctx, KING.x, KING.y, KING.s, 1 + kFlare);
    flameLight(ctx, x, INV.y, INV.s, 0.9);
    // king's delight sparkles
    if (kFlare > 0) for (let i = 0; i < 7; i++) { const a = i * 0.9 + t; sparkle(ctx, KING.x + Math.cos(a) * 1.3, KING.y - 2.6 + Math.sin(a * 1.3) * 0.9, 0.12, kFlare * (0.5 + 0.5 * Math.sin(t * 7 + i))); }
    { const [bx, by] = toScreen(KING.x - 0.55, KING.y - 3.0); bubble(t, "Name your reward!", bx, by, T.reward + 0.05, 10.9); }
  }

  function boardScene(t, shot) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(table, 0, 0, W, H);
    const c = shot.cam(t); setCam(c);
    const a = 0.9;
    drawBoard(ctx, 0, 0, a, (r, c2) => {
      let e = 0;
      const sq = r === 0 ? c2 : -1;
      if (sq >= 0 && sq < 3 && t > T.sq[sq]) e = 0.35 * (1 - seg(t, T.sq[sq] + 0.2, T.sq[sq] + 1.2));
      if (t > T.double) { const d = r + c2; const w = Math.max(0, 1 - Math.abs((t - T.double) * 9 - d) * 0.5); e += w * 0.8 + seg(t, T.double + 0.8, T.double + 1.6) * 0.12; }
      return e;
    });
    // grains + counts
    const rg = rng(12);
    [1, 2, 4].forEach((n, col) => {
      const [cx, cy] = tileCenter(0, col, a);
      for (let j = 0; j < n; j++) {
        const t0 = T.sq[col] + 0.25 + j * 0.08, an = rg() * 7, d = n === 1 ? 0 : 0.08 + rg() * 0.18;
        if (t < t0) continue;
        const k = seg(t, t0, t0 + 0.25);
        const drop = (1 - easeIn(k)) * 1.2, bounce = k >= 1 ? Math.abs(Math.sin((t - t0 - 0.25) * 12)) * Math.exp(-(t - t0 - 0.25) * 8) * 0.12 : 0;
        grain(ctx, cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.5 - drop - bounce, 0.5, rg() * 3);
      }
    });
    // inventor's mitten places each grain (enters from the bottom right)
    const place = (t0) => Math.sin(clamp((t - t0 + 0.35) / 0.8) * Math.PI);
    let hk = 0, hc = 0;
    T.sq.forEach((t0, i) => { const p = place(t0); if (p > hk) { hk = p; hc = i; } });
    if (hk > 0) {
      const [tx, ty] = tileCenter(0, hc, a);
      const hx = lerp(tx + 5, tx + 0.55, hk), hy = lerp(ty + 4, ty - 0.55, hk);
      ctx.lineCap = "round"; ctx.strokeStyle = "#1b1917"; ctx.lineWidth = 0.34;
      ctx.beginPath(); ctx.moveTo(hx + 5, hy + 4); ctx.quadraticCurveTo(hx + 2.2, hy + 0.6, hx, hy); ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.scale(4, 4);
      ctx.fillStyle = rad(ctx, -0.03, -0.05, 0.15, [[0, "#4a4440"], [0.5, "#221f1c"], [1, "#141210"]]);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.105, 0.125, 0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-0.09, -0.07, 0.045, 0.07, -0.2, 0, 7); ctx.fill();
      ctx.restore();
    }
    // the doubling count flashes across the board
    if (t > T.double) {
      const vals = [8, 16, 32, 64, 128, 256, 512, 1024];
      vals.forEach((v, i) => {
        const t0 = T.double + 0.12 * i; if (t < t0) return;
        const [x, y] = tileCenter(0, 3 + Math.min(i, 4), a);
        const [x2, y2] = tileCenter(Math.max(0, i - 4), 7, a);
        const [px, py] = toScreen(i < 5 ? x : x2, (i < 5 ? y : y2) - 0.4);
        const k = pop(seg(t, t0, t0 + 0.3)) * (1 - seg(t, t0 + 0.7, t0 + 1.0));
        if (k <= 0) return;
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(px, py); ctx.scale(k, k);
        ctx.font = `700 ${46 * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 8 * S; ctx.strokeStyle = "#3a2106"; ctx.strokeText(v.toLocaleString(), 0, 0); ctx.fillStyle = "#ffd35a"; ctx.fillText(v.toLocaleString(), 0, 0);
        ctx.restore(); setCam(c);
      });
    }
    // counts for the first three squares
    [1, 2, 4].forEach((n, col) => {
      const t0 = T.sq[col] + 0.3; if (t < t0) return;
      const [x, y] = tileCenter(0, col, a), [sx, sy] = toScreen(x, y - 0.75);
      const k = pop(seg(t, t0, t0 + 0.45)) * (1 - seg(t, T.double + 0.2, T.double + 0.6));
      if (k <= 0) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(sx, sy); ctx.scale(k, k);
      ctx.font = `700 ${72 * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 12 * S; ctx.strokeStyle = "#3a2106"; ctx.strokeText(String(n), 0, 0); ctx.fillStyle = "#ffc94a"; ctx.fillText(String(n), 0, 0);
      ctx.restore(); setCam(c);
    });
  }

  // ── overlays ──
  function caption(text, t, t0, t1, y = 0.87, size = 58) {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.2) * (1 - seg(t, t1 - 0.3, t1)), s = lerp(0.85, 1, pop(seg(t, t0, t0 + 0.4)));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * y); ctx.scale(s, s);
    ctx.font = `700 ${size * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 16 * S; ctx.shadowOffsetY = 4 * S;
    ctx.fillStyle = "#fff4dc"; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function chapter(t) {
    const t0 = 0.5, t1 = 4.0; if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.4) * (1 - seg(t, t1 - 0.4, t1)), sl = easeOut(seg(t, t0, t0 + 0.5));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f0a31c"; ctx.fillRect(70 * S, 78 * S, 8 * S, 46 * S);
    ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10 * S; ctx.fillText("THE INVENTOR'S PRICE", (92 - 20 * (1 - sl)) * S, 102 * S); ctx.restore();
  }
  function title(t) {
    if (t < T.title) return;
    const k = easeOut(seg(t, T.title, T.title + 0.6));
    ctx.save();
    ctx.fillStyle = lin(ctx, 0, H * 0.35, 0, H, [[0, "rgba(10,6,4,0)"], [1, `rgba(10,6,4,${0.85 * k})`]]); ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 18 * S;
    ctx.font = `600 ${28 * S}px Fredoka`; ctx.fillStyle = "#f0a31c"; ctx.fillText("WICK'S WISDOM", W / 2, H * 0.72);
    ctx.font = `700 ${74 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.fillText("The Chessboard That Bankrupted a King", W / 2, H * 0.81 + (1 - k) * 24 * S);
    ctx.restore();
  }
  function finish(t) {
    ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = "overlay";
    ctx.translate((t * 97) % 256, (t * 61) % 256); ctx.fillStyle = ctx.createPattern(noise, "repeat"); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
    ctx.fillStyle = rad(ctx, W / 2, H / 2, H * 1.05, [[0.45, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.55)"]]); ctx.fillRect(0, 0, W, H);
  }

  function renderAt(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
    if (shot.set === "hall") hallScene(t, shot); else boardScene(t, shot);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(t);
    chapter(t);
    caption("× 2 on every square", t, T.double + 0.1, 22.7);
    caption("By square 64...", t, T.noIdea + 0.5, 27.6, 0.11);
    caption("~1,000 years of the world's wheat", t, 27.7, T.title - 0.05, 0.11);
    title(t);
    // soft fades: in at the start, a quick dip on each cut, out at the end
    let f = 1 - seg(t, 0, 0.5);
    for (const s of SHOTS.slice(1)) f = Math.max(f, (1 - Math.min(1, Math.abs(t - s.t0) / 0.12)) * 0.5);
    f = Math.max(f, seg(t, ...T.fade));
    if (f > 0) { ctx.globalAlpha = f; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  return { duration: DURATION, fps: 30, out, renderAt };
}
