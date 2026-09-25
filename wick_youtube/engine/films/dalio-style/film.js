// STYLE FRAMES for Dre's yes/no on the ink look. Two stills, no motion yet.
//   t < 1  → A: navy story palette. King Wick, the chessboard, one grain.
//   t >= 1 → B: green mechanism palette. Doubling cash stacks, Wick alarmed.
//   node render.mjs --film dalio-style --stills 0.5,1.5
import { PAL, paper, hatch, inkWick, sweat, sparkle, title, label } from "../../lib2d/ink.js";

export async function create({ W, H, out }) {
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const k = W / 1920;
  const navy = paper(W, H, PAL.navy, 11), green = paper(W, H, PAL.green, 23);

  function frameA() {
    ctx.drawImage(navy, 0, 0);
    ctx.save(); ctx.scale(k, k);

    // chessboard on the ground, true perspective (camera height HC, focal F)
    const F = 720, HC = 5.4, HY = 252, CX = 1210, ZN = 6, DZ = 0.5;
    const P = (u, v) => { const z = ZN + v * DZ; return [CX + (F * (u - 4)) / z, HY + (F * HC) / z]; };
    const quad = (c, u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), d = P(u1, v1), e = P(u0, v1); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
    // board shadow + thickness
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); quad(ctx, -0.3, -0.5, 8.4, 8); ctx.fill();
    const n0 = P(0, 0), n1 = P(8, 0);
    ctx.fillStyle = "#6b4a2a";
    ctx.beginPath(); ctx.moveTo(...n0); ctx.lineTo(...n1); ctx.lineTo(n1[0], n1[1] + 26); ctx.lineTo(n0[0], n0[1] + 26); ctx.closePath(); ctx.fill();
    hatch(ctx, (c) => { c.moveTo(...n0); c.lineTo(...n1); c.lineTo(n1[0], n1[1] + 26); c.lineTo(n0[0], n0[1] + 26); c.closePath(); },
      { gap: 7, width: 1.4, color: "rgba(0,0,0,0.35)", cx: CX, cy: 900, R: 800 });
    ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink;
    ctx.beginPath(); ctx.moveTo(...n0); ctx.lineTo(...n1); ctx.lineTo(n1[0], n1[1] + 26); ctx.lineTo(n0[0], n0[1] + 26); ctx.closePath(); ctx.stroke();
    // squares
    for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
      ctx.beginPath(); quad(ctx, u, v, u + 1, v + 1);
      ctx.fillStyle = (u + v) % 2 ? PAL.squareLight : PAL.squareDark; ctx.fill();
    }
    // far half sits in the dark: hatch it
    hatch(ctx, (c) => quad(c, 0, 4.5, 8, 8), { gap: 6, width: 1.2, color: "rgba(10,14,30,0.35)", cx: CX, cy: 420, R: 700 });
    // grid + outline
    ctx.beginPath();
    for (let i = 1; i < 8; i++) { ctx.moveTo(...P(i, 0)); ctx.lineTo(...P(i, 8)); ctx.moveTo(...P(0, i)); ctx.lineTo(...P(8, i)); }
    ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(18,16,21,0.7)"; ctx.stroke();
    ctx.beginPath(); quad(ctx, 0, 0, 8, 8); ctx.lineWidth = 5; ctx.strokeStyle = PAL.ink; ctx.stroke();

    // the far corner glows: something enormous is coming
    const fc = P(8, 8);
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const g = ctx.createRadialGradient(fc[0], fc[1], 0, fc[0], fc[1], 260);
    g.addColorStop(0, "rgba(255,200,90,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(fc[0] - 300, fc[1] - 300, 600, 600);
    ctx.restore();

    // one grain on the first square, circled, with a leader line to its label
    const [gx, gy] = P(0.5, 0.5);
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(-0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = PAL.gold; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 1); ctx.quadraticCurveTo(0, -3, 8, 1); ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(120,60,0,0.8)"; ctx.stroke();
    ctx.restore();
    sparkle(ctx, gx + 20, gy - 20, 14);
    ctx.beginPath(); ctx.ellipse(gx, gy, 52, 30, 0, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = "#f3f7fb"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 30, gy - 26); ctx.lineTo(gx + 120, gy - 262);
    ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = "#f3f7fb"; ctx.stroke();
    title(ctx, "1 grain", gx + 128, gy - 276, 58, PAL.paperText, "left");

    // King Wick points at it
    inkWick(ctx, 400, 930, 180, { face: "proud", crown: true, look: 0.8, armR: [1.08, -1.34], armL: [-0.74, -0.6] });

    title(ctx, "The King's Chessboard", 960, 160, 76);
    ctx.restore();
  }

  function frameB() {
    ctx.drawImage(green, 0, 0);
    ctx.save(); ctx.scale(k, k);

    // doubling stacks of cash, isometric, standing on one line
    const counts = [1, 2, 4, 8, 16, 32, 64], bill = 8.4, L = 120, D = 58;
    const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
    counts.forEach((n, i) => {
      const x = 170 + i * 205, y = 860, h = n * bill;
      // footprint corners: front (x,y), right, back, left
      const rx = x + L * c30, ry = y - L * s30, lx = x - D * c30, ly = y - D * s30;
      const bx = rx - D * c30, by = ry - D * s30;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath(); ctx.moveTo(x + 12, y + 6); ctx.lineTo(rx + 16, ry + 4); ctx.lineTo(bx + 16, by + 4); ctx.lineTo(lx + 12, ly + 6); ctx.closePath(); ctx.fill();
      const left = (c) => { c.moveTo(lx, ly); c.lineTo(x, y); c.lineTo(x, y - h); c.lineTo(lx, ly - h); c.closePath(); };
      const right = (c) => { c.moveTo(x, y); c.lineTo(rx, ry); c.lineTo(rx, ry - h); c.lineTo(x, y - h); c.closePath(); };
      const top = (c) => { c.moveTo(x, y - h); c.lineTo(rx, ry - h); c.lineTo(bx, by - h); c.lineTo(lx, ly - h); c.closePath(); };
      ctx.beginPath(); left(ctx); ctx.fillStyle = PAL.cashL; ctx.fill();
      ctx.beginPath(); right(ctx); ctx.fillStyle = PAL.cashR; ctx.fill();
      hatch(ctx, right, { gap: 6, width: 1.2, color: "rgba(0,30,0,0.35)", cx: x, cy: y - h / 2, R: 700 });
      // one line per bill edge
      ctx.beginPath();
      for (let b = 1; b < n; b++) { const yy = b * bill; ctx.moveTo(lx, ly - yy); ctx.lineTo(x, y - yy); ctx.lineTo(rx, ry - yy); }
      ctx.lineWidth = 1.3; ctx.strokeStyle = "rgba(10,40,10,0.55)"; ctx.stroke();
      ctx.beginPath(); top(ctx); ctx.fillStyle = PAL.cashTop; ctx.fill();
      // bill face: inner border and the $ oval
      const mx = (x + bx) / 2, my = (y + by) / 2 - h;
      ctx.save(); ctx.translate(mx, my); ctx.transform(c30, -s30, -c30, -s30, 0, 0);
      ctx.strokeStyle = "rgba(20,70,20,0.8)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(-L / 2 + 9, -D / 2 + 7, L - 18, D - 14);
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 15, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.font = "700 20px Serif4"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(20,70,20,0.9)"; ctx.fillText("$", mx, my + 7); ctx.restore();
      ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = PAL.ink;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry - h); ctx.lineTo(bx, by - h); ctx.lineTo(lx, ly - h); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.lineTo(rx, ry - h); ctx.moveTo(x, y - h); ctx.lineTo(lx, ly - h); ctx.lineWidth = 2.5; ctx.stroke();
      label(ctx, String(n), x + 10, y + 48, 30);
    });

    // Wick at the end of the row, looking up at the tallest one
    inkWick(ctx, 1690, 900, 165, { face: "alarmed", look: -1, armL: [-0.86, -1.62], armR: [0.86, -1.62], lean: -0.1 });
    sweat(ctx, 1600, 440, 13, -0.5); sweat(ctx, 1578, 480, 10, -0.7); sweat(ctx, 1790, 450, 12, 0.5);

    title(ctx, "Doubling", 960, 160, 76);
    ctx.restore();
  }

  return {
    duration: 2, fps: 30, out,
    renderAt(t) { (t < 1 ? frameA : frameB)(); },
  };
}
