// INK STYLE — the "Changing World Order" explainer look, in plain Canvas 2D:
// grainy coloured paper with diagonal scratches at the edges, thick black
// outlines, flat fills, and shadows made of hatch lines instead of gradients.
//
// inkWick() is Wick translated into that style (not an imitation of his 3D
// render). Proportions are measured off wick_examples/00_character_sheet.png.
// Units: body width = 1. Origin = ground under the feet. y is DOWN.
// Locked: the wax level never changes; the flame is the light source.
import { rng } from "./ease.js";

export const PAL = {
  navy: "#17213a", green: "#2d4536", mustard: "#8a6a2b",
  ink: "#121015", cream: "#efe9d6", paperText: "#e9f0dc",
  blue: "#72b6ee", blueDeep: "#2f86d6", sweat: "#7cc6f2",
  gold: "#f7b21b", goldCore: "#ffd45c", goldDeep: "#d7860a",
  wax: "#eee0b9", waxLight: "#f8f0d7", waxShade: "#cbb88a", waxHole: "#bfa878",
  cashTop: "#8fd07e", cashL: "#5aa653", cashR: "#3c7e41",
  squareLight: "#e7dbbb", squareDark: "#34507c",
};

// ---------- paper ----------
export function paper(W, H, base, seed = 7) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // big soft blotches, like uneven ink on paper
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * H, rad = (0.1 + r() * 0.3) * W;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.025 + r() * 0.035;
    gr.addColorStop(0, r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  // diagonal scratches, dense at the edges, sparse in the middle
  const ang0 = -1.05;
  const dark = new Path2D(), light = new Path2D();
  const N = Math.round(W * H / 22);
  for (let i = 0; i < N; i++) {
    const x = r() * W, y = r() * H;
    const e = Math.max(Math.abs(x / W - 0.5), Math.abs(y / H - 0.5)) * 2;
    if (r() > 0.008 + 0.992 * Math.pow(e, 4.5)) continue;
    const len = (4 + r() * 16) * (W / 1920);
    const p = r() < 0.72 ? dark : light, ang = ang0 + (r() - 0.5) * 0.35;
    p.moveTo(x, y); p.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }
  g.lineWidth = 1.1 * (W / 1920);
  g.strokeStyle = "rgba(0,0,0,0.16)"; g.stroke(dark);
  g.strokeStyle = "rgba(255,255,255,0.07)"; g.stroke(light);
  // fine grain
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 16;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // vignette
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}

// ---------- hatching ----------
// Fill whatever pathFn traces with parallel lines. All sizes in current units.
export function hatch(ctx, pathFn, { angle = -55, gap = 0.05, width = 0.014, color = "rgba(0,0,0,0.4)", cx = 0, cy = 0, R = 4 } = {}) {
  ctx.save();
  ctx.beginPath(); pathFn(ctx); ctx.clip();
  const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  ctx.beginPath();
  for (let d = -R; d <= R; d += gap) {
    const px = cx - dy * d, py = cy + dx * d;
    ctx.moveTo(px - dx * R, py - dy * R); ctx.lineTo(px + dx * R, py + dy * R);
  }
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = "butt"; ctx.stroke();
  ctx.restore();
}

// ---------- Wick ----------
const T = -1.42;          // top of the wax (rim centre line). Never changes.
const B = -0.47;          // bottom of the wax
const FH = 1.52, FW = 1.2, SINK = 0.12;
const LW = 0.05;          // outline weight

export const FACES = {
  happy:      { eye: 1, brow: 0, browY: 0, mouth: "smile", mw: 0.16, curve: 0.08 },
  calm:       { eye: 1, lids: "down", brow: 0, browY: 0.01, mouth: "smile", mw: 0.1, curve: 0.04 },
  curious:    { eye: 1.1, brow: 0.1, browY: -0.04, mouth: "o", mw: 0.04 },
  proud:      { eye: 1, lids: "half", brow: -0.08, browY: 0.02, mouth: "smirk", mw: 0.14, curve: 0.06 },
  determined: { eye: 0.95, brow: -0.3, browY: 0.02, mouth: "smile", mw: 0.1, curve: 0.03 },
  alarmed:    { eye: 1.25, brow: 0.32, browY: -0.06, mouth: "o", mw: 0.065 },
  sombre:     { eye: 0.95, brow: 0.28, browY: 0, mouth: "smile", mw: 0.1, curve: -0.05 },
};

