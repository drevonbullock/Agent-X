// TEST FILM — Script 01 "The Chessboard That Bankrupted a King", beats B01,
// B02, B03, B05, B06 (~59s). Plain JavaScript + three.js. Every frame is a pure
// function of t. Beat times come from silence detection on the ElevenLabs VO
// (VO starts at t = 1.2s).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { clamp, lerp, seg, smooth, easeInOut, easeOut, easeIn, pop, rng, wobble,
  clay, glossy, glowSprite, cameraPath, toScreen } from "../../lib/util.js";
import { makeCandle, addTunic, addRegalia } from "../../lib/wick.js";
import { makePost } from "../../lib/post.js";

export const DURATION = 59;

// ── the beat sheet (film seconds) ───────────────────────────────────────────
const T = {
  grain: 1.35,            // grain drops onto a1
  lastSquare: 5.15,       // "By the last square..."
  wheat: 8.15,            // "...more wheat than the whole world grows..."
  b02: 12.9,              // "The same math is quietly running on your money"
  cares: 16.8,            // "And it cares about one thing..."
  when: 20.35,            // "It cares about when you started."
  toDesk: [22.25, 23.05],
  line1: [24.25, 25.45], gt: [25.5, 25.85], line2: [25.95, 27.75], stamp: 28.15,
  iris: [30.85, 31.55, 32.2],
  chess: 33.3,            // "A clever man invents the game of chess."
  loves: 35.95,           // "The king loves it so much..."
  gold: 40.62, land: 41.55, palace: 42.25,
  waves: 43.5,            // "The inventor waves it all away."
  asks: 45.5,             // "He asks for grain."
  sq: [47.25, 48.95, 49.95, 51.5],   // 1, 2, 4, 8
  ripple: [52.9, 54.6],   // "all sixty four of them"
  title: 54.9, fadeOut: [58.1, 59],
};

const rbox = (w, h, d, r = 0.04, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

// ── chessboard (shared by the cosmic set and the palace) ────────────────────
function makeBoard(sq = 1, opts = {}) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(rbox(sq * 8.7, sq * 0.36, sq * 8.7, sq * 0.12, 4), clay(0x4a2e1c, { roughness: 0.7 }));
  frame.position.y = -sq * 0.08; frame.castShadow = frame.receiveShadow = true;
  g.add(frame);
  const squares = [];
  const geo = rbox(sq * 0.96, sq * 0.22, sq * 0.96, sq * 0.05, 3);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const light = (r + c) % 2 === 1;
      const base = new THREE.Color(light ? 0xe8d1a2 : 0x7c5334);
      const m = new THREE.Mesh(geo, clay(base.getHex(), { roughness: 0.75, bump: 0.4, emissive: 0xffb23a, emissiveIntensity: 0 }));
      m.material.emissiveIntensity = 0;
      m.userData.base = base;
      // a1 = row 0, col 0 = near-left
      m.position.set((c - 3.5) * sq, sq * 0.12, (3.5 - r) * sq);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      squares.push(m);
    }
  }
  g.userData.squares = squares;
  g.userData.sq = sq;
  g.userData.top = sq * 0.23;
  return g;
}
const grainGeo = new THREE.CapsuleGeometry(1, 1.6, 6, 12);
const grainMat = () => new THREE.MeshPhysicalMaterial({ color: 0xe9b449, roughness: 0.35, clearcoat: 0.6, emissive: 0x6b3d00, emissiveIntensity: 0.25 });
function grain(size) {
  const m = new THREE.Mesh(grainGeo, grainMat());
  m.scale.setScalar(size); m.rotation.z = Math.PI / 2; m.castShadow = true;
  return m;
}

// canvas text texture helper
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const api = { c, ctx, tex, redraw: (...a) => { draw(ctx, w, h, ...a); tex.needsUpdate = true; } };
  api.redraw();
  return api;
}

