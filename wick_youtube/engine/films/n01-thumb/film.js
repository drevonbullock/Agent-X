// N01 THUMBNAILS: three variants for YouTube Test & Compare, one per second of "film time".
//   node render.mjs --film n01-thumb --scale 2 --stills 0.5,1.5,2.5     3840x2160 PNGs (A, B, C)
// Recipe (see SKILL thumbnails): bright background, 1-3 word ALL-CAPS headline that is NOT the title,
// one huge hero object, Wick with a strong closed-mouth emotion, one red arrow or ring. Max 3 elements.
import { PAL, paper, inkWick, makeStage, sweat, pose } from "../../lib2d/ink.js";
import { stone, canoe } from "../../lib2d/props.js";
import { palm } from "../../lib2d/scene.js";
const TAU = Math.PI * 2;
const RED = "#e0402a", GOLD = "#f7b21b";

// headline: words = [[text, fill]], centred on x, thick ink outline so it reads at phone size
function headline(c, words, x, y, size, gapK = 0.28) {
  c.save(); c.font = `900 ${size}px Serif4`; c.textBaseline = "middle"; c.lineJoin = "round";
  const gap = size * gapK, ws = words.map(([w]) => c.measureText(w).width), total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let cx = x - total / 2;
  words.forEach(([w, fill], i) => {
    c.textAlign = "left";
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillText(w, cx + size * 0.05, y + size * 0.06);       // drop shadow
    c.lineWidth = size * 0.16; c.strokeStyle = fill === PAL.ink ? "#fffaf0" : PAL.ink; c.strokeText(w, cx, y);
    c.fillStyle = fill; c.fillText(w, cx, y);
    cx += ws[i] + gap;
  });
  c.restore();
}
// fat red arrow along a curve (a → b), Kurzgesagt-style, with an ink edge
function arrow(c, ax, ay, bx, by, bend = 0.25) {
  const mx = (ax + bx) / 2 - (by - ay) * bend, my = (ay + by) / 2 + (bx - ax) * bend;
  const ang = Math.atan2(by - my, bx - mx), hl = 70;
  const ex = bx - Math.cos(ang) * hl * 0.8, ey = by - Math.sin(ang) * hl * 0.8;
  c.save(); c.lineCap = "round";
  for (const [w, col] of [[40, PAL.ink], [28, RED]]) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); }
  c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(ang - 0.5) * hl, by - Math.sin(ang - 0.5) * hl); c.lineTo(bx - Math.cos(ang + 0.5) * hl, by - Math.sin(ang + 0.5) * hl); c.closePath();
  c.fillStyle = RED; c.fill(); c.lineWidth = 6; c.strokeStyle = PAL.ink; c.lineJoin = "round"; c.stroke();
  c.restore();
}

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const cream = paper(W, H, "#fbe8c4", 7), sand = paper(W, H, "#f4e2bd", 19);
  const sky = (c, top = "#fffaf0", bottom = "#ffe6b8") => { const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, top); g.addColorStop(1, bottom); c.save(); c.globalAlpha = 0.9; c.fillStyle = g; c.fillRect(0, 0, 1920, 1080); c.restore(); };

  // ---------- A · STILL RICH: the sunken stone that still counts ----------
  const A = {
    bg: cream,
    art(c) {
      sky(c); const S = 380, BED = 975;
      const wg = c.createLinearGradient(0, S, 0, BED); wg.addColorStop(0, "#52cde0"); wg.addColorStop(1, "#1f93b4");
      c.fillStyle = wg; c.fillRect(0, S, 1920, 800);
      c.save(); c.fillStyle = "rgba(255,255,255,0.12)"; for (const [x0, w] of [[700, 120], [1000, 70], [1300, 150], [1650, 80]]) { c.beginPath(); c.moveTo(x0, S); c.lineTo(x0 + w, S); c.lineTo(x0 + w * 2.4 - 220, BED); c.lineTo(x0 - 220, BED); c.closePath(); c.fill(); } c.restore();
      c.save(); c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 3; for (let j = 0; j < 4; j++) { c.beginPath(); for (let x = 0; x <= 1920; x += 30) c.lineTo(x, S + 40 + j * 70 + 6 * Math.sin(x * 0.012 + j)); c.stroke(); } c.restore();
      c.lineWidth = 5; c.strokeStyle = PAL.ink; c.beginPath(); for (let x = 0; x <= 1920; x += 20) c.lineTo(x, S + 5 * Math.sin(x * 0.02)); c.stroke();
      // seabed
      c.fillStyle = "#ead39a"; c.beginPath(); c.moveTo(0, BED); for (let x = 0; x <= 1920; x += 40) c.lineTo(x, BED + 12 * Math.sin(x * 0.006)); c.lineTo(1920, 1080); c.lineTo(0, 1080); c.closePath(); c.fill(); c.lineWidth = 5; c.stroke();
      c.lineCap = "round"; for (let i = 0; i < 9; i++) { const x = 560 + i * 150 + (i % 3) * 30, h = 90 + (i * 41) % 90; if (x > 900 && x < 1500) continue; c.beginPath(); c.moveTo(x, BED + 4); c.quadraticCurveTo(x + 25, BED - h / 2, x + 10, BED - h); c.lineWidth = 9; c.strokeStyle = "#3f8a46"; c.stroke(); }
      // the hero: a huge rai stone standing on the seabed, glowing
      stone(c, 1190, BED - 300, 300, { glow: 1 });
      c.fillStyle = "rgba(255,255,255,0.7)"; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(1230 + 30 * Math.sin(i * 2.1), 450 - i * 12 + (i % 2) * 20 + 30, 7 + (i % 3) * 3, 0, TAU); c.fill(); }
      // Wick up top in his canoe, smug: the stone is still his
      canoe(c, 330, S - 8, 500, 0);
      inkWick(c, 365, S - 24, 112, { face: "proud", arms: pose(10, [[0, "hips"]]), t: 0.4, look: 0.5, glow: 1.2 });
      arrow(c, 1760, 470, 1470, 640, -0.3);
    },
    text(c) { headline(c, [["STILL", PAL.ink], ["RICH", GOLD]], 1150, 170, 190); },
  };

  // ---------- B · 4-TON COIN: Wick shoving the money uphill ----------
  const B = {
    bg: cream,
    art(c) {
      sky(c); const HZ = 640, G = 1000;
      c.fillStyle = "#3fb4cc"; c.fillRect(0, HZ, 1920, G - HZ); c.lineWidth = 4; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(0, HZ); c.lineTo(1920, HZ); c.stroke();
      c.save(); c.strokeStyle = "rgba(255,255,255,0.4)"; c.lineWidth = 3; for (let y = HZ + 30; y < 760; y += 34) { c.beginPath(); for (let x = 0; x <= 1920; x += 30) c.lineTo(x, y + 3 * Math.sin(x * 0.013 + y)); c.stroke(); } c.restore();
      c.fillStyle = "#ecd59e"; c.beginPath(); c.moveTo(0, 790); c.quadraticCurveTo(900, 740, 1920, 800); c.lineTo(1920, 1080); c.lineTo(0, 1080); c.closePath(); c.fill(); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.stroke();
      palm(c, 1780, 800, 380, 0.3, 2);
      stone(c, 1250, G - 330, 330, {});
      // Wick straining into it: leaning forward, both hands on the stone, sweat flying
      inkWick(c, 905, G, 132, { face: "determined", arms: { L: [0.95, -0.95, -0.2, 0], R: [1.05, -0.7, -0.1, 0] }, t: 0.2, rot: 0.32, look: 0.7, glow: 1.3 });
      sweat(c, 800, 560, 26, -0.6); sweat(c, 770, 625, 20, -0.9);
      // the rut his feet dug in the sand
      c.fillStyle = "rgba(120,90,50,0.35)"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(820 - i * 70, G + 18 + (i % 2) * 14, 24, 8, 0, 0, TAU); c.fill(); }
    },
    text(c) { headline(c, [["4-TON", PAL.ink], ["COIN", GOLD]], 960, 170, 190); },
  };

  // ---------- C · WORTHLESS?: paper money next to a stone ----------
  const C = {
    bg: sand,
    art(c) {
      sky(c, "#fffaf0", "#fbe4bd"); const G = 985;
      c.fillStyle = "#e0c893"; c.fillRect(0, G, 1920, 200); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.beginPath(); c.moveTo(0, G); c.lineTo(1920, G); c.stroke();
      // the $100 bill, big, with its soft shadow on the floor
      c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(470, G + 8, 280, 16, 0, 0, TAU); c.fill();
      c.save(); c.translate(470, 640); c.rotate(-0.1); const bw = 600, bh = 264;
      c.fillStyle = "#9fd88c"; c.fillRect(-bw / 2, -bh / 2, bw, bh); c.lineWidth = 5; c.strokeStyle = PAL.ink; c.strokeRect(-bw / 2, -bh / 2, bw, bh);
      c.strokeStyle = "rgba(20,70,20,0.8)"; c.lineWidth = 3; c.strokeRect(-bw / 2 + 16, -bh / 2 + 14, bw - 32, bh - 28);
      c.fillStyle = "#c7ebb9"; c.beginPath(); c.ellipse(0, 0, 70, 92, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = "rgba(20,70,20,0.85)"; c.beginPath(); c.arc(0, -20, 26, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 48, 44, 30, 0, Math.PI, TAU); c.fill();
      c.font = "900 64px Serif4"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(20,70,20,0.95)"; c.fillText("100", -bw * 0.34, -bh * 0.27); c.fillText("100", bw * 0.34, bh * 0.27);
      c.font = "900 30px Serif4"; c.fillText("$", -bw * 0.34, bh * 0.28); c.fillText("$", bw * 0.34, -bh * 0.28); c.restore();
      // the red ring around it, two loose loops like a marker
      c.save(); c.strokeStyle = RED; c.lineWidth = 16; c.lineCap = "round"; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(470 + k * 8, 640 - k * 6, 380 + k * 14, 200 - k * 10, -0.12 + k * 0.05, 0.1 + k * 0.3, TAU - 0.25 + k * 0.3); c.stroke(); } c.restore();
      stone(c, 1480, G - 250, 250, {});
      inkWick(c, 985, G, 118, { face: "skeptical", arms: pose(10, [[0, "shrug"]]), t: 0.9, look: -0.3, glow: 1 });
    },
    text(c) { headline(c, [["WORTHLESS", PAL.ink], ["?", RED]], 960, 165, 180, 0.12); },
  };

  return {
    duration: 3, fps: 30, out,
    renderAt(t) { stage.frame([A, B, C][Math.min(2, Math.floor(t))], t); },
  };
}