function flamePath(ctx, cx, cy, W, H, lean) {
  const n = 72, R = [], L = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * (i / n);
    const x = (W / 2) * Math.sin(t) * Math.pow(Math.sin(t / 2), 0.72);
    const y = -(H / 2) * Math.cos(t);
    const k = Math.pow(Math.max(0, (H / 2 - y) / H), 2.6);
    R.push([cx + x + lean * k, cy + y]); L.push([cx - x + lean * k, cy + y]);
  }
  ctx.moveTo(R[0][0], R[0][1]);
  R.forEach(([x, y]) => ctx.lineTo(x, y));
  for (let i = L.length - 1; i >= 0; i--) ctx.lineTo(L[i][0], L[i][1]);
  ctx.closePath();
}

function bodyPath(ctx) {
  ctx.moveTo(-0.5, T);
  ctx.lineTo(-0.5, B);
  ctx.ellipse(0, B, 0.5, 0.085, 0, Math.PI, 0, true);
  ctx.lineTo(0.5, T);
  ctx.ellipse(0, T, 0.5, 0.1, 0, 0, -Math.PI, true);
  ctx.closePath();
}

const DRIPS = [
  { c: -0.36, w: 0.15, l: 0.22 }, { c: -0.06, w: 0.16, l: 0.32 }, { c: 0.22, w: 0.12, l: 0.13 }, { c: 0.43, w: 0.13, l: 0.25 },
];
const rimY = (x) => T + 0.105 * Math.sqrt(Math.max(0, 1 - (x / 0.52) ** 2));
function dripPath(ctx) {
  ctx.moveTo(-0.53, T);
  ctx.ellipse(0, T, 0.53, 0.105, 0, Math.PI, 0, true);           // front lip, left to right
  const base = (x) => rimY(x) + 0.075;
  ctx.lineTo(0.53, base(0.52));
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const { c, w, l } = DRIPS[i], h = w / 2, yb = base(c);
    ctx.lineTo(c + h + 0.035, base(c + h + 0.035));
    ctx.quadraticCurveTo(c + h, yb, c + h, yb + 0.05);
    ctx.lineTo(c + h, yb + l - h);
    ctx.arc(c, yb + l - h, h, 0, Math.PI);
    ctx.lineTo(c - h, yb + 0.05);
    ctx.quadraticCurveTo(c - h, yb, c - h - 0.035, base(c - h - 0.035));
  }
  ctx.lineTo(-0.53, base(-0.52));
  ctx.closePath();
}

