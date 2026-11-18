// WICK HD — painted 2D (plain Canvas), traced from Dre's reference renders
// (black-background front view + pharmacy + grocery shots). Not a redesign:
// every landmark below is a measured point from the reference, in units of
// body width, origin on the ground between the feet, y DOWN.
//
//  - flame: glowing glossy teardrop, tip LEFT of centre, S-curve on the right,
//    lighter inner flame in the lower right, thin warm-brown outline
//  - face: tall glossy dark eyes low in the flame, catchlight upper right,
//    thin arched brows (right one higher), wide smirk
//  - body: cream wax cylinder, visible cup rim the flame sits in, thick glossy
//    drip band, one lone droplet on the right, soft cylindrical shading
//  - limbs: thin matte-black rubber hose, big thumbed mittens, big round shoes
//
// Costumes (crown, cape, ermine) are allowed on story characters by Dre's
// direction 2026-09-25 ("dress him up if he's a king, put a crown on him").

// ── measured outline points (flame-local: origin = centre of the cup opening) ──
const FLAME = [
  [-0.156, -1.47], [0.0, -1.38], [0.19, -1.2], [0.37, -0.95], [0.49, -0.67], [0.515, -0.42],
  [0.485, -0.18], [0.38, 0.0], [0.19, 0.1], [0.0, 0.13], [-0.2, 0.1], [-0.385, 0.0],
  [-0.5, -0.18], [-0.535, -0.42], [-0.51, -0.69], [-0.42, -0.96], [-0.26, -1.25],
];
const INNER = [
  [-0.05, -1.2], [0.19, -1.03], [0.38, -0.74], [0.45, -0.36], [0.36, -0.07], [0.1, 0.03],
  [-0.18, -0.05], [-0.31, -0.28], [-0.31, -0.62], [-0.2, -0.95],
];
const RIM_Y = -1.24, R = 0.48, BODY_BOT = -0.43;

// Catmull-Rom through points as cubic beziers. open=true keeps the ends sharp
// (the flame tip is both ends).
function spline(ctx, pts, open = true) {
  const n = pts.length, P = (i) => pts[open ? Math.max(0, Math.min(n - 1, i)) : (i + n) % n];
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = open ? n - 1 : n;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}
function flamePath(ctx, pts) {
  ctx.beginPath(); spline(ctx, [...pts, pts[0]], true); ctx.closePath();
}

export const EXPRESSIONS = {
  // eyes: 'open' | 'happy' (^ ^) | 'closed' (u u) | 'half'
  happy:     { eyes: "open", eye: 1.0, bl: 0, br: 0.02, arch: 1, mouth: "smirk", mw: 1 },
  smile:     { eyes: "open", eye: 1.0, bl: 0, br: 0.015, arch: 1, mouth: "smile", mw: 1.1 },
  calm:      { eyes: "closed", eye: 1.0, bl: 0.01, br: 0.01, arch: 0.8, mouth: "smile", mw: 0.8 },
  proud:     { eyes: "happy", eye: 1.0, bl: -0.02, br: -0.02, arch: 1.1, mouth: "smile", mw: 1.1 },
  laugh:     { eyes: "happy", eye: 1.0, bl: -0.04, br: -0.04, arch: 1.3, mouth: "open", mw: 1.2 },
  curious:   { eyes: "open", eye: 1.12, bl: -0.01, br: -0.06, arch: 1.3, mouth: "o", mw: 0.7 },
  alarmed:   { eyes: "open", eye: 1.28, bl: -0.07, br: -0.07, arch: 1.4, tiltIn: 0.35, mouth: "o", mw: 1.0 },
  delighted: { eyes: "open", eye: 1.15, bl: -0.05, br: -0.05, arch: 1.4, mouth: "open", mw: 1.1 },
  determined:{ eyes: "open", eye: 0.95, bl: 0.02, br: 0.02, arch: 0.3, tiltIn: -0.35, mouth: "smirk", mw: 0.8 },
  sombre:    { eyes: "open", eye: 0.95, bl: 0.01, br: 0.01, arch: 0.4, tiltIn: 0.35, mouth: "frown", mw: 0.8 },
};