export async function create({ W, H, out }) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const S = W / 1920;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 500);
  const post = makePost(renderer, scene, camera, W, H);

  // ════════════════════════════════════════════════════════════════════════
  // SET 1 — COSMIC (B01 + B02)
  // ════════════════════════════════════════════════════════════════════════
  const cosmic = new THREE.Group(); scene.add(cosmic);
  {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 p; void main(){
        vec3 top = vec3(0.035,0.05,0.13), mid = vec3(0.09,0.08,0.2), bot = vec3(0.02,0.03,0.07);
        float y = p.y; vec3 c = y > 0. ? mix(mid, top, smoothstep(0.,0.8,y)) : mix(mid, bot, smoothstep(0.,-0.7,y));
        gl_FragColor = vec4(c,1.); }`,
    }));
    cosmic.add(sky);
    const r = rng(42), N = 2200, pos = [], col = [];
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 120 + r() * 40, s = Math.sqrt(1 - u * u);
      pos.push(rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th));
      const w = 0.6 + r() * 0.4; col.push(1 * w, 0.93 * w, 0.75 * w);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.7, vertexColors: true, map: (glowSprite(0xffffff).material.map), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    cosmic.add(stars);
    for (const [x, y, z, c, s] of [[-60, 30, -120, 0x4b2f8f, 110], [80, -10, -130, 0x1d5e78, 120], [-20, -60, -110, 0x3a2a70, 90], [40, 60, -90, 0x7a3a6a, 70]]) {
      const n = glowSprite(c, s, 0.16); n.position.set(x, y, z); cosmic.add(n);
    }
    cosmic.add(new THREE.HemisphereLight(0x8090ff, 0x1a1008, 0.55));
    const key = new THREE.DirectionalLight(0xffe0b0, 2.2);
    key.position.set(6, 14, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
    key.shadow.bias = -0.0005;
    cosmic.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x6d87ff, 1.1); rim.position.set(-8, 4, -10); cosmic.add(rim);
  }
  const bigBoard = makeBoard(1); cosmic.add(bigBoard);
  const a1 = bigBoard.userData.squares[0], h8 = bigBoard.userData.squares[63];
  const firstGrain = grain(0.075); bigBoard.add(firstGrain);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 64), new THREE.MeshBasicMaterial({ color: 0xffc050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ripple.rotation.x = -Math.PI / 2; bigBoard.add(ripple);
  // the far square: something enormous waiting past the frame
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 16, 40, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { k: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float k; varying vec2 vUv; void main(){ float a = pow(1.-vUv.y, 2.2) * k; gl_FragColor = vec4(1.,0.72,0.28,a); }`,
  }));
  column.position.copy(h8.position).add(new THREE.Vector3(0, 8, 0));
  bigBoard.add(column);
  const h8glow = glowSprite(0xffb640, 1, 0); h8glow.position.copy(h8.position).add(new THREE.Vector3(0, 0.4, 0)); bigBoard.add(h8glow);
  const h8light = new THREE.PointLight(0xffb040, 0, 10, 1.5); h8light.position.copy(h8.position).add(new THREE.Vector3(0, 1, 0)); bigBoard.add(h8light);

  // tiny planet + Wick (B02)
  const PLANET = new THREE.Vector3(0, -14, 0), PR = 2.4;
  const planet = new THREE.Group(); planet.position.copy(PLANET); cosmic.add(planet);
  {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(PR, 64, 48), clay(0x557f66, { bump: 1.2 }));
    ball.receiveShadow = ball.castShadow = true; planet.add(ball);
    const r = rng(5);
    for (let i = 0; i < 26; i++) {
      const th = r() * Math.PI * 2, ph = r() * 1.2 + 0.25;
      const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      if (Math.abs(n.x) < 0.3 && n.z > 0.2 && n.y > 0.7) continue; // keep Wick's seat clear
      let m;
      if (i % 3 === 0) m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + r() * 0.1, 0), clay(0x9c917e));
      else if (i % 3 === 1) m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), clay(0x3f6b4f));
      else { m = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3), clay(0x6b4a30)); tr.position.y = 0.15; const cn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), clay(0x6e9b58)); cn.position.y = 0.4; m.add(tr, cn); }
      m.position.copy(n.clone().multiplyScalar(PR - 0.02));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      planet.add(m);
    }
    const pl = new THREE.DirectionalLight(0xffe7c4, 1.6); pl.position.set(5, -6, 8); pl.target.position.copy(PLANET);
    pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024);
    Object.assign(pl.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
    cosmic.add(pl, pl.target);
  }
  const wickC = makeCandle({ seed: 3, light: 7 });
  wickC.root.position.set(0, PLANET.y + PR - 0.05, 0.1);
  cosmic.add(wickC.root);
  // calendar pages
  const pageTex = (n) => canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = "#f6efe0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c7453b"; g.fillRect(0, 0, w, 150);
    g.fillStyle = "#fff"; g.font = "700 70px Fredoka"; g.textAlign = "center"; g.fillText("AGE", w / 2, 102);
    g.fillStyle = "#20263a"; g.font = "700 300px Fredoka"; g.fillText(String(n), w / 2, 505);
    for (const x of [130, 380]) { g.fillStyle = "#555"; g.beginPath(); g.arc(x, 40, 16, 0, 7); g.fill(); }
  });
  const pages = [25, 35].map((n) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.012), [
      clay(0xf1e8d6), clay(0xf1e8d6), clay(0xf1e8d6), clay(0xf1e8d6),
      new THREE.MeshStandardMaterial({ map: pageTex(n).tex, roughness: 0.9 }), clay(0xe9dfca)]);
    m.castShadow = true; cosmic.add(m); return m;
  });

  // ════════════════════════════════════════════════════════════════════════
  // SET 2 — DESK (B03): marker write-on
  // ════════════════════════════════════════════════════════════════════════
  const desk = new THREE.Group(); scene.add(desk);
  const paper = canvasTex(2048, 1152, (g, w, h, st = {}) => {
    g.fillStyle = "#f5eddb"; g.fillRect(0, 0, w, h);
    // faint paper fibre
    const r = rng(9); g.globalAlpha = 0.05;
    for (let i = 0; i < 500; i++) { g.fillStyle = r() > 0.5 ? "#b8a27a" : "#fff"; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.globalAlpha = 1;
    const write = (text, y, size, k) => {
      if (k <= 0) return;
      g.save(); g.font = `${size}px Marker`; g.textAlign = "center";
      const tw = g.measureText(text).width, x0 = w / 2 - tw / 2;
      g.beginPath(); g.rect(x0 - 20, y - size, (tw + 40) * k, size * 1.4); g.clip();
      g.fillStyle = "rgba(30,36,51,0.18)"; g.fillText(text, w / 2 + 3, y + 3);   // ink bleed
      g.fillStyle = "#1e2433"; g.fillText(text, w / 2, y);
      g.restore();
    };
    write("10 years of a little", 360, 150, st.l1 ?? 0);
    write(">", 640, 230, st.gt ?? 0);
    write("30 years of a lot", 930, 150, st.l2 ?? 0);
    if ((st.q ?? 0) > 0) {
      const s = st.q;
      g.save(); g.translate(w / 2 + 10, 600); g.rotate(-0.12); g.scale(s, s);
      const rr = rng(4); g.fillStyle = "rgba(240,163,28,0.85)";
      for (let i = 0; i < 18; i++) { const a = rr() * 7, d = 170 + rr() * 150; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8, 6 + rr() * 16, 0, 7); g.fill(); }
      g.font = "700 520px Fredoka"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 26; g.strokeStyle = "#7a4a00"; g.strokeText("?", 0, 20);
      g.fillStyle = "#f0a31c"; g.fillText("?", 0, 20);
      g.restore();
    }
  });
  {
    const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), clay(0x3b2718, { roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; desk.add(table);
    const card = new THREE.Mesh(rbox(7.3, 0.06, 4.15, 0.025, 2), clay(0xefe5cf)); card.position.y = 0.03; card.castShadow = card.receiveShadow = true; desk.add(card);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.05), new THREE.MeshStandardMaterial({ map: paper.tex, roughness: 0.92 }));
    face.rotation.x = -Math.PI / 2; face.position.y = 0.065; face.receiveShadow = true; desk.add(face);
    const marker = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.3, 24), clay(0x20263a));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.45, 24), clay(0xf0a31c));
    cap.position.y = 0.8; marker.add(barrel, cap); marker.rotation.set(Math.PI / 2, 0, 0.9);
    marker.position.set(-4.4, 0.16, 1.4); marker.traverse((o) => { if (o.isMesh) o.castShadow = true; }); desk.add(marker);
    // a stack of coins, background gag: exactly one coin
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 32), new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 0.7, roughness: 0.35 }));
    coin.position.set(-4.6, 0.04, -1.3); coin.castShadow = true; desk.add(coin);
    desk.add(new THREE.HemisphereLight(0xffe8cc, 0x2a1a10, 0.5));
    const spot = new THREE.SpotLight(0xffdcae, 110, 30, 0.6, 0.6, 1.6);
    spot.position.set(-3, 9, 4); spot.target.position.set(0.5, 0, 0);
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004;
    desk.add(spot, spot.target);
  }
  const deskWick = makeCandle({ seed: 3, light: 4, scale: 0.8 });
  deskWick.root.position.set(4.35, 0, 0.55); deskWick.root.rotation.y = -0.75;
  desk.add(deskWick.root);

  // ════════════════════════════════════════════════════════════════════════
  // SET 3 — PALACE (B05 + B06)
  // ════════════════════════════════════════════════════════════════════════
  const palace = new THREE.Group(); scene.add(palace);
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#6f4a33"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#533423"; g.lineWidth = 10;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
  });
  floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(24, 24);
  {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: floorTex.tex, roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; palace.add(floor);
    const carpet = new THREE.Mesh(rbox(2.4, 0.04, 16, 0.015, 2), clay(0x9a2c38)); carpet.position.set(0.4, 0.02, 0); carpet.receiveShadow = true; palace.add(carpet);
    for (const x of [-0.8, 1.6]) { const b = new THREE.Mesh(rbox(0.12, 0.05, 16, 0.015, 2), clay(0xd9a53a)); b.position.set(x, 0.025, 0); palace.add(b); }
    const wall = new THREE.Mesh(rbox(34, 14, 0.8, 0.1, 2), clay(0x3a2442)); wall.position.set(0, 7, -9.5); wall.receiveShadow = true; palace.add(wall);
    for (const x of [-6, 0, 6]) {
      const win = new THREE.Mesh(rbox(2.2, 3.6, 0.2, 0.08, 2), new THREE.MeshBasicMaterial({ color: 0x141c44 }));
      win.position.set(x, 4.6, -9.05); palace.add(win);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x141c44 }));
      arch.position.set(x, 6.4, -9.0); palace.add(arch);
      const r = rng(x + 20);
      for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); s.position.set(x + (r() - 0.5) * 1.8, 3.2 + r() * 3.6, -8.93); palace.add(s); }
    }
    for (const x of [-8.5, -3.8, 4.8, 9]) {
      const p = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 10, 28), clay(0xe6d6b6)); shaft.position.y = 5;
      const base = new THREE.Mesh(rbox(1.3, 0.4, 1.3, 0.06), clay(0xd8c6a2)); base.position.y = 0.2;
      const capi = new THREE.Mesh(rbox(1.3, 0.4, 1.3, 0.06), clay(0xd8c6a2)); capi.position.y = 10;
      p.add(shaft, base, capi); p.position.set(x, 0, -7.2);
      p.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      palace.add(p);
    }
    // throne on a dais, turned toward Wick
    const throne = new THREE.Group();
    const dais = new THREE.Mesh(rbox(4, 0.35, 3.2, 0.08), clay(0x4c3a58)); dais.position.y = 0.175;
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 0.55, roughness: 0.38 });
    const seat = new THREE.Mesh(rbox(2.3, 0.9, 1.7, 0.12), gold); seat.position.set(0, 0.8, 0);
    const back = new THREE.Mesh(rbox(2.3, 3.6, 0.45, 0.2), gold); back.position.set(0, 2.3, -0.75);
    const cushion = new THREE.Mesh(rbox(1.95, 0.25, 1.45, 0.1), clay(0x9a2c38)); cushion.position.set(0, 1.37, 0.05);
    throne.add(dais, seat, back, cushion);
    throne.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    throne.position.set(2.7, 0, -4.8); throne.rotation.y = -0.6;
    palace.add(throne);
    palace.userData.throne = throne;
    // lamps
    for (const x of [-3.2, 3.8]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb04a, emissiveIntensity: 2.2 }));
      lamp.position.set(x, 5.6, -2.8);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 6), clay(0x222222)); cord.position.set(x, 8.8, -2.8);
      const pl = new THREE.PointLight(0xffb866, 30, 16, 1.6); pl.position.set(x, 5.2, -2.6);
      const gl = glowSprite(0xffb040, 3.2, 0.45); gl.position.copy(lamp.position);
      palace.add(lamp, cord, pl, gl);
    }
    palace.add(new THREE.HemisphereLight(0xffdcb0, 0x2c1830, 0.55));
    const key = new THREE.DirectionalLight(0xffd6a0, 1.5);
    key.position.set(-6, 12, 9); key.target.position.set(0.5, 0, -3);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    palace.add(key, key.target);
  }
  const king = makeCandle({ seed: 9, scale: 1.3, bodyR: 0.72, BH: 1.15, W: 1.3, H: 1.85, wax: 0xe9d7b6, light: 5, lean: -0.08 });
  addRegalia(king);
  king.root.position.set(2.7, 1.47, -4.75); king.root.rotation.y = -0.6;
  palace.add(king.root);
  const pWick = makeCandle({ seed: 3, light: 5 });
  addTunic(pWick);
  pWick.root.position.set(-1.7, 0, -2.5); pWick.root.rotation.y = 0.95;
  palace.add(pWick.root);
  const SQ = 0.13;
  const smallBoard = makeBoard(SQ); palace.add(smallBoard);
  const STAND = new THREE.Vector3(-0.35, 0, -1.75);
  const stand = new THREE.Group();
  {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.78, 24), clay(0x5a3a26));
    leg.position.y = 0.39;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 40), clay(0x6b4630)); top.position.y = 0.8;
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 8, 48), new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 0.6, roughness: 0.35 }));
    trim.rotation.x = Math.PI / 2; trim.position.y = 0.8;
    stand.add(leg, top, trim); stand.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    stand.position.copy(STAND); palace.add(stand);
  }
  const STAND_TOP = STAND.clone().add(new THREE.Vector3(0, 0.84 + SQ * 0.26, 0));
  // grains on the small board: 1, 2, 4, 8 on a1..d1
  const boardGrains = [];
  {
    const r = rng(12), sq = SQ;
    [1, 2, 4, 8].forEach((n, col) => {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const gm = grain(0.0145);
        const a = r() * Math.PI * 2, d = n === 1 ? 0 : 0.01 + r() * 0.03;
        gm.position.set((col - 3.5) * sq + Math.cos(a) * d, sq * 0.23 + 0.011, 3.5 * sq + Math.sin(a) * d);
        gm.rotation.y = r() * Math.PI;
        smallBoard.add(gm); arr.push(gm);
      }
      boardGrains.push(arr);
    });
  }
  // gifts
  const gifts = [];
  {
    const chest = new THREE.Group();
    const box = new THREE.Mesh(rbox(0.9, 0.5, 0.6, 0.06), clay(0x7b4b2a)); box.position.y = 0.25;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 24, 1, false, 0, Math.PI), clay(0x8a5632));
    lid.rotation.z = Math.PI / 2; lid.position.set(0, 0.5, -0.3); lid.rotation.x = -0.9;
    const band = new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 0.6, roughness: 0.35 });
    for (const x of [-0.3, 0.3]) { const b = new THREE.Mesh(rbox(0.08, 0.52, 0.62, 0.02), band); b.position.set(x, 0.25, 0); chest.add(b); }
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.5, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.6 });
    const r = rng(3);
    for (let i = 0; i < 22; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), coinMat); c.position.set((r() - 0.5) * 0.7, 0.5 + r() * 0.1, (r() - 0.5) * 0.4); c.rotation.set(r(), r(), r()); chest.add(c); }
    const gl = glowSprite(0xffc040, 1.8, 0.5); gl.position.y = 0.65;
    chest.add(box, lid, gl);
    const scroll = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 20), clay(0xefe3c4)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.1, -0.3);
    const mapTex = canvasTex(256, 192, (g, w, h) => {
      g.fillStyle = "#efe3c4"; g.fillRect(0, 0, w, h);
      const rr = rng(8); const greens = ["#7fa35a", "#9bb86a", "#c7b25a", "#6d9150"];
      for (let i = 0; i < 12; i++) { g.fillStyle = greens[i % 4]; g.fillRect(14 + (i % 4) * 58, 14 + Math.floor(i / 4) * 56, 52, 50); }
      g.strokeStyle = "#5a86a8"; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 120); g.bezierCurveTo(80, 90, 150, 170, 256, 110); g.stroke();
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ map: mapTex.tex, roughness: 0.9, side: THREE.DoubleSide }));
    sheet.rotation.x = -1.1; sheet.position.set(0, 0.2, 0);
    scroll.add(roll, sheet);
    const toy = new THREE.Group();
    const base = new THREE.Mesh(rbox(0.8, 0.4, 0.55, 0.05), clay(0xe7b7b0)); base.position.y = 0.2; toy.add(base);
    for (const [x, h] of [[-0.35, 0.75], [0.35, 0.75], [0, 0.95]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, h, 16), clay(0xf0d2c8)); tw.position.set(x, h / 2, 0.05);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 16), clay(0x3e8c8a)); roof.position.set(x, h + 0.14, 0.05);
      toy.add(tw, roof);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 0.6, roughness: 0.3 }));
    dome.position.set(0, 0.4, 0); toy.add(dome);
    [[chest, [-0.2, 0, -0.55], T.gold], [scroll, [0.75, 0, -0.2], T.land], [toy, [1.65, 0, -0.75], T.palace]].forEach(([g, p, t0], i) => {
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.position.set(...p); g.rotation.y = -0.3 + i * 0.15; g.userData = { home: new THREE.Vector3(...p), t0, dir: i === 2 ? 1 : -1 };
      palace.add(g); gifts.push(g);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SHOTS — which set, camera path, post look. A new shot = a cut.
  // ════════════════════════════════════════════════════════════════════════
  const shots = [
    { t0: 0, t1: T.toDesk[0] + 0.45, set: cosmic,
      look: { focus: 0.45, band: 0.2, amount: 2.4, bloom: 0.6, threshold: 0.8, vignette: 0.5, warmth: 0.02 },
      cam: cameraPath([
        { t: 0, pos: [-2.1, 1.25, 6.3], look: [-3.35, 0.2, 3.35], fov: 30 },
        { t: 4.9, pos: [-2.6, 1.05, 5.5], look: [-3.4, 0.2, 3.4], fov: 30 },
        { t: 12.0, pos: [5.5, 9.5, 14.5], look: [0.4, 0, -0.6], fov: 38 },
        { t: 17.2, pos: [2.5, -9.7, 6.8], look: [0, -10.75, 0.2], fov: 32 },
        { t: 22.7, pos: [1.2, -10.05, 5.0], look: [0, -10.85, 0.35], fov: 30 },
      ]) },
    { t0: T.toDesk[0] + 0.45, t1: T.iris[1], set: desk,
      look: { focus: 0.5, band: 0.24, amount: 3, bloom: 0.3, threshold: 0.95, vignette: 0.55, warmth: 0.05 },
      cam: cameraPath([
        { t: 22.7, pos: [0.9, 7.4, 6.2], look: [0.35, 0, 0.1], fov: 40 },
        { t: 28.9, pos: [0.6, 6.6, 5.4], look: [0.3, 0, 0.1], fov: 40 },
        { t: 31.6, pos: [0.15, 3.1, 2.2], look: [0.03, 0, -0.05], fov: 40 },
      ]) },
    { t0: T.iris[1], t1: T.asks, set: palace,
      look: { focus: 0.45, band: 0.18, amount: 3.4, bloom: 0.45, threshold: 0.88, vignette: 0.5, warmth: 0.05 },
      cam: cameraPath([
        { t: 31.5, pos: [0.9, 3.0, 8.8], look: [0.4, 1.5, -3.4], fov: 34 },
        { t: 35.8, pos: [0.6, 2.6, 7.6], look: [0.4, 1.5, -3.4], fov: 34 },
        { t: 37.3, pos: [0.9, 3.5, 0.9], look: [2.5, 3.2, -4.6], fov: 34 },
        { t: 39.8, pos: [0.8, 3.5, 0.6], look: [2.5, 3.3, -4.6], fov: 34 },
        { t: 40.5, pos: [0.3, 1.9, 5.6], look: [0.3, 0.7, -1.9], fov: 38 },
        { t: 45.5, pos: [0.1, 1.8, 5.0], look: [0.2, 0.7, -1.9], fov: 38 },
      ]) },
    { t0: T.asks, t1: DURATION + 1, set: palace,
      look: { focus: 0.5, band: 0.12, amount: 5, bloom: 0.45, threshold: 0.88, vignette: 0.55, warmth: 0.05 },
      cam: cameraPath([
        { t: 45.5, pos: [-0.58, 1.48, -0.66], look: [-0.64, 0.9, -1.3], fov: 30 },
        { t: 51.4, pos: [-0.52, 1.4, -0.72], look: [-0.62, 0.9, -1.31], fov: 30 },
        { t: 54.4, pos: [-0.35, 2.9, -0.05], look: [-0.35, 0.88, -1.75], fov: 36 },
        { t: 59, pos: [-0.35, 3.3, 0.2], look: [-0.35, 0.88, -1.75], fov: 36 },
      ]) },
  ];

  const tmp = new THREE.Vector3();
  const palaceFog = new THREE.Fog(0x24152a, 16, 42);

  function animate(t, set) {
    // ── COSMIC ──
    bigBoard.position.y = 0.15 * Math.sin(t * 0.6);
    bigBoard.rotation.y = 0.05 * Math.sin(t * 0.2);
    // first grain drops onto a1 with a squash
    const gk = seg(t, T.grain, T.grain + 0.55);
    const drop = gk < 1 ? 3.5 * (1 - easeIn(gk)) : 0;
    const bounce = t > T.grain + 0.55 ? Math.abs(Math.sin((t - T.grain - 0.55) * 9)) * Math.exp(-(t - T.grain - 0.55) * 6) * 0.25 : 0;
    firstGrain.position.set(a1.position.x, bigBoard.userData.top + 0.075 + drop + bounce, a1.position.z);
    firstGrain.visible = t > T.grain;
    const rk = seg(t, T.grain + 0.55, T.grain + 1.8);
    ripple.position.set(a1.position.x, bigBoard.userData.top + 0.01, a1.position.z);
    ripple.scale.setScalar(0.4 + rk * 1.5); ripple.material.opacity = rk > 0 && rk < 1 ? (1 - rk) * 0.55 : 0;
    a1.material.emissiveIntensity = 0.35 * (1 - seg(t, T.grain + 0.5, T.grain + 2)) * (t > T.grain + 0.5 ? 1 : 0) + 0.08;
    const far = easeInOut(seg(t, T.lastSquare, 11.5)) * (1 - seg(t, T.b02, T.b02 + 1.6));
    h8.material.emissiveIntensity = far * 2.4;
    column.material.uniforms.k.value = far * 0.65 * (1 + 0.1 * wobble(t, 2, 1));
    h8glow.material.opacity = far * 0.9; h8glow.scale.setScalar(1 + far * 7);
    h8light.intensity = far * 30;
    // B02: board shrinks and floats down into Wick's lap
    const lapWorld = tmp.set(0, 0, 0);
    wickC.body.updateMatrixWorld(true);
    wickC.body.localToWorld(lapWorld.set(0, 0.64, 0.6));
    const bk = easeInOut(seg(t, T.b02 + 0.4, T.b02 + 4.4));
    const start = new THREE.Vector3(0, 0.15 * Math.sin(t * 0.6), 0);
    const pos = start.clone().lerp(lapWorld, bk);
    pos.y += Math.sin(bk * Math.PI) * 1.2;
    if (bk > 0) { bigBoard.position.copy(pos); bigBoard.rotation.y = lerp(0.05 * Math.sin(t * 0.2), 0, bk); }
    bigBoard.scale.setScalar(lerp(1, 0.085, bk));
    // Wick on the planet
    const holding = t > T.b02 + 4.2;
    const reach = seg(t, T.b02 + 2.4, T.b02 + 4.2);
    let wExpr = "curious";
    if (t > T.b02 + 4.4) wExpr = "happy";
    if (t > T.when - 0.1) wExpr = "curious";
    const lapArms = { L: [-0.42, 0.68, 0.55], R: [0.42, 0.68, 0.55] };
    const upArms = { L: [-0.62, 1.25, 0.55], R: [0.62, 1.25, 0.55] };
    const arms = holding ? lapArms : reach > 0 ? upArms : undefined;
    wickC.update(t, { expr: wExpr, pose: "sit", arms });
    wickC.root.rotation.y = 0.1 * Math.sin(t * 0.5) + (t > T.when ? lerp(0, 0.35, smooth(seg(t, T.when, T.when + 0.8))) : 0);
    // pages flutter past on "when"
    pages.forEach((p, i) => {
      const k = seg(t, T.when - 0.1 + i * 0.75, T.when + 2.1 + i * 0.75);
      p.visible = k > 0 && k < 1;
      p.position.set(lerp(3.2, -3.4, k), -10.2 + 0.35 * Math.sin(k * 9 + i) + i * 0.25, 1.4 - i * 0.2);
      p.rotation.set(0.3 * Math.sin(k * 7 + i), -0.4 + 0.5 * Math.sin(k * 5 + i), 0.5 * Math.sin(k * 6 + i * 2));
    });

    // ── DESK ──
    if (set === desk) paper.redraw({
      l1: easeOut(seg(t, ...T.line1)), gt: seg(t, ...T.gt), l2: easeOut(seg(t, ...T.line2)),
      q: t > T.stamp ? lerp(2.3, 1, pop(seg(t, T.stamp, T.stamp + 0.45))) : 0,
    });
    const jump = t > T.stamp && t < T.stamp + 0.5 ? Math.sin(seg(t, T.stamp, T.stamp + 0.5) * Math.PI) * 0.35 : 0;
    deskWick.root.position.y = jump;
    const dExpr = t < T.stamp ? "curious" : t < T.stamp + 1.1 ? "alarmed" : "determined";
    deskWick.update(t, { expr: dExpr, pose: "stand",
      arms: t > T.stamp && t < T.stamp + 1.1 ? { L: [-0.75, 1.35, 0.1], R: [0.75, 1.35, 0.1] } : undefined });

    // ── PALACE ──
    // king: delighted flare on "loves it", presents the gifts
    const loveK = seg(t, T.loves, T.loves + 0.6) * (1 - seg(t, T.loves + 3.6, T.loves + 4.4));
    let kExpr = "calm";
    if (t > T.chess + 0.6) kExpr = "curious";
    if (t > T.loves) kExpr = "happy";
    if (t > T.waves + 0.3) kExpr = "curious";
    if (t > T.sq[0]) kExpr = "calm";
    const present = seg(t, T.gold - 0.4, T.gold) * (1 - seg(t, T.waves, T.waves + 0.6));
    king.update(t, { expr: kExpr, pose: "throne", flare: loveK,
      arms: { L: [-0.95, 0.75, 0.35], R: [lerp(0.95, 1.2, present), lerp(0.75, 1.3, present), lerp(0.35, 0.8, present)] } });
    // Wick presents the board, then it hops to the stand, then he waves it all away
    const hasBoard = t > T.chess;
    const onStand = t > T.waves - 0.3;
    let pExpr = "calm";
    if (t > T.chess) pExpr = "proud";
    if (t > T.gold - 0.2) pExpr = "curious";
    if (t > T.waves) pExpr = "calm";
    if (t > T.sq[3]) pExpr = "happy";
    const lift = seg(t, T.loves, T.loves + 0.8) * (1 - seg(t, T.waves - 0.6, T.waves - 0.3));
    let pArms;
    if (hasBoard && !onStand) pArms = { L: [-0.4, lerp(0.98, 1.28, lift), lerp(0.55, 0.62, lift)], R: [0.4, lerp(0.98, 1.28, lift), lerp(0.55, 0.62, lift)] };
    else if (t > T.waves && t < T.waves + 1.9) pArms = { R: [0.68, 1.55 + 0.1 * Math.sin(t * 14), 0.3 + 0.18 * Math.sin(t * 14)] };
    pWick.update(t, { expr: pExpr, pose: "stand", arms: pArms });
    // board placement
    smallBoard.visible = hasBoard;
    if (hasBoard) {
      const popK = pop(seg(t, T.chess, T.chess + 0.5));
      pWick.body.updateMatrixWorld(true);
      const inHands = new THREE.Vector3(0, lerp(1.04, 1.34, lift), lerp(1.02, 1.1, lift));
      pWick.body.localToWorld(inHands);
      const hk = easeInOut(seg(t, T.waves - 0.3, T.waves + 0.35));
      const p = inHands.clone().lerp(STAND_TOP, hk); p.y += Math.sin(hk * Math.PI) * 0.45;
      smallBoard.position.copy(p);
      smallBoard.rotation.set(0, lerp(pWick.root.rotation.y, 0, hk), lerp(0, 0, hk));
      smallBoard.scale.setScalar(Math.max(0.001, popK));
    }
    // gifts pop in, then get waved away
    gifts.forEach((g) => {
      const { home, t0, dir } = g.userData;
      const k = pop(seg(t, t0, t0 + 0.5));
      const away = easeIn(seg(t, T.waves + 0.2, T.waves + 1.2));
      g.visible = t > t0 && away < 1;
      g.position.set(home.x + dir * away * 3.5, home.y, home.z + away * 0.8);
      g.scale.setScalar(Math.max(0.001, k * (1 - away * 0.6)));
    });
    // squares 5 onward wait dark, then the doubling ripples across all 64
    const squares = smallBoard.userData.squares;
    const dim = seg(t, T.asks, T.asks + 0.8) * (1 - seg(t, T.ripple[0], T.ripple[0] + 1));
    squares.forEach((m, i) => {
      const r = Math.floor(i / 8), c = i % 8;
      const d = Math.hypot(r, c);
      let e = 0;
      if (i < 4) e = t > T.sq[i] ? 0.25 * (1 - seg(t, T.sq[i] + 0.2, T.sq[i] + 1.4)) + 0.06 : 0;
      const w = t > T.ripple[0] ? Math.max(0, 1 - Math.abs((t - T.ripple[0]) - d * 0.12) * 3.2) : 0;
      const settle = seg(t, T.ripple[0] + 1.2, T.ripple[1] + 0.6) * 0.25;
      m.material.emissiveIntensity = e + w * 1.2 + settle * 0.6;
      const dark = (i >= 4 && r === 0) || r > 0 ? dim * 0.45 : 0;
      m.material.color.copy(m.userData.base).multiplyScalar(1 - dark);
    });
    boardGrains.forEach((arr, col) => {
      arr.forEach((gm, j) => {
        const t0 = T.sq[col] + j * 0.06;
        const k = pop(seg(t, t0, t0 + 0.35));
        gm.visible = t > t0;
        gm.scale.setScalar(Math.max(0.0001, 0.0145 * k));
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2D OVERLAY — captions, chapter tag, square counts, iris, title
  // ════════════════════════════════════════════════════════════════════════
  function caption(text, t, t0, t1, y = 0.86, size = 60) {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.25) * (1 - seg(t, t1 - 0.3, t1));
    const s = lerp(0.85, 1, pop(seg(t, t0, t0 + 0.45)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * y); ctx.scale(s, s);
    ctx.font = `700 ${size * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 18 * S; ctx.shadowOffsetY = 4 * S;
    ctx.fillStyle = "#fff4dc"; ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function chapter(text, t, t0, t1) {
    if (t < t0 || t > t1) return;
    const a = seg(t, t0, t0 + 0.4) * (1 - seg(t, t1 - 0.4, t1));
    const slide = easeOut(seg(t, t0, t0 + 0.5));
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = "#f0a31c"; ctx.fillRect(70 * S, 78 * S, 8 * S, 46 * S);
    ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#fff4dc"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10 * S;
    ctx.fillText(text, (92 - 20 * (1 - slide)) * S, 102 * S);
    ctx.restore();
  }
  function squareCounts(t, cam) {
    const sq = smallBoard.userData.sq;
    [1, 2, 4, 8].forEach((n, col) => {
      const t0 = T.sq[col];
      if (t < t0 + 0.05 || !smallBoard.visible) return;
      const p = smallBoard.localToWorld(new THREE.Vector3((col - 3.5) * sq, 0.09, 3.5 * sq));
      const s2 = toScreen(p, cam, W, H);
      const k = pop(seg(t, t0 + 0.05, t0 + 0.5));
      const fade = 1 - seg(t, T.ripple[0] + 0.4, T.ripple[0] + 1.2);
      ctx.save(); ctx.globalAlpha = Math.min(1, k) * fade;
      ctx.translate(s2.x, s2.y - 30 * S * k); ctx.scale(k, k);
      ctx.font = `700 ${58 * S}px Fredoka`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 10 * S; ctx.strokeStyle = "#3a2106"; ctx.strokeText(String(n), 0, 0);
      ctx.fillStyle = "#ffc94a"; ctx.fillText(String(n), 0, 0);
      ctx.restore();
    });
  }
  function iris(t) {
    const [a, b, c] = T.iris;
    if (t < a || t > c) return;
    const maxR = Math.hypot(W, H) / 2;
    const r = t < b ? maxR * (1 - easeIn(seg(t, a, b))) : maxR * easeOut(seg(t, b + 0.05, c));
    ctx.save(); ctx.fillStyle = "#07060a";
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2 + (t < b ? 20 * S : 0), Math.max(0, r), 0, Math.PI * 2, true); ctx.fill();
    ctx.restore();
  }
  function title(t) {
    if (t < T.title) return;
    const k = easeOut(seg(t, T.title, T.title + 0.9));
    ctx.save();
    const grd = ctx.createLinearGradient(0, H * 0.3, 0, H);
    grd.addColorStop(0, "rgba(10,8,14,0)"); grd.addColorStop(1, `rgba(10,8,14,${0.8 * k})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20 * S;
    ctx.font = `600 ${30 * S}px Fredoka`; ctx.fillStyle = "#f0a31c";
    ctx.fillText("WICK'S WISDOM  ·  EPISODE 1", W / 2, H * 0.66 + (1 - k) * 20 * S);
    ctx.font = `700 ${84 * S}px Fredoka`; ctx.fillStyle = "#fff4dc";
    ctx.fillText("The Chessboard That", W / 2, H * 0.755 + (1 - k) * 30 * S);
    ctx.fillText("Bankrupted a King", W / 2, H * 0.845 + (1 - k) * 40 * S);
    ctx.restore();
  }
  function watermark() {
    ctx.save(); ctx.globalAlpha = 0.45; ctx.font = `600 ${22 * S}px Fredoka`; ctx.fillStyle = "#fff4dc";
    ctx.textAlign = "right"; ctx.fillText("WICK'S WISDOM", W - 40 * S, H - 36 * S); ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  function renderAt(t) {
    const shot = shots.find((s) => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
    for (const s of [cosmic, desk, palace]) s.visible = s === shot.set;
    scene.fog = shot.set === palace ? palaceFog : null;
    animate(t, shot.set);
    shot.cam(camera, t);
    // camera shake on the stamp
    if (t > T.stamp && t < T.stamp + 0.35) {
      const k = 1 - seg(t, T.stamp, T.stamp + 0.35);
      camera.position.x += Math.sin(t * 90) * 0.05 * k; camera.position.y += Math.cos(t * 70) * 0.05 * k;
    }
    // handheld breath so nothing is ever perfectly static
    camera.position.x += 0.012 * wobble(t, 0.4, 3); camera.position.y += 0.01 * wobble(t, 0.33, 8);
    const fadeDesk = seg(t, T.toDesk[0], T.toDesk[0] + 0.45) * (1 - seg(t, T.toDesk[0] + 0.45, T.toDesk[1]));
    const fadeEnd = seg(t, ...T.fadeOut);
    post.set({ ...shot.look, fade: Math.max(fadeDesk, fadeEnd, 1 - seg(t, 0, 0.8)) });
    post.render(t);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
    caption("1 grain", t, T.grain + 0.7, T.lastSquare - 0.1);
    caption("Square 64: ~1,000 years of the world's wheat", t, T.wheat + 0.2, 12.4, 0.86, 52);
    caption("It cares about when.", t, T.when + 0.15, T.toDesk[0] + 0.2);
    chapter("THE INVENTOR'S PRICE", t, 32.3, 36.2);
    squareCounts(t, camera);
    const seq = t > T.sq[3] ? "1, 2, 4, 8..." : t > T.sq[2] ? "1, 2, 4" : t > T.sq[1] ? "1, 2" : t > T.sq[0] ? "1" : "";
    if (seq) caption(seq, t, T.sq[0], T.title - 0.1, 0.88, 56);
    iris(t);
    title(t);
    if (t < T.fadeOut[0]) watermark();
    ctx.save(); ctx.globalAlpha = seg(t, ...T.fadeOut); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  return { duration: DURATION, fps: 30, out, renderAt };
}
