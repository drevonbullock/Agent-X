// PUPPET WARP — animate a still image in plain Canvas 2D.
// The image sits on a triangle mesh. "Handles" bend the mesh over time:
//   rot   : rotate everything near `c` around `pivot` (flame sway, arm wave, leg swing)
//   move  : translate everything near `c` (bob, bounce, hand reach)
//   scale : scale everything near `c` about `pivot` (breathing, squash/stretch)
// Influence falls off smoothly to zero at the handle's radius, so the edge of
// every moving patch stays glued to the untouched image: no holes, no seams.
// Only cells that actually move are redrawn, which keeps it fast.
//
// All coordinates are in a 1024-wide reference space; they scale to the real
// image size automatically (so 1K previews and 2.7K masters share one script).

const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

export function makeWarp(img, { cols = 44, rows = 25 } = {}) {
  const W = img.width, H = img.height, K = W / 1024;
  const buf = document.createElement("canvas"); buf.width = W; buf.height = H;
  const g = buf.getContext("2d");
  // colour sampler for eyelids etc.
  const probe = document.createElement("canvas"); probe.width = W; probe.height = H;
  const pg = probe.getContext("2d", { willReadFrequently: true }); pg.drawImage(img, 0, 0);
  const sample = (x, y) => { const d = pg.getImageData(Math.round(x * K), Math.round(y * K), 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };

  // displacement of a reference-space point under the active handles
  function disp(handles, x, y) {
    let dx = 0, dy = 0;
    for (const h of handles) {
      const rx = h.r[0], ry = h.r[1] ?? h.r[0];
      const nx = (x - h.c[0]) / rx, ny = (y - h.c[1]) / ry;
      const w = smooth(1 - Math.sqrt(nx * nx + ny * ny));
      if (w <= 0) continue;
      if (h.type === "move") { dx += h.d[0] * w; dy += h.d[1] * w; }
      else if (h.type === "rot") {
        const a = h.a * w, px = h.pivot[0], py = h.pivot[1], ux = x - px, uy = y - py;
        dx += ux * Math.cos(a) - uy * Math.sin(a) - ux; dy += ux * Math.sin(a) + uy * Math.cos(a) - uy;
      } else if (h.type === "scale") {
        const px = h.pivot[0], py = h.pivot[1];
        dx += (x - px) * (h.s[0] - 1) * w; dy += (y - py) * (h.s[1] - 1) * w;
      }
    }
    return [dx, dy];
  }

  function tri(s0, s1, s2, d0, d1, d2) {
    // affine map source triangle -> destination triangle
    const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
    const [u0, v0] = d0, [u1, v1] = d1, [u2, v2] = d2;
    const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
    if (Math.abs(den) < 1e-9) return;
    const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
    const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
    const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
    const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
    const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
    const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
    // clip to the destination triangle, grown ~0.7px to hide AA seams
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
    const grow = (u, v) => { const L = Math.hypot(u - cx, v - cy) || 1; return [u + (u - cx) / L * 0.7, v + (v - cy) / L * 0.7]; };
    const p0 = grow(u0, v0), p1 = grow(u1, v1), p2 = grow(u2, v2);
    g.save();
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.clip();
    g.setTransform(a, b, c, d, e, f);
    const mnx = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 2), mny = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 2);
    const mxx = Math.min(W, Math.ceil(Math.max(x0, x1, x2)) + 2), mxy = Math.min(H, Math.ceil(Math.max(y0, y1, y2)) + 2);
    g.drawImage(img, mnx, mny, mxx - mnx, mxy - mny, mnx, mny, mxx - mnx, mxy - mny);
    g.restore();
  }

  /** render the warped still into buf and return it */
  function render(handles) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(img, 0, 0);
    if (!handles.length) return buf;
    const cw = W / cols, ch = H / rows;
    const P = [], D = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const x = i * cw, y = j * ch;
      const [dx, dy] = disp(handles, x / K, y / K);
      P.push([x, y]); D.push([x + dx * K, y + dy * K, Math.abs(dx) + Math.abs(dy) > 0.02]);
    }
    const id = (i, j) => j * (cols + 1) + i;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
      if (!(D[a][2] || D[b][2] || D[c][2] || D[d][2])) continue;
      tri(P[a], P[b], P[c], D[a], D[b], D[c]);
      tri(P[b], P[d], P[c], D[b], D[d], D[c]);
    }
    return buf;
  }

  /** closed-eyelid overlay for blinks, drawn in buf space after render() */
  function blink(handles, eyes, k) {
    if (k <= 0) return;
    for (const e of eyes) {
      const [dx, dy] = disp(handles, e.x, e.y);
      const x = (e.x + dx) * K, y = (e.y + dy) * K, rx = e.rx * K * 1.25, ry = e.ry * K * 1.18;
      e.col = e.col || sample(e.x, e.y - e.ry * 1.9);
      g.save(); g.globalAlpha = Math.min(1, k * 1.4);
      g.fillStyle = e.col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(40,20,5,0.9)"; g.lineWidth = Math.max(1.5, e.rx * K * 0.28); g.lineCap = "round";
      g.beginPath(); g.moveTo(x - rx * 0.85, y); g.quadraticCurveTo(x, y + ry * 0.55, x + rx * 0.85, y); g.stroke();
      g.restore();
    }
  }
  return { buf, render, blink, disp, K, W, H };
}