const INK = "#1c140c";

function tube(ctx, pts, w, S) {
  // matte black rubber hose: dark core + soft top-left sheen
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); spline(ctx, pts, true); ctx.lineWidth = w; ctx.strokeStyle = "#1b1917"; ctx.stroke();
  ctx.save(); ctx.translate(-w * 0.18, -w * 0.12);
  ctx.beginPath(); spline(ctx, pts, true); ctx.lineWidth = w * 0.3; ctx.strokeStyle = "rgba(255,240,220,0.13)"; ctx.stroke();
  ctx.restore();
}
function mitten(ctx, x, y, sx, rot = 0, pointing = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(-0.03, -0.05, 0.01, 0, 0, 0.15);
  g.addColorStop(0, "#4a4440"); g.addColorStop(0.5, "#221f1c"); g.addColorStop(1, "#141210");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 0.105, 0.125, 0, 0, Math.PI * 2); ctx.fill();
  // thumb toward the body
  ctx.beginPath(); ctx.ellipse(-sx * 0.095, -0.055, 0.045, 0.07, -sx * 0.55, 0, Math.PI * 2); ctx.fill();
  if (pointing) { ctx.beginPath(); ctx.ellipse(sx * 0.02, -0.15, 0.036, 0.09, sx * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "rgba(255,245,230,0.16)";
  ctx.beginPath(); ctx.ellipse(-0.03, -0.06, 0.04, 0.022, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function shoe(ctx, x, y, sx, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(sx * 0.08); ctx.scale(s, s);
  const g = ctx.createRadialGradient(-0.04, -0.06, 0.01, 0, 0, 0.22);
  g.addColorStop(0, "#4a4440"); g.addColorStop(0.45, "#221f1c"); g.addColorStop(1, "#121110");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(sx * 0.02, 0, 0.19, 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,245,230,0.14)";
  ctx.beginPath(); ctx.ellipse(-0.04, -0.055, 0.09, 0.022, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFace(ctx, e, look, t, seed, blinkOff) {
  const dx = look * 0.075, sq = 1 - Math.abs(look) * 0.12;       // turn the face toward look
  const EY = -0.45, MY = -0.3;
  const blink = !blinkOff && ((t + seed * 0.77) % 3.9) < 0.11;
  ctx.lineCap = "round";
  for (const sx of [-1, 1]) {
    const ex = dx + sx * 0.165 * sq;
    const eyes = blink && e.eyes === "open" ? "closed" : e.eyes;
    if (eyes === "open" || eyes === "half") {
      const rx = 0.058 * e.eye, ry = (eyes === "half" ? 0.05 : 0.085) * e.eye;
      const g = ctx.createRadialGradient(ex, EY + ry * 0.4, 0, ex, EY, ry * 1.2);
      g.addColorStop(0, "#3a2413"); g.addColorStop(1, "#140c06");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, EY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex + 0.02 + look * 0.01, EY - ry * 0.42, 0.021 * e.eye, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(ex - 0.018, EY + ry * 0.45, 0.008, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (eyes === "half") { ctx.strokeStyle = INK; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(ex - 0.07, EY - 0.035); ctx.lineTo(ex + 0.07, EY - 0.035); ctx.stroke(); }
    } else {
      const up = eyes === "happy" ? -1 : 1;
      ctx.strokeStyle = INK; ctx.lineWidth = 0.026; ctx.beginPath();
      ctx.moveTo(ex - 0.06, EY); ctx.quadraticCurveTo(ex, EY + up * 0.06, ex + 0.06, EY); ctx.stroke();
    }
    // brow: thin, arched, right one sits a touch higher (the reference smirk)
    const by = EY - 0.225 + (sx < 0 ? e.bl : e.br) - (sx > 0 ? 0.012 : 0);
    ctx.save(); ctx.translate(ex, by); ctx.rotate(sx * (e.tiltIn || 0) * 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.021; ctx.beginPath();
    ctx.moveTo(-0.075, 0.012); ctx.quadraticCurveTo(0, -0.035 * e.arch, 0.075, 0.012); ctx.stroke();
    ctx.restore();
  }
  const mx = dx + 0.005, w = 0.165 * e.mw * sq;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 0.024;
  if (e.mouth === "smirk") {
    ctx.beginPath(); ctx.moveTo(mx - w, MY - 0.005); ctx.quadraticCurveTo(mx - 0.01, MY + 0.105, mx + w, MY - 0.03); ctx.stroke();
  } else if (e.mouth === "smile") {
    ctx.beginPath(); ctx.moveTo(mx - w, MY - 0.02); ctx.quadraticCurveTo(mx, MY + 0.11, mx + w, MY - 0.02); ctx.stroke();
  } else if (e.mouth === "frown") {
    ctx.beginPath(); ctx.moveTo(mx - w * 0.7, MY + 0.04); ctx.quadraticCurveTo(mx, MY - 0.03, mx + w * 0.7, MY + 0.04); ctx.stroke();
  } else if (e.mouth === "o") {
    ctx.fillStyle = "#2a1208"; ctx.beginPath(); ctx.ellipse(mx, MY + 0.01, 0.045 * e.mw, 0.058 * e.mw, 0, 0, Math.PI * 2); ctx.fill();
  } else if (e.mouth === "open") {
    ctx.save(); ctx.beginPath(); ctx.moveTo(mx - w, MY - 0.03); ctx.quadraticCurveTo(mx, MY + 0.2, mx + w, MY - 0.03); ctx.closePath();
    ctx.fillStyle = "#3b1206"; ctx.fill(); ctx.clip();
    ctx.fillStyle = "#e0584a"; ctx.beginPath(); ctx.ellipse(mx, MY + 0.12, w * 0.55, 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(mx - w, MY - 0.03); ctx.quadraticCurveTo(mx, MY + 0.2, mx + w, MY - 0.03); ctx.closePath(); ctx.stroke();
  }
}

function crown(ctx) {
  // gold crown perched on the flame, tilted with it
  ctx.save(); ctx.translate(-0.06, -0.93); ctx.rotate(-0.1);
  const g = ctx.createLinearGradient(0, -0.3, 0, 0.08);
  g.addColorStop(0, "#ffe486"); g.addColorStop(0.45, "#f2b72e"); g.addColorStop(1, "#a86a0c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.27, 0.06); ctx.lineTo(-0.3, -0.2); ctx.lineTo(-0.16, -0.07); ctx.lineTo(-0.08, -0.29);
  ctx.lineTo(0, -0.1); ctx.lineTo(0.09, -0.29); ctx.lineTo(0.17, -0.07); ctx.lineTo(0.31, -0.2); ctx.lineTo(0.28, 0.06);
  ctx.quadraticCurveTo(0, 0.11, -0.27, 0.06); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(90,50,0,0.6)"; ctx.lineWidth = 0.012; ctx.stroke();
  ctx.fillStyle = "#d9a02a"; ctx.beginPath(); ctx.moveTo(-0.28, -0.02); ctx.quadraticCurveTo(0, 0.03, 0.29, -0.02); ctx.lineTo(0.28, 0.06); ctx.quadraticCurveTo(0, 0.11, -0.27, 0.06); ctx.fill();
  for (const [x, y, c] of [[-0.3, -0.21, "#fff1b0"], [-0.08, -0.3, "#fff1b0"], [0.09, -0.3, "#fff1b0"], [0.31, -0.21, "#fff1b0"]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 0.028, 0, Math.PI * 2); ctx.fill();
  }
  for (const [x, c] of [[-0.14, "#c0283a"], [0.01, "#2a62c9"], [0.16, "#c0283a"]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, 0.02, 0.028, 0.034, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(x - 0.008, 0.008, 0.008, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(-0.24, -0.04, 0.2, 0.012);
  ctx.restore();
}

/**
 * drawWickHD(ctx, x, y, scale, s)
 *  s.t, s.expr, s.look (-1..1 face turn), s.pose 'stand'|'walk'|'sit', s.walk (phase, radians)
 *  s.arms {L:[x,y,pointing?], R:[x,y,pointing?]} hand targets (body units)
 *  s.flare 0..1, s.lean (rad, whole body around the feet), s.squash, s.bob
 *  s.king (crown + cape + ermine), s.glow multiplier, s.seed
 */
export function drawWickHD(ctx, x, y, scale, s = {}) {
  const t = s.t ?? 0, e = EXPRESSIONS[s.expr || "happy"], seed = s.seed ?? 3, flare = s.flare ?? 0;
  const walk = s.pose === "walk", sit = s.pose === "sit";
  const ph = s.walk ?? 0;
  const px = ctx.getTransform().a * scale;                          // pixels per unit, for blur sizes
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // ground shadow + warm light pool (the flame lights the floor)
  const glowK = s.glow ?? 1;
  ctx.save(); ctx.scale(1, 0.14);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 3.2);
  g.addColorStop(0, `rgba(255,170,60,${0.28 * glowK})`); g.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.75);
  g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // whole-body transforms: lean, squash, walk bob
  const bob = walk ? -Math.abs(Math.sin(ph)) * 0.05 : 0.008 * Math.sin(t * 1.7);
  ctx.rotate((s.lean ?? 0) + (walk ? Math.sin(ph) * 0.035 : 0));
  const sq = s.squash ?? 0;
  ctx.scale(1 + sq, 1 - sq);
  ctx.translate(0, bob + (s.bob ?? 0));

  // legs + shoes
  const lift = (k) => (walk ? Math.max(0, Math.sin(ph + k)) * 0.09 : 0);
  const legLen = sit ? 0.22 : 0.33;
  for (const sx of [-1, 1]) {
    const L = lift(sx < 0 ? 0 : Math.PI);
    const fx = sx * 0.2 + (walk ? Math.sin(ph + (sx < 0 ? 0 : Math.PI)) * 0.04 : 0);
    const fy = sit ? BODY_BOT + legLen : -0.12 - L;
    tube(ctx, [[sx * 0.185, BODY_BOT - 0.04], [(sx * 0.185 + fx) / 2, (BODY_BOT + fy) / 2], [fx, fy]], 0.085);
    shoe(ctx, fx + sx * 0.09, fy + 0.04, sx, sit ? 1.1 : 1);
  }

  // cape behind (king)
  if (s.king) {
    const cg = ctx.createLinearGradient(-0.9, 0, 0.9, 0);
    cg.addColorStop(0, "#5e0f1c"); cg.addColorStop(0.4, "#9e1f31"); cg.addColorStop(1, "#4d0b16");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(-0.5, -1.18);
    ctx.quadraticCurveTo(-0.7, -0.7, -0.68, -0.1 + (sit ? -0.08 : 0)); ctx.quadraticCurveTo(0, -0.02, 0.68, -0.1 + (sit ? -0.08 : 0));
    ctx.quadraticCurveTo(0.7, -0.7, 0.5, -1.18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e0ab3a"; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(-0.68, -0.1 + (sit ? -0.08 : 0)); ctx.quadraticCurveTo(0, -0.02, 0.68, -0.1 + (sit ? -0.08 : 0)); ctx.stroke();
  }

  // ── cup: back rim, the glow inside it ──
  ctx.fillStyle = "#d9c49a";
  ctx.beginPath(); ctx.ellipse(0, RIM_Y, R + 0.02, 0.095, 0, Math.PI, Math.PI * 2); ctx.fill();
  g = ctx.createRadialGradient(0, RIM_Y, 0, 0, RIM_Y, R);
  g.addColorStop(0, "#ffb640"); g.addColorStop(1, "#b0741e");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, RIM_Y + 0.005, R - 0.06, 0.06, 0, 0, Math.PI * 2); ctx.fill();

  // ── flame ──
  ctx.save();
  ctx.translate(0, RIM_Y);
  const sway = 0.028 * Math.sin(t * 1.1 + seed) + 0.012 * Math.sin(t * 2.7 + seed * 2);
  ctx.rotate(sway + (s.headTilt ?? 0));
  ctx.scale(1 + flare * 0.05, 1 + flare * 0.14 + 0.01 * Math.sin(t * 2.3));
  // outer glow halo
  ctx.save();
  ctx.shadowColor = `rgba(255,160,40,${0.75 + flare * 0.25})`; ctx.shadowBlur = px * (0.35 + flare * 0.3) * glowK;
  flamePath(ctx, FLAME);
  g = ctx.createRadialGradient(0.04, -0.45, 0.02, 0, -0.5, 0.95);
  g.addColorStop(0, flare > 0.3 ? "#fff6cf" : "#ffe38a"); g.addColorStop(0.35, "#ffc73d"); g.addColorStop(0.72, "#f6a316"); g.addColorStop(1, "#e2830b");
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  // lighter inner flame (lower right)
  flamePath(ctx, INNER);
  g = ctx.createRadialGradient(0.1, -0.35, 0.02, 0.08, -0.4, 0.7);
  g.addColorStop(0, "rgba(255,246,205,0.95)"); g.addColorStop(0.55, "rgba(255,222,120,0.85)"); g.addColorStop(1, "rgba(255,200,80,0.6)");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(255,250,220,0.55)"; ctx.lineWidth = 0.012; ctx.stroke();
  // thin warm outline
  flamePath(ctx, FLAME);
  ctx.strokeStyle = "rgba(110,58,6,0.55)"; ctx.lineWidth = 0.016; ctx.stroke();
  // gloss
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath(); ctx.ellipse(-0.36, -0.62, 0.03, 0.17, 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.ellipse(0.4, -0.3, 0.02, 0.1, -0.2, 0, Math.PI * 2); ctx.fill();
  drawFace(ctx, e, s.look ?? 0, t, seed, s.blinkOff);
  if (s.king && s.crown !== false) crown(ctx);
  ctx.restore();

  // ── wax body (front covers the flame's base) ──
  const bodyPath = () => {
    ctx.beginPath(); ctx.moveTo(-R, RIM_Y); ctx.lineTo(-R, BODY_BOT);
    ctx.ellipse(0, BODY_BOT, R, 0.075, 0, Math.PI, 0, true);
    ctx.lineTo(R, RIM_Y); ctx.ellipse(0, RIM_Y, R, 0.095, 0, 0, Math.PI, false); ctx.closePath();
  };
  bodyPath();
  g = ctx.createLinearGradient(-R, 0, R, 0);
  g.addColorStop(0, "#b39a72"); g.addColorStop(0.16, "#dcc79f"); g.addColorStop(0.38, "#f4e6c6");
  g.addColorStop(0.62, "#e7d4ac"); g.addColorStop(0.86, "#c9b188"); g.addColorStop(1, "#a58c66");
  ctx.fillStyle = g; ctx.fill();
  // warm bounce light from the flame on the upper body
  g = ctx.createLinearGradient(0, RIM_Y, 0, BODY_BOT);
  g.addColorStop(0, "rgba(255,190,90,0.28)"); g.addColorStop(0.5, "rgba(255,190,90,0.05)"); g.addColorStop(1, "rgba(60,30,10,0.18)");
  ctx.fillStyle = g; bodyPath(); ctx.fill();

  // drip band: shadow first, then wax
  const drips = [[-0.37, 0.3, 0.075], [-0.14, 0.2, 0.065], [0.08, 0.34, 0.072], [0.3, 0.21, 0.066]];
  const band = () => {
    const pts = [[-R - 0.025, RIM_Y + 0.02], [-R - 0.02, RIM_Y + 0.13]];
    for (const [dx, len, w] of drips) {
      pts.push([dx - w * 1.4, RIM_Y + 0.14], [dx - w, RIM_Y + len * 0.62], [dx - w * 0.55, RIM_Y + len], [dx + w * 0.55, RIM_Y + len], [dx + w, RIM_Y + len * 0.62], [dx + w * 1.4, RIM_Y + 0.14]);
    }
    pts.push([R + 0.02, RIM_Y + 0.12], [R + 0.025, RIM_Y + 0.02]);
    ctx.beginPath(); spline(ctx, pts, true);
    ctx.ellipse(0, RIM_Y, R + 0.025, 0.1, 0, 0, Math.PI, false); ctx.closePath();
  };
  ctx.save(); ctx.translate(0.012, 0.03); band(); ctx.fillStyle = "rgba(95,62,25,0.28)"; ctx.fill(); ctx.restore();
  band();
  g = ctx.createLinearGradient(-R, 0, R, 0);
  g.addColorStop(0, "#c8b089"); g.addColorStop(0.2, "#ecdcb8"); g.addColorStop(0.4, "#fbf0d6"); g.addColorStop(0.7, "#efdfbb"); g.addColorStop(1, "#bea57d");
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (const [dx, len, w] of drips) { ctx.beginPath(); ctx.ellipse(dx - w * 0.45, RIM_Y + len * 0.6, w * 0.16, len * 0.2, 0.05, 0, Math.PI * 2); ctx.fill(); }
  // rim lip highlight
  ctx.strokeStyle = "rgba(255,250,235,0.75)"; ctx.lineWidth = 0.022;
  ctx.beginPath(); ctx.ellipse(0, RIM_Y, R + 0.005, 0.09, 0, Math.PI * 0.62, Math.PI * 0.95); ctx.stroke();
  // the lone droplet on the right
  ctx.fillStyle = "#f2e4c3"; ctx.beginPath(); ctx.ellipse(0.33, -0.74, 0.048, 0.062, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(0.318, -0.76, 0.012, 0.02, 0, 0, Math.PI * 2); ctx.fill();
  // ermine collar (king)
  if (s.king) {
    ctx.fillStyle = "#f6f1e6";
    ctx.beginPath(); ctx.ellipse(0, RIM_Y + 0.07, R + 0.08, 0.12, 0, 0, Math.PI, false); ctx.lineTo(-R - 0.08, RIM_Y + 0.02);
    ctx.ellipse(0, RIM_Y + 0.02, R + 0.08, 0.07, 0, Math.PI, 0, false); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1c1a18";
    for (const dx of [-0.42, -0.2, 0.02, 0.24, 0.44]) { ctx.beginPath(); ctx.ellipse(dx, RIM_Y + 0.1 + Math.abs(dx) * -0.05, 0.016, 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
  }

  // ── arms ──
  const arms = s.arms || {};
  for (const [side, sx] of [["L", -1], ["R", 1]]) {
    const sh = [sx * (R - 0.03), -0.94];
    const swing = walk ? Math.sin(ph + (sx < 0 ? Math.PI : 0)) * 0.06 : 0.012 * Math.sin(t * 1.7 + sx);
    const def = [sx * 0.64, -0.53 + swing];
    const h = arms[side] || def;
    // hose hangs from the side and bows gently outward (reference pose), or follows the hand
    const elbow = [sx * (Math.max(Math.abs(sh[0]), Math.abs(h[0])) + 0.07), sh[1] + (h[1] - sh[1]) * 0.42];
    tube(ctx, [sh, elbow, [h[0], h[1]]], 0.08);
    mitten(ctx, h[0], h[1], sx, h[3] ?? 0, !!h[2]);
  }
  ctx.restore();
}

// warm light the flame throws on the scene (draw after everything, 'lighter')
export function flameLight(ctx, x, y, scale, k = 1) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const cy = y + (RIM_Y - 0.5) * scale;
  const g = ctx.createRadialGradient(x, cy, 0, x, cy, 3.4 * scale);
  g.addColorStop(0, `rgba(255,160,60,${0.22 * k})`); g.addColorStop(0.5, `rgba(255,140,40,${0.07 * k})`); g.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, 3.4 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
