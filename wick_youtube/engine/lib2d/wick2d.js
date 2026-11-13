// FLAT WICK — plain Canvas 2D, proportions measured off Dre's reference render
// (the black-background front view): rounded golden teardrop flame whose tip
// leans left, lighter inner flame in the lower right, thin brown outline; ivory
// cylinder with a thick glossy drip band at the rim; thin black arms hanging at
// the sides into thumbed mittens; short straight legs; big round shoes.
//
// Units: body width = 1. Origin = ground under the feet. y is DOWN.
// Locked rules: wax level never changes, nothing on the flame, flame = light.

export const EXPRESSIONS = {
  happy:      { eye: 1.0, closed: false, tilt: 0, by: 0, arch: 1, mouth: "smile", mw: 0.17, c: 0.09 },
  calm:       { eye: 1.0, closed: "down", tilt: 0, by: 0.01, arch: 0.7, mouth: "smile", mw: 0.11, c: 0.05 },
  curious:    { eye: 1.1, closed: false, tilt: 0, by: -0.03, arch: 1.2, mouth: "o", mw: 0.045, c: 0, raise: 0.05 },
  focused:    { eye: 0.92, closed: false, tilt: -0.3, by: 0.01, arch: 0.3, mouth: "smile", mw: 0.07, c: -0.01 },
  determined: { eye: 0.95, closed: false, tilt: -0.35, by: 0.01, arch: 0.3, mouth: "smile", mw: 0.12, c: 0.05 },
  proud:      { eye: 1.0, closed: "up", tilt: 0, by: -0.02, arch: 1, mouth: "smile", mw: 0.15, c: 0.08 },
  sombre:     { eye: 0.95, closed: false, tilt: 0.3, by: 0, arch: 0.4, mouth: "smile", mw: 0.09, c: -0.05 },
  weary:      { eye: 0.9, closed: "half", tilt: 0.28, by: 0.01, arch: 0.4, mouth: "smile", mw: 0.09, c: -0.04 },
  alarmed:    { eye: 1.2, closed: false, tilt: 0.35, by: -0.05, arch: 0.9, mouth: "o", mw: 0.07, c: 0 },
};

const INK = "#141210", OUTLINE = "#4a2a08";
const GOLD = "#f6ae14", GOLD_EDGE = "#e78d09", GOLD_CORE = "#ffc836";

// rounded teardrop, tip leaning left (negative lean), bottom wide and round
export function flamePath(ctx, W, H, lean = -0.08, m = 0.75, n = 64) {
  const R = [], L = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * (i / n);                                     // 0 = tip, π = bottom
    const x = (W / 2) * Math.sin(t) * Math.pow(Math.sin(t / 2), m);
    const y = -(H / 2) * Math.cos(t);
    const k = Math.pow(Math.max(0, (H / 2 - y) / H), 2.6);          // 1 at the tip, 0 at the bottom
    R.push([x + lean * k, y]); L.push([-x + lean * k, y]);
  }
  ctx.beginPath();
  R.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = L.length - 1; i >= 0; i--) ctx.lineTo(L[i][0], L[i][1]);
  ctx.closePath();
}