function hose(ctx, a, b, bend) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(cx, cy, b[0], b[1]);
  ctx.lineWidth = 0.085; ctx.lineCap = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
  return Math.atan2(b[1] - cy, b[0] - cx);                         // direction the hand points
}
function mitten(ctx, x, y, dir, side) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir);
  ctx.fillStyle = PAL.ink;
  ctx.beginPath(); ctx.ellipse(0.05, 0, 0.12, 0.105, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.02, -0.1 * side, 0.045, 0.07, 0.5 * side, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath(); ctx.ellipse(0.07, -0.035, 0.045, 0.02, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function face(ctx, fx, f, look) {
  const eyeY = T - 0.46, dx = 0.125, ex = look * 0.03;
  // eyes
  for (const s of [-1, 1]) {
    const x = fx + s * dx + ex, rx = 0.058 * f.eye, ry = 0.085 * f.eye;
    if (f.lids === "down") {
      ctx.beginPath(); ctx.ellipse(x, eyeY, rx * 1.1, ry * 0.5, 0, 0.15, Math.PI - 0.15);
      ctx.lineWidth = 0.028; ctx.lineCap = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
      continue;
    }
    ctx.fillStyle = PAL.ink;
    ctx.beginPath(); ctx.ellipse(x, eyeY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x + rx * 0.35, eyeY - ry * 0.4, rx * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - rx * 0.3, eyeY + ry * 0.4, rx * 0.15, 0, Math.PI * 2); ctx.fill();
    if (f.lids === "half") {                                       // heavy lid: a flat top edge
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(x - rx * 1.3, eyeY - ry * 1.3, rx * 2.6, ry * 0.95);
      ctx.beginPath(); ctx.moveTo(x - rx * 1.15, eyeY - ry * 0.35); ctx.lineTo(x + rx * 1.15, eyeY - ry * 0.35);
      ctx.lineWidth = 0.024; ctx.strokeStyle = PAL.ink; ctx.stroke();
    }
  }
  // brows: positive tilt raises the inner ends (worry), negative lowers them (resolve)
  for (const s of [-1, 1]) {
    const x = fx + s * dx + ex * 0.6, y = eyeY - 0.14 + f.browY;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.06, y - f.brow * 0.06);
    ctx.quadraticCurveTo(x, y - 0.03, x + s * 0.06, y + f.brow * 0.06);
    ctx.lineWidth = 0.024; ctx.lineCap = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
  }
  // mouth
  const my = T - 0.24, mx = fx + ex * 0.8;
  ctx.strokeStyle = PAL.ink; ctx.fillStyle = PAL.ink; ctx.lineWidth = 0.026; ctx.lineCap = "round";
  if (f.mouth === "o") {
    ctx.beginPath(); ctx.ellipse(mx, my + 0.01, f.mw * 0.8, f.mw, 0, 0, Math.PI * 2); ctx.fill();
  } else if (f.mouth === "smirk") {
    ctx.beginPath(); ctx.moveTo(mx - f.mw / 2, my); ctx.quadraticCurveTo(mx + f.mw * 0.1, my + f.curve * 1.2, mx + f.mw / 2, my - 0.035); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx - f.mw / 2, my); ctx.quadraticCurveTo(mx, my + f.curve * 2, mx + f.mw / 2, my); ctx.stroke();
  }
}

