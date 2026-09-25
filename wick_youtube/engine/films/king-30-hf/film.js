// KING-30 (Higgsfield stills edition). The eight shots are Higgsfield images
// generated with the locked Wick element (5e934732…) + the style block; code
// does everything else: camera moves, transitions, bubble, counters,
// sparkles, falling grain, captions, title. Audio = films/king-30/mix.wav.
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, pop, rng } from "../../lib2d/ease.js";
import { makeWarp } from "../../lib2d/warp.js";

// ── RIGS: every moving part, measured on the images (1024-wide reference) ──
const sway = (t, f = 2.1, a = 0.04, ph = 0) => a * Math.sin(t * f + ph) + a * 0.4 * Math.sin(t * f * 2.3 + ph * 1.7);
const bump = (t, t0, len = 0.6) => Math.sin(Math.PI * clamp((t - t0) / len));
const RIGS = {
  1: (t) => {   // inventor walks in carrying the board; king watches
    const walking = 1 - seg(t, 3.0, 3.6), ph = t * 6.2, bow = bump(t, 4.2, 0.9);
    return {
      handles: [
        { type: "move", c: [712, 320], r: [175, 265], d: [0, -Math.abs(Math.sin(ph)) * 7 * walking + bow * 9] },
        { type: "rot", pivot: [672, 440], c: [668, 492], r: [42, 62], a: Math.sin(ph) * 0.16 * walking },
        { type: "rot", pivot: [768, 440], c: [778, 492], r: [48, 62], a: -Math.sin(ph) * 0.16 * walking },
        { type: "rot", pivot: [700, 305], c: [690, 190], r: [120, 125], a: sway(t, 2.3, 0.035) + bow * 0.09 },
        { type: "rot", pivot: [515, 272], c: [515, 222], r: [52, 58], a: sway(t, 1.9, 0.05, 1) },
        { type: "scale", pivot: [515, 330], c: [515, 330], r: [70, 60], s: [1, 1 + 0.012 * Math.sin(t * 1.7)] },
      ],
      eyes: [{ x: 672, y: 232, rx: 12, ry: 19 }, { x: 722, y: 230, rx: 12, ry: 19 }, { x: 503, y: 237, rx: 5, ry: 8 }, { x: 528, y: 237, rx: 5, ry: 8 }],
      glows: [[700, 190, 150], [515, 225, 70]],
      stars: [[320, 40, 70, 290], [470, 40, 80, 110], [645, 40, 70, 60]],
    };
  },
  2: (t) => {   // the king, delighted, throws his arms open
    const open = bump(t, 9.15, 1.0);
    return {
      handles: [
        { type: "rot", pivot: [515, 370], c: [515, 220], r: [185, 200], a: sway(t, 2.0, 0.03) },
        { type: "rot", pivot: [338, 410], c: [245, 350], r: [140, 105], a: 0.09 * Math.sin(t * 3.1) - open * 0.18 },
        { type: "rot", pivot: [692, 410], c: [790, 350], r: [140, 105], a: -0.09 * Math.sin(t * 3.1 + 0.6) + open * 0.18 },
        { type: "rot", pivot: [560, 150], c: [585, 105], r: [95, 60], a: 0.04 * Math.sin(t * 2.6) },
        { type: "move", c: [515, 320], r: [360, 330], d: [0, -Math.abs(Math.sin(t * 4.5)) * 4] },
      ],
      eyes: [{ x: 468, y: 270, rx: 21, ry: 28 }, { x: 560, y: 270, rx: 21, ry: 28 }],
      glows: [[515, 230, 230]],
    };
  },
  3: (t) => {   // the king offers gold, land, a palace; the inventor is unsure
    const offer = Math.max(bump(t, 11.35, 0.5), bump(t, 11.8, 0.5), bump(t, 12.25, 0.5));
    return {
      handles: [
        { type: "rot", pivot: [735, 300], c: [675, 295], r: [80, 45], a: -0.22 * offer + 0.04 * Math.sin(t * 3) },
        { type: "rot", pivot: [790, 250], c: [790, 185], r: [80, 85], a: sway(t, 2.2, 0.035, 2) },
        { type: "rot", pivot: [210, 290], c: [210, 190], r: [85, 100], a: sway(t, 1.8, 0.04) + 0.06 * Math.sin(t * 1.3) },
        { type: "rot", pivot: [245, 380], c: [248, 362], r: [45, 32], a: 0.1 * Math.sin(t * 6) },
      ],
      eyes: [{ x: 224, y: 233, rx: 10, ry: 16 }, { x: 262, y: 233, rx: 10, ry: 16 }],
      glows: [[210, 195, 110], [790, 185, 100]],
      candles: [[52, 50], [75, 85], [30, 80], [582, 78], [437, 165], [490, 185], [25, 410], [92, 475], [935, 480], [1005, 410], [1020, 70]],
      glint: [[440, 380], [470, 372], [415, 388]],
    };
  },
  4: (t) => {   // "Grain," he said — the single grain, held up
    return {
      handles: [
        { type: "rot", pivot: [340, 395], c: [340, 220], r: [200, 220], a: sway(t, 1.7, 0.022) },
        { type: "move", c: [605, 290], r: [90, 120], d: [2 * Math.sin(t * 2.2), -7 * (0.5 + 0.5 * Math.sin(t * 2.2))] },
        { type: "scale", pivot: [340, 560], c: [340, 470], r: [220, 130], s: [1, 1 + 0.01 * Math.sin(t * 1.7)] },
      ],
      eyes: [],
      glows: [[340, 230, 240]],
      candles: [[1000, 420], [935, 490], [80, 230], [40, 255], [115, 255]],
      glint: [[550, 238]],
    };
  },
  5: (t) => {   // the mitten places the grains, one square at a time
    const k = Math.max(bump(t, 16.1, 0.8), bump(t, 18.1, 0.8), bump(t, 19.5, 0.8));
    return {
      handles: [{ type: "move", c: [835, 235], r: [150, 125], d: [-14 * k, 26 * k] }],
      eyes: [], glows: [], candles: [[80, 20], [950, 40], [880, 15]],
      glint: [[540, 372], [645, 375], [820, 380]],
    };
  },
  6: (t) => ({ handles: [], eyes: [], glows: [], candles: [[122, 70], [1015, 280], [595, 15]], ribbon: true }),
  7: (t) => {   // the king laughs; the inventor waits
    const l = Math.abs(Math.sin(t * 9.5));
    return {
      handles: [
        { type: "move", c: [720, 300], r: [240, 290], d: [0, -l * 9] },
        { type: "scale", pivot: [700, 470], c: [690, 360], r: [150, 130], s: [1 + l * 0.015, 1 - l * 0.02] },
        { type: "rot", pivot: [735, 250], c: [735, 165], r: [120, 110], a: 0.05 * Math.sin(t * 19) },
        { type: "rot", pivot: [240, 320], c: [240, 225], r: [85, 105], a: sway(t, 2.0, 0.035) },
      ],
      eyes: [{ x: 243, y: 258, rx: 11, ry: 18 }, { x: 287, y: 258, rx: 11, ry: 18 }],
      glows: [[240, 235, 110], [735, 180, 140]],
      candles: [[100, 60], [450, 130], [528, 200], [552, 185], [575, 200], [950, 200], [980, 185], [1010, 200]],
    };
  },
  8: (t) => {   // the grain mountain; the crown flies; the king panics
    const u = seg(t, 25.55, 30.5);
    return {
      handles: [
        { type: "rot", pivot: [702, 302], c: [668, 262], r: [62, 62], a: 0.09 * Math.sin(t * 21) },
        { type: "rot", pivot: [822, 306], c: [882, 276], r: [72, 60], a: -0.09 * Math.sin(t * 23) },
        { type: "rot", pivot: [760, 305], c: [760, 245], r: [80, 95], a: 0.035 * Math.sin(t * 16) },
        { type: "move", c: [855, 130], r: [75, 62], d: [8 * u, -22 * u + 3 * Math.sin(t * 5)] },
        { type: "rot", pivot: [855, 130], c: [855, 130], r: [75, 62], a: 0.35 * u },
        { type: "rot", pivot: [230, 335], c: [230, 262], r: [70, 85], a: sway(t, 1.8, 0.035) },
      ],
      eyes: [{ x: 240, y: 292, rx: 8, ry: 13 }, { x: 268, y: 292, rx: 8, ry: 13 }],
      glows: [[230, 265, 100], [760, 250, 120]],
      candles: [[60, 215], [80, 235], [35, 235], [975, 215], [995, 235], [15, 390], [60, 440], [95, 465], [160, 515], [950, 465], [1000, 395], [890, 530], [365, 215], [670, 215]],
      pour: [430, 610],
    };
  },
};

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
  const warps = {};
  for (const k of Object.keys(imgs)) warps[k] = makeWarp(imgs[k]);
  const noise = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const id = g.createImageData(256, 256); const r = rng(5); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; })();

  function living(s, t) {
    // render the puppet-warped still, then paint light and life into it
    const wp = warps[s.img], rig = RIGS[s.img](t), g = wp.buf.getContext("2d"), K = wp.K;
    wp.render(rig.handles);
    const ph = (t * 0.83 + s.img * 1.7) % 3.4;
    if (rig.eyes.length) wp.blink(rig.handles, rig.eyes, ph < 0.14 ? Math.sin(Math.PI * ph / 0.14) : 0);
    g.save(); g.globalCompositeOperation = "lighter";
    const flick = (i) => 0.75 + 0.25 * Math.sin(t * 9.3 + i * 2.1) * Math.sin(t * 5.7 + i);
    for (const [x, y, r] of rig.glows || []) {
      const [dx, dy] = wp.disp(rig.handles, x, y), k2 = 0.16 + 0.05 * Math.sin(t * 3.1 + x);
      const gr = g.createRadialGradient((x + dx) * K, (y + dy) * K, 0, (x + dx) * K, (y + dy) * K, r * K * 1.4);
      gr.addColorStop(0, `rgba(255,190,90,${k2})`); gr.addColorStop(1, "rgba(255,160,60,0)");
      g.fillStyle = gr; g.beginPath(); g.arc((x + dx) * K, (y + dy) * K, r * K * 1.4, 0, 7); g.fill();
    }
    (rig.candles || []).forEach(([x, y], i) => {
      const f = flick(i), gr = g.createRadialGradient(x * K, y * K, 0, x * K, y * K, 38 * K);
      gr.addColorStop(0, `rgba(255,200,110,${0.32 * f})`); gr.addColorStop(1, "rgba(255,170,70,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x * K, y * K, 38 * K, 0, 7); g.fill();
    });
    (rig.stars || []).forEach(([x0, y0, w, h], j) => { const r = rng(j + 3); for (let i = 0; i < 10; i++) {
      const x = x0 + r() * w, y = y0 + r() * h, a = Math.max(0, Math.sin(t * (1.5 + r() * 2) + r() * 6)) ** 6;
      g.fillStyle = `rgba(255,245,210,${a * 0.9})`; g.beginPath(); g.arc(x * K, y * K, 1.6 * K, 0, 7); g.fill(); } });
    (rig.glint || []).forEach(([x, y], i) => { const a = Math.max(0, Math.sin(t * 2.4 + i * 2.3)) ** 8;
      if (a > 0.02) { g.fillStyle = `rgba(255,250,220,${a})`; const r2 = 9 * K * a; g.beginPath(); g.moveTo(x * K, y * K - r2); g.quadraticCurveTo(x * K, y * K, x * K + r2, y * K); g.quadraticCurveTo(x * K, y * K, x * K, y * K + r2); g.quadraticCurveTo(x * K, y * K, x * K - r2, y * K); g.quadraticCurveTo(x * K, y * K, x * K, y * K - r2); g.fill(); } });
    if (rig.ribbon) { // a pulse of light travelling along the golden ribbon
      const path = [[120, 540], [250, 380], [420, 282], [600, 215], [800, 140], [1000, 22]];
      for (let q = 0; q < 3; q++) {
        const u = ((t - 21.8) * 0.9 + q * 0.33) % 1, seg2 = u * (path.length - 1), i = Math.min(path.length - 2, Math.floor(seg2)), f2 = seg2 - i;
        const x = lerp(path[i][0], path[i + 1][0], f2), y = lerp(path[i][1], path[i + 1][1], f2);
        const gr = g.createRadialGradient(x * K, y * K, 0, x * K, y * K, 90 * K); gr.addColorStop(0, "rgba(255,225,150,0.55)"); gr.addColorStop(1, "rgba(255,200,100,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x * K, y * K, 90 * K, 0, 7); g.fill();
      }
      const r = rng(4); for (let i = 0; i < 40; i++) { const x = 150 + r() * 850, sp = 30 + r() * 50, y = 560 - ((t * sp + r() * 600) % 600);
        g.fillStyle = `rgba(255,220,140,${0.6 * r()})`; g.beginPath(); g.arc(x * K, y * K, (1 + r() * 2) * K, 0, 7); g.fill(); }
    }
    if (rig.pour) { // grain keeps pouring from the ceiling
      const r = rng(8); for (let i = 0; i < 120; i++) { const x = rig.pour[0] + r() * (rig.pour[1] - rig.pour[0]), sp = 180 + r() * 220, y = ((t * sp + r() * 400) % 330) - 20;
        g.fillStyle = `rgba(255,${200 + Math.floor(r() * 40)},${110 + Math.floor(r() * 40)},0.85)`; g.beginPath(); g.ellipse(x * K, y * K, 2.6 * K, 1.4 * K, r() * 3 + t, 0, 7); g.fill(); }
    }
    // dust in the candlelight
    { const r = rng(s.img * 11); for (let i = 0; i < 26; i++) { const x = (r() * 1024 + t * (6 + r() * 10)) % 1024, y = (r() * 571 + Math.sin(t * 0.7 + i) * 8) % 571;
      g.fillStyle = `rgba(255,220,170,${0.12 + 0.12 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(x * K, y * K, (1 + r() * 1.6) * K, 0, 7); g.fill(); } }
    g.restore();
    return wp.buf;
  }
  function drawShot(s, t, alpha) {
    const im = living(s, t), k = easeInOut(seg(t, s.t0, Math.min(s.t1, 30.5)));
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