function hose(ctx, a, c, b, w) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.lineWidth = w; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.stroke();
}
function mitten(ctx, x, y, sx) {
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(x, y, 0.125, 0.14, sx * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - sx * 0.1, y - 0.05, 0.05, 0.075, -sx * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath(); ctx.ellipse(x + sx * 0.03, y - 0.05, 0.04, 0.025, 0, 0, Math.PI * 2); ctx.fill();
}
function shoe(ctx, x, y, sx) {
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(x + sx * 0.03, y, 0.175, 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath(); ctx.ellipse(x - sx * 0.03, y - 0.05, 0.08, 0.025, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * drawWick(ctx, x, y, scale, s)
 *   s.expr, s.pose ('stand'|'sit'|'throne'), s.arms {L:[x,y], R:[x,y]} (local units),
 *   s.flare 0..1, s.t (seconds), s.costume ('tunic'|'king'), s.opts {wax, seed, bodyScale}
 */
export function drawWick(ctx, x, y, scale, s = {}) {
  const o = s.opts || {};
  const R = 0.5 * (o.bodyScale ?? 1), BH = 0.84, LEG = 0.36, W = 1.16, H = 1.42, SINK = 0.14;
  const t = s.t ?? 0, e = EXPRESSIONS[s.expr || "calm"], flare = s.flare ?? 0;
  const seat = s.pose === "sit" ? LEG - 0.06 : 0;
  const bob = 0.01 * Math.sin(t * 1.6);
  const top = -(LEG + BH) + seat + bob;           // rim top
  const bot = top + BH;                            // body bottom
  const wax = o.wax || "#e9d9b3";

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const hy = top + SINK - H / 2;                   // flame centre
  const g = ctx.createRadialGradient(0, hy + 0.1, 0, 0, hy + 0.1, 2.1 + flare);
  g.addColorStop(0, `rgba(255,190,70,${0.3 + flare * 0.25})`);
  g.addColorStop(0.5, `rgba(255,160,40,${0.1 + flare * 0.1})`);
  g.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, hy + 0.1, 2.1 + flare, 0, Math.PI * 2); ctx.fill();

  if (s.pose !== "throne") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(0, 0, 0.62, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }

  if (s.costume === "king") {
    ctx.fillStyle = "#8e2433";
    ctx.beginPath();
    ctx.moveTo(-R - 0.06, top + 0.08); ctx.lineTo(R + 0.06, top + 0.08);
    ctx.lineTo(R + 0.34, bot + 0.05); ctx.lineTo(-R - 0.34, bot + 0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.moveTo(R, top + 0.08); ctx.lineTo(R + 0.06, top + 0.08); ctx.lineTo(R + 0.34, bot + 0.05); ctx.lineTo(R, bot + 0.05); ctx.fill();
  }

  if (s.pose === "throne") {
    for (const sx of [-1, 1]) { hose(ctx, [sx * 0.19, bot - 0.02], [sx * 0.2, bot + 0.2], [sx * 0.2, bot + 0.42], 0.075); shoe(ctx, sx * 0.24, bot + 0.46, sx); }
  } else if (s.pose === "sit") {
    for (const sx of [-1, 1]) { hose(ctx, [sx * 0.19, bot - 0.03], [sx * 0.3, bot], [sx * 0.4, -0.08], 0.075); shoe(ctx, sx * 0.44, -0.09, sx); }
  } else {
    for (const sx of [-1, 1]) { hose(ctx, [sx * 0.18, bot - 0.02], [sx * 0.19, bot + 0.15], [sx * 0.2, -0.1], 0.075); shoe(ctx, sx * 0.28, -0.1, sx); }
  }

  // ── flame head ──
  ctx.save();
  ctx.translate(0, top + SINK);
  ctx.rotate(0.03 * Math.sin(t * 0.9 + 1.3) + 0.015 * Math.sin(t * 2.1));
  ctx.scale(1 + flare * 0.05, 1 + 0.01 * Math.sin(t * 2.2) + flare * 0.15);
  ctx.translate(0, -H / 2);
  flamePath(ctx, W, H);
  const fg = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  fg.addColorStop(0, GOLD_EDGE); fg.addColorStop(0.35, GOLD); fg.addColorStop(1, GOLD_EDGE);
  ctx.fillStyle = fg; ctx.fill();
  ctx.lineWidth = 0.028; ctx.strokeStyle = OUTLINE; ctx.lineJoin = "round"; ctx.stroke();
  ctx.save(); ctx.translate(0.07, 0.17); ctx.scale(0.74, 0.74);
  flamePath(ctx, W, H, -0.14, 0.9);
  ctx.fillStyle = flare > 0.2 ? "#ffe07a" : GOLD_CORE; ctx.globalAlpha = 0.85; ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.ellipse(-0.3, -0.05, 0.035, 0.17, 0.25, 0, Math.PI * 2); ctx.fill();
  drawFace(ctx, e, t, o.seed ?? 3);
  ctx.restore();

  // ── wax body ──
  const bg = ctx.createLinearGradient(-R, 0, R, 0);
  bg.addColorStop(0, shade(wax, 0.86)); bg.addColorStop(0.3, shade(wax, 1.03)); bg.addColorStop(0.7, wax); bg.addColorStop(1, shade(wax, 0.82));
  ctx.fillStyle = bg;
  roundRectPath(ctx, -R, top + 0.04, R * 2, BH - 0.04, 0.05, 0.1); ctx.fill();
  if (s.costume === "tunic") {
    ctx.save(); roundRectPath(ctx, -R, top + 0.04, R * 2, BH - 0.04, 0.05, 0.1); ctx.clip();
    ctx.fillStyle = "#c4623a"; ctx.fillRect(-R - 0.1, top + BH * 0.5, R * 2 + 0.2, BH);
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(R * 0.5, top + BH * 0.5, R, BH);
    ctx.fillStyle = "#e9b949"; ctx.fillRect(-R - 0.1, top + BH * 0.5, R * 2 + 0.2, 0.055);
    ctx.restore();
  }
  const band = shade(wax, 1.07);
  ctx.fillStyle = band;
  ctx.beginPath(); ctx.ellipse(0, top + 0.03, R + 0.03, 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(wax, 0.78);
  ctx.beginPath(); ctx.ellipse(0, top + 0.015, R - 0.04, 0.05, 0, Math.PI, Math.PI * 2); ctx.fill();
  // thick drip band with long drips
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.moveTo(-R - 0.03, top + 0.03);
  const drips = [[-0.33, 0.3], [-0.1, 0.22], [0.13, 0.34], [0.36, 0.24]];
  let px = -R - 0.03;
  for (const [dx, len] of drips) {
    const w = 0.075;
    ctx.quadraticCurveTo((px + dx - w) / 2, top + 0.22, dx - w, top + 0.16);
    ctx.lineTo(dx - w, top + len);
    ctx.arc(dx, top + len, w, Math.PI, 0, true);
    ctx.lineTo(dx + w, top + 0.16);
    px = dx + w;
  }
  ctx.quadraticCurveTo(R + 0.03, top + 0.15, R + 0.03, top + 0.03);
  ctx.closePath(); ctx.fill();
  roundRectPath(ctx, R * 0.62, top + 0.44, 0.12, 0.13, 0.06, 0.06); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (const [dx, len] of drips) { ctx.beginPath(); ctx.ellipse(dx - 0.02, top + len * 0.62, 0.012, len * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(-0.1, top + 0.02, 0.2, 0.018, 0, 0, Math.PI * 2); ctx.fill();
  if (s.costume === "king") {
    ctx.fillStyle = "#e0a82e";
    roundRectPath(ctx, -R - 0.06, top + 0.08, (R + 0.06) * 2, 0.1, 0.05, 0.05); ctx.fill();
  }

  // ── arms ──
  const arms = s.arms || {};
  for (const [side, sx] of [["L", -1], ["R", 1]]) {
    const a = [sx * (R - 0.03), top + BH * 0.45];
    const def = [sx * (R + 0.2), top + BH * 0.9 + 0.015 * Math.sin(t * 1.6 + sx)];
    const h = arms[side] ? [arms[side][0], arms[side][1] + seat + bob] : def;
    const c = [sx * Math.max(Math.abs(a[0]), Math.abs(h[0])) + sx * 0.12, (a[1] + h[1]) / 2 - 0.1];
    hose(ctx, a, c, h, 0.075);
    mitten(ctx, h[0], h[1], sx);
  }
  ctx.restore();
}

function drawFace(ctx, e, t, seed) {
  const EX = 0.175, EY = 0.14, MY = 0.36, BY = EY - 0.19 + e.by;
  const blink = ((t + seed * 0.7) % 3.7) < 0.12;
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = "round";
  for (const sx of [-1, 1]) {
    const ex = sx * EX;
    if (e.closed === "down" || e.closed === "up" || blink) {
      const d = e.closed === "up" ? -1 : 1;
      ctx.lineWidth = 0.028; ctx.beginPath();
      ctx.moveTo(ex - 0.06, EY); ctx.quadraticCurveTo(ex, EY + (blink && !e.closed ? 0.005 : d * 0.055), ex + 0.06, EY); ctx.stroke();
    } else {
      const ry = (e.closed === "half" ? 0.06 : 0.095) * e.eye, rx = 0.066 * e.eye;
      ctx.beginPath(); ctx.ellipse(ex, EY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex + 0.018, EY - ry * 0.45, 0.018, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK;
      if (e.closed === "half") { ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(ex - 0.07, EY - 0.04); ctx.lineTo(ex + 0.07, EY - 0.04); ctx.stroke(); }
    }
    const raise = sx === 1 ? (e.raise || 0) : 0;
    ctx.save(); ctx.translate(ex, BY - raise); ctx.rotate(sx * e.tilt);
    ctx.lineWidth = 0.022; ctx.beginPath();
    ctx.moveTo(-0.075, 0.01); ctx.quadraticCurveTo(0, -0.04 * e.arch, 0.075, 0.01); ctx.stroke();
    ctx.restore();
  }
  if (e.mouth === "o") {
    ctx.beginPath(); ctx.ellipse(0, MY, e.mw, e.mw * 1.25, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.lineWidth = 0.026; ctx.beginPath();
    ctx.moveTo(-e.mw, MY - Math.max(0, e.c) * 0.25); ctx.quadraticCurveTo(0, MY + e.c * 1.5, e.mw, MY - Math.max(0, e.c) * 0.25); ctx.stroke();
  }
}

export function roundRectPath(ctx, x, y, w, h, rTop, rBot) {
  ctx.beginPath();
  ctx.moveTo(x + rTop, y); ctx.lineTo(x + w - rTop, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rTop);
  ctx.lineTo(x + w, y + h - rBot); ctx.quadraticCurveTo(x + w, y + h, x + w - rBot, y + h);
  ctx.lineTo(x + rBot, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rBot);
  ctx.lineTo(x, y + rTop); ctx.quadraticCurveTo(x, y, x + rTop, y); ctx.closePath();
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