function crown(ctx, cx, cy, tilt) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  const w = 0.34, h = 0.13;
  const p = (c) => {
    c.moveTo(-w, 0); c.lineTo(-w, -h); c.lineTo(-w - 0.03, -h - 0.2); c.lineTo(-w * 0.45, -h - 0.02);
    c.lineTo(0, -h - 0.26); c.lineTo(w * 0.45, -h - 0.02); c.lineTo(w + 0.03, -h - 0.2);
    c.lineTo(w, -h); c.lineTo(w, 0); c.closePath();
  };
  ctx.beginPath(); p(ctx); ctx.fillStyle = "#f4c542"; ctx.fill();
  hatch(ctx, (c) => { p(c); }, { gap: 0.035, width: 0.01, color: "rgba(120,60,0,0.55)", R: 0.8 });
  ctx.fillStyle = "#e3a21c"; ctx.fillRect(-w, -0.05, w * 2, 0.05);
  ctx.beginPath(); p(ctx); ctx.lineWidth = 0.035; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.fillStyle = "#d8352a";
  ctx.beginPath(); ctx.arc(0, -h * 0.55, 0.045, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (const [x, y] of [[-w - 0.03, -h - 0.2], [0, -h - 0.26], [w + 0.03, -h - 0.2]]) {
    ctx.fillStyle = "#fff1b8"; ctx.beginPath(); ctx.arc(x, y, 0.035, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.025; ctx.stroke();
  }
  ctx.restore();
}

// royal cape hanging behind the wax, ermine hem showing at the sides
function cape(ctx) {
  const p = (c) => {
    c.moveTo(-0.5, -1.36); c.quadraticCurveTo(-0.62, -1.0, -0.8, -0.3);
    c.quadraticCurveTo(-0.55, -0.22, -0.3, -0.3); c.lineTo(0.3, -0.3);
    c.quadraticCurveTo(0.55, -0.22, 0.8, -0.3); c.quadraticCurveTo(0.62, -1.0, 0.5, -1.36); c.closePath();
  };
  ctx.beginPath(); p(ctx); ctx.fillStyle = "#b9322b"; ctx.fill();
  hatch(ctx, p, { gap: 0.04, width: 0.012, color: "rgba(60,0,0,0.5)", cy: -0.8, R: 2 });
  ctx.beginPath(); p(ctx); ctx.lineWidth = LW * 0.8; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
  const hem = (c) => { c.moveTo(-0.82, -0.36); c.quadraticCurveTo(-0.55, -0.26, -0.3, -0.34); c.lineTo(0.3, -0.34); c.quadraticCurveTo(0.55, -0.26, 0.82, -0.36);
    c.lineTo(0.8, -0.24); c.quadraticCurveTo(0.55, -0.14, 0.3, -0.22); c.lineTo(-0.3, -0.22); c.quadraticCurveTo(-0.55, -0.14, -0.8, -0.24); c.closePath(); };
  ctx.beginPath(); hem(ctx); ctx.fillStyle = "#f4efe2"; ctx.fill(); ctx.lineWidth = LW * 0.7; ctx.stroke();
  ctx.fillStyle = PAL.ink;
  for (const x of [-0.7, -0.5, 0.5, 0.7]) { ctx.beginPath(); ctx.ellipse(x, -0.27, 0.018, 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
}

/**
 * inkWick(ctx, x, y, scale, opts)
 *   face:  key of FACES          look: -1..1 eye direction
 *   armL/armR: hand position in body units, e.g. [0.95, -1.3]
 *   crown / cape: the king's costume          glow: 0..1
 */
export function inkWick(ctx, x, y, s, o = {}) {
  const f = FACES[o.face || "happy"], look = o.look || 0, lean = o.lean ?? -0.07;
  const fcx = 0, fcy = T + SINK - FH / 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);

  // light: the flame lights the world around him
  if ((o.glow ?? 1) > 0) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const gl = o.glow ?? 1;
    const g = ctx.createRadialGradient(0, fcy + 0.1, 0.3, 0, fcy + 0.1, 2.2);
    g.addColorStop(0, `rgba(255,196,80,${0.42 * gl})`);
    g.addColorStop(0.35, `rgba(255,160,50,${0.16 * gl})`);
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, fcy + 0.1, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // warm pool of light on the ground
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.1);
  pool.addColorStop(0, `rgba(255,170,60,${0.22 * (o.glow ?? 1)})`); pool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(0.02, 0.005, 0.62, 0.075, 0, 0, Math.PI * 2); ctx.fill();

  // legs + shoes
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sgn * 0.2, B + 0.02); ctx.lineTo(sgn * 0.225, -0.1);
    ctx.lineWidth = 0.09; ctx.lineCap = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.fillStyle = PAL.ink;
    ctx.beginPath(); ctx.ellipse(sgn * 0.27, -0.075, 0.19, 0.095, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.ellipse(sgn * 0.24, -0.12, 0.08, 0.022, 0, 0, Math.PI * 2); ctx.fill();
  }

  if (o.cape) cape(ctx);

  // arms (behind the wax)
  const shL = [-0.46, -1.13], shR = [0.46, -1.13];
  const hL = o.armL || [-0.74, -0.62], hR = o.armR || [0.74, -0.62];
  const dL = hose(ctx, shL, hL, -0.12), dR = hose(ctx, shR, hR, 0.12);
  mitten(ctx, hL[0], hL[1], dL, -1);
  mitten(ctx, hR[0], hR[1], dR, 1);

  // wax body: flat fill, flat shadow on the right, hatch over the shadow
  ctx.beginPath(); bodyPath(ctx); ctx.fillStyle = PAL.wax; ctx.fill();
  ctx.save(); ctx.beginPath(); bodyPath(ctx); ctx.clip();
  ctx.fillStyle = PAL.waxShade;
  ctx.beginPath(); ctx.moveTo(0.22, T); ctx.quadraticCurveTo(0.3, -0.9, 0.18, B + 0.2); ctx.lineTo(0.18, 0); ctx.lineTo(0.6, 0); ctx.lineTo(0.6, T); ctx.fill();
  hatch(ctx, (c) => { c.moveTo(0.3, T); c.quadraticCurveTo(0.36, -0.9, 0.26, B + 0.2); c.lineTo(0.26, 0); c.lineTo(0.6, 0); c.lineTo(0.6, T); c.closePath(); },
    { gap: 0.045, width: 0.012, color: "rgba(90,70,30,0.55)", cy: -1, R: 2 });
  ctx.fillStyle = "rgba(90,70,30,0.18)";
  ctx.beginPath(); ctx.ellipse(0, B + 0.05, 0.6, 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.beginPath(); bodyPath(ctx); ctx.lineWidth = LW; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();

  // the opening at the top of the candle
  ctx.beginPath(); ctx.ellipse(0, T, 0.5, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.waxHole; ctx.fill();

  // flame, sunk into the opening
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.lineTo(3, T); ctx.lineTo(0.5, T);
  ctx.ellipse(0, T, 0.5, 0.1, 0, 0, Math.PI, false); ctx.lineTo(-3, T); ctx.closePath(); ctx.clip();
  ctx.beginPath(); flamePath(ctx, fcx, fcy, FW, FH, lean); ctx.fillStyle = PAL.gold; ctx.fill();
  ctx.beginPath(); flamePath(ctx, fcx + 0.07, fcy + 0.2, FW * 0.62, FH * 0.64, lean * 0.6); ctx.fillStyle = PAL.goldCore; ctx.fill();
  ctx.save(); ctx.beginPath(); flamePath(ctx, fcx, fcy, FW, FH, lean); ctx.clip();
  hatch(ctx, (c) => { c.moveTo(-0.7, fcy - 1); c.quadraticCurveTo(-0.14, fcy, -0.36, T + 0.1); c.lineTo(-0.9, T + 0.1); c.closePath(); },
    { gap: 0.04, width: 0.013, color: "rgba(170,80,0,0.6)", cy: fcy, R: 2 });
  // one gloss stroke, upper left, inside the flame
  ctx.beginPath(); ctx.ellipse(fcx - 0.1, fcy + 0.05, 0.3, 0.5, 0.12, Math.PI * 1.12, Math.PI * 1.38);
  ctx.lineWidth = 0.035; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
  ctx.restore();
  face(ctx, fcx + 0.02, f, look);
  ctx.beginPath(); flamePath(ctx, fcx, fcy, FW, FH, lean); ctx.lineWidth = LW; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.restore();

  // melted drips over the rim
  ctx.beginPath(); dripPath(ctx); ctx.fillStyle = PAL.waxLight; ctx.fill();
  ctx.lineWidth = LW * 0.7; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink; ctx.stroke();

  if (o.crown) crown(ctx, fcx + 0.24, fcy - 0.1, 0.38);
  ctx.restore();
}

// ---------- small FX ----------
export function sweat(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(0.7, 0.2, 0, 0.6); ctx.quadraticCurveTo(-0.7, 0.2, 0, -1);
  ctx.fillStyle = PAL.sweat; ctx.fill();
  ctx.restore();
}
export function sparkle(ctx, x, y, r, color = "#fff6d0") {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(Math.cos(a - Math.PI / 2) * rr, Math.sin(a - Math.PI / 2) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- type ----------
export function title(ctx, text, x, y, size, color = PAL.paperText, align = "center") {
  ctx.save();
  ctx.font = `900 ${size}px Serif4`; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(text, x + size * 0.03, y + size * 0.04);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}
export function label(ctx, text, x, y, size, color = PAL.paperText, align = "center") {
  ctx.save();
  ctx.font = `500 ${size}px Fira`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------- hand-drawn line + print grain (the "made by a person" pass) ----------
// Every art layer is drawn through an SVG displacement filter: a slow wobble so
// lines aren't ruler-straight, plus fine roughness on the ink edges. Three seeds
// cycle at eight per second, which gives the line "boil" of hand animation.
let filtersFor = 0;
function ensureFilters(k) {
  if (filtersFor === k) return;
  document.getElementById("ink-filters")?.remove();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "ink-filters"; svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = [1, 2, 3].map((sd) => `
    <filter id="ink${sd}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.009 / k).toFixed(5)}" numOctaves="2" seed="${sd}" result="slow"/>
      <feDisplacementMap in="SourceGraphic" in2="slow" scale="${(6 * k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="w"/>
      <feTurbulence type="fractalNoise" baseFrequency="${(0.3 / k).toFixed(4)}" numOctaves="1" seed="${sd + 20}" result="fine"/>
      <feDisplacementMap in="w" in2="fine" scale="${(1.8 * k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`).join("");
  document.body.appendChild(svg);
  filtersFor = k;
}

function grainTexture(W, H, seed = 5) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), r = rng(seed);
  const img = g.createImageData(W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = 128 + (r() - 0.5) * 70;
    if (r() < 0.004) v = r() < 0.5 ? 40 : 230;                    // riso specks
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// stage.frame(bg, t, drawArt, drawText): bg paper → wobbly art → crisp text → grain
export function makeStage(out) {
  const W = out.width, H = out.height, k = W / 1920;
  const art = document.createElement("canvas"); art.width = W; art.height = H;
  const actx = art.getContext("2d"), octx = out.getContext("2d");
  const grain = grainTexture(W, H);
  ensureFilters(k);
  return {
    k, W, H,
    frame(bg, t, drawArt, drawText) {
      octx.globalCompositeOperation = "source-over"; octx.filter = "none";
      octx.drawImage(bg, 0, 0);
      actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H);
      actx.save(); actx.scale(k, k); drawArt(actx); actx.restore();
      octx.filter = `url(#ink${(Math.floor(t * 8) % 3) + 1})`;
      octx.drawImage(art, 0, 0);
      octx.filter = "none";
      if (drawText) { octx.save(); octx.scale(k, k); drawText(octx); octx.restore(); }
      octx.save(); octx.globalCompositeOperation = "overlay"; octx.globalAlpha = 0.22;
      octx.drawImage(grain, 0, 0); octx.restore();
    },
  };
}

// light spilling from beyond something: thin fan of rays
export function rays(ctx, x, y, n, len, spread, dir, color = "255,205,110", alpha = 0.16, seed = 3) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i++) {
    const a = dir + (i / (n - 1) - 0.5) * spread + (r() - 0.5) * 0.08, w = 0.03 + r() * 0.04, L = len * (0.6 + r() * 0.4);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * L, y + Math.sin(a - w) * L); ctx.lineTo(x + Math.cos(a + w) * L, y + Math.sin(a + w) * L);
    ctx.closePath(); ctx.fill();
  }
  const gg = ctx.createRadialGradient(x, y, 0, x, y, len * 0.45);
  gg.addColorStop(0, `rgba(${color},${alpha * 3})`); gg.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, len * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the Dalio chart stroke: thick sky-blue line, round caps, optional arrowhead
export function chartLine(ctx, pts, { width = 12, color = PAL.blue, arrow = true } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const e = pts[pts.length - 1], p = pts[pts.length - 2];
  ctx.lineTo(e[0], e[1]);
  ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.stroke();
  if (arrow) {
    const a = Math.atan2(e[1] - p[1], e[0] - p[0]), L = width * 3.2;
    ctx.beginPath();
    ctx.moveTo(e[0] + Math.cos(a - 2.6) * L, e[1] + Math.sin(a - 2.6) * L); ctx.lineTo(e[0], e[1]);
    ctx.lineTo(e[0] + Math.cos(a + 2.6) * L, e[1] + Math.sin(a + 2.6) * L); ctx.stroke();
  }
  ctx.restore();
}

// tracked small caps, the Dalio kicker line
export function kicker(ctx, text, x, y, size, color = PAL.blue, track = 0.32) {
  ctx.save(); ctx.font = `700 ${size}px Serif4`; ctx.fillStyle = color; ctx.textBaseline = "alphabetic";
  const chars = [...text], ws = chars.map((c) => ctx.measureText(c).width + size * track);
  let cx = x - ws.reduce((a, b) => a + b, 0) / 2 + size * track / 2;
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += ws[i]; });
  ctx.restore();
}
