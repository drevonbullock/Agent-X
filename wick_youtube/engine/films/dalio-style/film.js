// STYLE FRAMES for Dre's yes/no on the ink look. Three stills, no motion yet.
//   t in [0,1) → C: the framed title card (episode 01)
//   t in [1,2) → A: navy story palette. King Wick, the chessboard, one grain.
//   t in [2,3) → B: green mechanism palette. Doubling cash stacks, Wick alarmed.
//   node render.mjs --film dalio-style --stills 0.5,1.5,2.5
import { rng } from "../../lib2d/ease.js";
import { PAL, paper, hatch, inkWick, sweat, sparkle, title, label, makeStage, chartLine, kicker } from "../../lib2d/ink.js";

const STEEL = "#6f97a8";
const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const stage = makeStage(out);
  const navy = paper(W, H, PAL.navy, 11), green = paper(W, H, PAL.green, 23);

  // ---------------- C: title card ----------------
  const growth = Array.from({ length: 25 }, (_, i) => [620 + i * 28, 905 - 175 * (Math.pow(2, i / 3.4) - 1) / (Math.pow(2, 24 / 3.4) - 1)]);
  function cardArt(c) {
    c.lineJoin = "miter";
    c.strokeStyle = STEEL;
    c.lineWidth = 12; c.strokeRect(70, 64, 1780, 952);
    c.lineWidth = 3; c.strokeRect(94, 88, 1732, 904);
    // emblem: Wick inside a ring
    c.beginPath(); c.arc(960, 238, 70, 0, Math.PI * 2); c.lineWidth = 5; c.stroke();
    inkWick(c, 960, 298, 36, { face: "calm", glow: 0.7 });
    // the compounding curve under the title: flat for ages, then straight up
    c.fillStyle = PAL.gold; c.strokeStyle = PAL.ink; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(growth[0][0], growth[0][1], 9, 6, -0.3, 0, Math.PI * 2); c.fill(); c.stroke();
    chartLine(c, growth.slice(1).map(([x, y]) => [x, y]).concat([[1328, 700]]), { width: 9 });
  }
  function cardText(c) {
    kicker(c, "THE CHESSBOARD THAT", 960, 408, 30);
    title(c, "BANKRUPTED", 960, 540, 132);
    title(c, "A KING", 960, 668, 132);
  }

  // ---------------- A: the king's chessboard ----------------
  const F = 900, HC = 3.3, HY = 300, CX = 1250, ZN = 5, DZ = 0.55;
  const P = (u, v) => { const z = ZN + v * DZ; return [CX + (F * (u - 4)) / z, HY + (F * HC) / z]; };
  const quad = (c, u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), d = P(u1, v1), e = P(u0, v1); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
  const [gx, gy] = P(0.5, 0.5);
  function boardArt(c) {
    // light from beyond the far corner: something enormous is waiting
    const far = P(8.6, 9.2);
    c.save(); c.globalCompositeOperation = "screen";
    const glow = c.createRadialGradient(far[0], far[1], 0, far[0], far[1], 620);
    glow.addColorStop(0, "rgba(255,205,110,0.5)"); glow.addColorStop(0.3, "rgba(255,180,80,0.16)"); glow.addColorStop(1, "rgba(255,160,60,0)");
    c.fillStyle = glow; c.beginPath(); c.arc(far[0], far[1], 620, 0, Math.PI * 2); c.fill();
    c.restore();

    // shadow, wooden frame, front edge
    c.fillStyle = "rgba(0,0,0,0.32)"; c.beginPath(); quad(c, -0.7, -0.9, 8.6, 8.5); c.fill();
    const n0 = P(-0.4, -0.4), n1 = P(8.4, -0.4);
    const front = (k) => { k.moveTo(...n0); k.lineTo(...n1); k.lineTo(n1[0], n1[1] + 34); k.lineTo(n0[0], n0[1] + 34); k.closePath(); };
    c.beginPath(); front(c); c.fillStyle = "#5a3b20"; c.fill();
    hatch(c, front, { gap: 6, width: 1.4, color: "rgba(0,0,0,0.4)", cx: CX, cy: 900, R: 900 });
    c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.fillStyle = "#8a5d33"; c.fill();
    // wood grain on the frame
    c.save(); c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.clip();
    const r = rng(9); c.beginPath();
    for (let i = 0; i < 26; i++) { const v = -0.4 + r() * 8.8; c.moveTo(...P(-0.4, v)); c.lineTo(...P(8.4, v + (r() - 0.5) * 0.1)); }
    c.lineWidth = 1.2; c.strokeStyle = "rgba(40,20,5,0.35)"; c.stroke(); c.restore();
    // squares
    for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
      c.beginPath(); quad(c, u, v, u + 1, v + 1);
      c.fillStyle = (u + v) % 2 ? PAL.squareLight : PAL.squareDark; c.fill();
    }
    // the far half falls into shadow: crosshatch it
    hatch(c, (k) => quad(k, 0, 3.5, 8, 8), { gap: 7, width: 1.2, color: "rgba(10,14,30,0.3)", cx: CX, cy: 500, R: 900 });
    hatch(c, (k) => quad(k, 0, 5.5, 8, 8), { angle: 35, gap: 7, width: 1.1, color: "rgba(10,14,30,0.28)", cx: CX, cy: 500, R: 900 });
    // but the far corner square is lit from beyond
    c.save(); c.globalCompositeOperation = "screen";
    c.beginPath(); quad(c, 7, 7, 8, 8); c.fillStyle = "rgba(255,200,100,0.35)"; c.fill(); c.restore();
    // grid + outlines
    c.beginPath();
    for (let i = 1; i < 8; i++) { c.moveTo(...P(i, 0)); c.lineTo(...P(i, 8)); c.moveTo(...P(0, i)); c.lineTo(...P(8, i)); }
    c.lineWidth = 1.6; c.strokeStyle = "rgba(18,16,21,0.6)"; c.stroke();
    c.lineJoin = "round"; c.strokeStyle = PAL.ink;
    c.beginPath(); quad(c, 0, 0, 8, 8); c.lineWidth = 3; c.stroke();
    c.beginPath(); quad(c, -0.4, -0.4, 8.4, 8.4); c.lineWidth = 5; c.stroke();
    c.beginPath(); front(c); c.stroke();

    // one grain, circled, with a leader line out to its label
    c.save(); c.translate(gx, gy); c.rotate(-0.3);
    c.beginPath(); c.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
    c.fillStyle = PAL.gold; c.fill(); c.lineWidth = 3; c.strokeStyle = PAL.ink; c.stroke();
    c.beginPath(); c.moveTo(-9, 1); c.quadraticCurveTo(0, -4, 9, 1); c.lineWidth = 1.6; c.strokeStyle = "rgba(120,60,0,0.8)"; c.stroke();
    c.restore();
    sparkle(c, gx + 24, gy - 22, 15);
    c.beginPath(); c.ellipse(gx, gy, 58, 34, 0, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = "#f3f7fb"; c.stroke();
    c.beginPath(); c.moveTo(gx + 26, gy - 33); c.lineTo(gx + 104, gy - 250);
    c.lineWidth = 8; c.strokeStyle = PAL.ink; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = "#f3f7fb"; c.stroke();

    // King Wick, crown and cape, pointing at it
    inkWick(c, 300, 960, 232, { face: "proud", crown: true, cape: true, look: 0.9, armR: [1.04, -1.4], armL: [-0.78, -0.66] });
  }
  function boardText(c) {
    title(c, "1 grain", gx + 112, gy - 262, 62, PAL.paperText, "left");
  }

  // ---------------- B: doubling ----------------
  const counts = [1, 2, 4, 8, 16, 32, 64], BILL = 8.4, L = 120, D = 58;
  const stackX = (i) => 170 + i * 205, STACK_Y = 860;
  function stack(c, x, y, n, seed) {
    const r = rng(seed);
    let xb = x, yb = y;
    c.fillStyle = "rgba(0,0,0,0.3)";
    c.beginPath(); c.moveTo(x + 14, y + 7); c.lineTo(x + 14 + L * c30, y + 7 - L * s30); c.lineTo(x + 14 + (L - D) * c30, y + 7 - (L + D) * s30); c.lineTo(x + 14 - D * c30, y + 7 - D * s30); c.closePath(); c.fill();
    for (let b = 0; b < n; b++) {
      xb = x + (r() - 0.5) * 7; yb = y - b * BILL + (r() - 0.5) * 1.5;
      const rx = xb + L * c30, ry = yb - L * s30, lx = xb - D * c30, ly = yb - D * s30;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(xb, yb); c.lineTo(xb, yb - BILL); c.lineTo(lx, ly - BILL); c.closePath();
      c.fillStyle = r() < 0.3 ? "#63b05b" : PAL.cashL; c.fill();
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
    // top bill face
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
    return [mx, my];
  }
  function doublingArt(c) {
    const tops = counts.map((n, i) => stack(c, stackX(i), STACK_Y, n, 40 + i));
    // the Dalio chart stroke rides the tops of the stacks and keeps going
    const pts = tops.map(([x, y]) => [x, y - 38]);
    pts.push([1500, 96]);
    chartLine(c, pts, { width: 11 });
    inkWick(c, 1700, 905, 170, { face: "alarmed", look: -1, armL: [-0.88, -1.64], armR: [0.88, -1.64], lean: -0.1 });
    sweat(c, 1604, 430, 14, -0.5); sweat(c, 1580, 474, 10, -0.7); sweat(c, 1800, 440, 13, 0.5);
  }
  function doublingText(c) {
    counts.forEach((n, i) => label(c, String(n), stackX(i) + 10, STACK_Y + 50, 30));
    title(c, "Doubling", 330, 190, 80);
  }

  return {
    duration: 3, fps: 30, out,
    renderAt(t) {
      if (t < 1) stage.frame(navy, t, cardArt, cardText);
      else if (t < 2) stage.frame(navy, t, boardArt, boardText);
      else stage.frame(green, t, doublingArt, doublingText);
    },
  };
}
