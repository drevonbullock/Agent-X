// WICK, built from geometry. Matches wick_examples/00_character_sheet.png:
// glossy golden teardrop flame with a thin dark outline and a lighter core,
// short ivory wax cylinder with soft drips at the rim, thin black rubber-hose
// limbs, round mitten hands, round shoes, solid black oval eyes with one white
// catchlight, thin brows, small mouth. No nose, ears, hair or visible wick.
//
// Locked rules from CHARACTER_SHEET.md, enforced here in code:
//  - wax level never changes (body height is a constant, never animated)
//  - nothing ever goes on the flame (costumes attach to the body group only)
//  - the flame is the light source (every candle carries its own point light)
import * as THREE from "three";
import { clay, glossy, glowSprite, rng, wobble, lerp, clamp } from "./util.js";

const GOLD = 0xf5a000, GOLD_LIGHT = 0xffcf4a, OUTLINE = 0x3a2106;
const WAX = 0xefe1c2, INK = 0x15120e;

// ── expressions (mirror the 3x3 sheet) ─────────────────────────────────────
// browTilt > 0 = inner ends up (worried), < 0 = inner ends down (determined)
export const EXPRESSIONS = {
  happy:      { eye: 1.0, closed: false, browTilt: 0.0,  browY: 0.02, arch: 1.0, mouth: "smile", mw: 0.11, curve: 0.07 },
  calm:       { eye: 1.0, closed: "down", browTilt: 0.0, browY: 0.0, arch: 0.6, mouth: "smile", mw: 0.07, curve: 0.035 },
  curious:    { eye: 1.12, closed: false, browTilt: 0.0, browY: 0.05, arch: 1.2, mouth: "o", mw: 0.03, curve: 0, browRaise: 0.04 },
  focused:    { eye: 0.92, closed: false, browTilt: -0.35, browY: -0.01, arch: 0.2, mouth: "frown", mw: 0.05, curve: -0.02 },
  determined: { eye: 0.95, closed: false, browTilt: -0.4, browY: -0.01, arch: 0.2, mouth: "smile", mw: 0.07, curve: 0.025 },
  proud:      { eye: 1.0, closed: "up", browTilt: 0.0, browY: 0.04, arch: 1.0, mouth: "smile", mw: 0.09, curve: 0.05 },
  sombre:     { eye: 0.95, closed: false, browTilt: 0.35, browY: 0.01, arch: 0.3, mouth: "frown", mw: 0.06, curve: -0.035 },
  weary:      { eye: 0.9, closed: "half", browTilt: 0.3, browY: -0.01, arch: 0.3, mouth: "frown", mw: 0.06, curve: -0.03 },
  alarmed:    { eye: 1.2, closed: false, browTilt: 0.4, browY: 0.06, arch: 0.8, mouth: "o", mw: 0.05, curve: 0 },
};

// teardrop profile: x = a·sin(t)·sin(t/2)^m, y = (H/2)·cos(t), t: π (bottom) → 0 (tip)
function teardropPoints(W, H, m = 1.15, n = 64) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * (1 - i / n);
    pts.push(new THREE.Vector2(Math.max(0.0001, (W / 2) * Math.sin(t) * Math.pow(Math.sin(t / 2), m)), (H / 2) * Math.cos(t)));
  }
  return pts;
}
// radius of the head at height y (for sticking the face onto the surface)
function radiusAt(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) {
      const k = (y - a.y) / (b.y - a.y || 1);
      return lerp(a.x, b.x, k);
    }
  }
  return 0;
}

function leanGeometry(geo, H, lean) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = clamp((y + H / 2) / H);
    p.setX(i, p.getX(i) + lean * Math.pow(k, 3));
  }
  geo.computeVertexNormals();
}

// lighter golden core, brightest front-centre, like the sheet's inner highlight
function paintFlame(geo, H) {
  const p = geo.attributes.position, nrm = geo.attributes.normal, cols = [];
  const a = new THREE.Color(GOLD), b = new THREE.Color(GOLD_LIGHT), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / (H / 2), front = Math.max(0, nrm.getZ(i));
    const band = Math.exp(-Math.pow((y + 0.05) / 0.55, 2));
    c.copy(a).lerp(b, clamp(front * band * 1.1));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
}

function tube(points, radius, mat, seg = 16) {
  const curve = points.length === 3
    ? new THREE.QuadraticBezierCurve3(...points)
    : new THREE.CatmullRomCurve3(points);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, 8), mat);
  // round caps so the hose ends look sculpted, not cut
  const cap = new THREE.SphereGeometry(radius, 10, 8);
  const c1 = new THREE.Mesh(cap, mat); c1.position.copy(points[0]);
  const c2 = new THREE.Mesh(cap, mat); c2.position.copy(points[points.length - 1]);
  m.add(c1, c2);
  return m;
}

/**
 * makeCandle(opts) → rig
 *   opts.scale      overall size (Wick = 1)
 *   opts.bodyR/BH   wax body radius / height
 *   opts.W/H        flame width / height
 *   opts.wax        wax colour
 *   opts.seed       drip layout
 *   opts.light      point light intensity (0 to disable)
 * rig.update(t, {expr, pose, arms, look, flare})
 */
export function makeCandle(opts = {}) {
  const R = opts.bodyR ?? 0.52, BH = opts.BH ?? 0.9;
  const W = opts.W ?? 1.12, H = opts.H ?? 1.62, SINK = opts.sink ?? 0.34;
  const LEG = opts.leg ?? 0.36;
  const root = new THREE.Group();          // origin on the ground between the feet
  const bodyG = new THREE.Group();         // everything that bobs together
  root.add(bodyG);
  root.scale.setScalar(opts.scale ?? 1);

  const inkMat = new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const waxMat = clay(opts.wax ?? WAX, { roughness: 0.6, bump: 0.35 });

  // ── wax body (height is a constant: the wax level never changes) ──
  const bodyGeo = new THREE.CylinderGeometry(R, R * 1.03, BH, 56, 6);
  {
    const r = rng(opts.seed ?? 3), p = bodyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), rad = Math.hypot(x, z);
      if (rad > R * 0.5) { const k = 1 + (r() - 0.5) * 0.012; p.setX(i, x * k); p.setZ(i, z * k); }
    }
    bodyGeo.computeVertexNormals();
  }
  const body = new THREE.Mesh(bodyGeo, waxMat);
  body.position.y = LEG + BH / 2;
  body.castShadow = body.receiveShadow = true;
  bodyG.add(body);

  // rounded lip + the cup the flame sits in
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.93, 0.075, 12, 56), waxMat);
  lip.rotation.x = Math.PI / 2; lip.position.y = LEG + BH - 0.01; lip.castShadow = true;
  bodyG.add(lip);
  const cup = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 40), clay(0xd9c49c));
  cup.rotation.x = -Math.PI / 2; cup.position.y = LEG + BH + 0.02;
  bodyG.add(cup);

  // drips: soft capsules hanging from the lip, varied lengths
  {
    const r = rng((opts.seed ?? 3) * 11 + 1), n = opts.drips ?? 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.4;
      const len = 0.1 + r() * (i % 2 ? 0.34 : 0.18), rad = 0.055 + r() * 0.03;
      const d = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 6, 12), waxMat);
      d.position.set(Math.cos(a) * (R + 0.012), LEG + BH - len / 2 - 0.02, Math.sin(a) * (R + 0.012));
      d.castShadow = true;
      bodyG.add(d);
      const blob = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.12, 12, 10), waxMat);
      blob.position.set(d.position.x, d.position.y - len / 2, d.position.z);
      bodyG.add(blob);
    }
  }

  // ── flame head ──
  const headG = new THREE.Group();
  headG.position.y = LEG + BH + H / 2 - SINK;
  bodyG.add(headG);
  const pts = teardropPoints(W, H);
  const headGeo = new THREE.LatheGeometry(pts, 64);
  const LEAN = opts.lean ?? 0.1;
  leanGeometry(headGeo, H, LEAN);
  paintFlame(headGeo, H);
  const flameMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12,
    emissive: 0xe07800, emissiveIntensity: 0.2,
  });
  const head = new THREE.Mesh(headGeo, flameMat);
  head.castShadow = true;
  headG.add(head);
  // thin dark outline: inverted hull
  const hull = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide }));
  hull.scale.set(1.035, 1.022, 1.035);
  headG.add(hull);

  // glow + real light: the flame lights the world
  const glow = glowSprite(0xffb338, W * 3.2, 0.18);
  glow.position.set(0, -0.05, -0.2);
  headG.add(glow);
  let light = null;
  if ((opts.light ?? 6) > 0) {
    light = new THREE.PointLight(0xffb040, opts.light ?? 6, 9 * (opts.scale ?? 1), 1.6);
    light.position.set(0, -0.15, 0);   // inside the flame: lights the world, not its own face
    headG.add(light);
  }

  // ── face ──
  const face = new THREE.Group();
  headG.add(face);
  const leanAt = (y) => LEAN * Math.pow(clamp((y + H / 2) / H), 3);
  // place a feature on the front surface at head-local (x, y)
  const onSurface = (obj, x, y, lift = 0.012) => {
    const r = radiusAt(pts, y), xx = x;
    const z = Math.sqrt(Math.max(r * r - xx * xx, 0.0001));
    obj.position.set(xx + leanAt(y), y, z + lift);
    obj.lookAt(new THREE.Vector3((xx + leanAt(y)) * 3, y, z * 3));
    return obj;
  };
  const EX = W * 0.17, EY = -H * 0.07, MY = -H * 0.2, BY = EY + H * 0.1;
  const faces = {};
  const buildFace = (name) => {
    const e = EXPRESSIONS[name], g = new THREE.Group();
    for (const s of [-1, 1]) {
      // eyes
      if (e.closed === "down" || e.closed === "up") {
        const dir = e.closed === "up" ? 1 : -1;
        const arc = tube([new THREE.Vector3(-0.06, 0, 0), new THREE.Vector3(0, dir * 0.05, 0), new THREE.Vector3(0.06, 0, 0)], 0.014, inkMat, 12);
        g.add(onSurface(wrap(arc), s * EX, EY));
      } else {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), inkMat);
        eye.scale.set(0.82 * e.eye, (e.closed === "half" ? 0.7 : 1.28) * e.eye, 0.42);
        const eg = new THREE.Group(); eg.add(eye); eg.userData.eye = eye;
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        glint.position.set(-0.022, 0.04 * e.eye, 0.03);
        eg.add(glint);
        if (e.closed === "half") {
          const lid = tube([new THREE.Vector3(-0.07, 0.035, 0.02), new THREE.Vector3(0, 0.05, 0.03), new THREE.Vector3(0.07, 0.035, 0.02)], 0.013, inkMat, 10);
          eg.add(lid);
        }
        g.add(onSurface(eg, s * EX, EY));
        g.userData.eyes = (g.userData.eyes || []).concat(eg);
      }
      // brows
      const raise = s === 1 ? (e.browRaise ?? 0) : 0;
      const brow = tube([new THREE.Vector3(-0.065, 0, 0), new THREE.Vector3(0, 0.02 * e.arch, 0), new THREE.Vector3(0.065, 0, 0)], 0.011, inkMat, 10);
      const bw = wrap(brow);
      brow.rotation.z = -s * e.browTilt;
      g.add(onSurface(bw, s * EX * 1.02, BY + e.browY + raise));
    }
    // mouth
    if (e.mouth === "o") {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), inkMat);
      o.scale.set(e.mw / 0.04 * 0.9, 1.1, 0.35);
      g.add(onSurface(wrap(o), 0, MY + 0.01));
    } else {
      const c = e.curve;
      const m = tube([new THREE.Vector3(-e.mw, c > 0 ? c * 0.3 : 0, 0), new THREE.Vector3(0, -c, 0), new THREE.Vector3(e.mw, c > 0 ? c * 0.3 : 0, 0)], 0.013, inkMat, 14);
      g.add(onSurface(wrap(m), 0, MY));
    }
    g.visible = false;
    face.add(g);
    faces[name] = g;
    return g;
  };
  function wrap(o) { const g = new THREE.Group(); g.add(o); return g; }

  // ── limbs (rebuilt per frame: rubber hose has no bones) ──
  const limbs = new THREE.Group();
  bodyG.add(limbs);
  const hand = () => {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), inkMat);
    palm.scale.set(1, 1.1, 0.82); palm.castShadow = true;
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), inkMat);
    thumb.position.set(0.075, 0.03, 0.02);
    g.add(palm, thumb);
    return g;
  };
  const hands = { L: hand(), R: hand() };
  hands.L.children[1].position.x *= -1;
  bodyG.add(hands.L, hands.R);
  const shoe = () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), inkMat);
    m.scale.set(1.05, 0.62, 1.45); m.castShadow = true;
    return m;
  };
  const shoes = { L: shoe(), R: shoe() };
  root.add(shoes.L, shoes.R);
  const legs = new THREE.Group();
  root.add(legs);

  const shoulderY = LEG + BH * 0.62;
  let current = null;

  const rig = {
    root, head: headG, body: bodyG, light, glow, hands, flameMat,
    dims: { R, BH, H, LEG, headY: LEG + BH + H / 2 - SINK, lapY: LEG + 0.15 },
    held: null,
    setExpression(name) {
      if (current === name) return;
      if (current) faces[current].visible = false;
      (faces[name] || buildFace(name)).visible = true;
      current = name;
    },
    /**
     * s = { expr, pose: 'stand'|'sit', arms: {L:[x,y,z], R:[x,y,z]} (hand targets in body space),
     *       flare: 0..1 (flame swell), blink: bool-able time }
     */
    update(t, s = {}) {
      rig.setExpression(s.expr || "calm");
      const sit = s.pose === "sit" || s.pose === "throne", throne = s.pose === "throne";
      // flame life: gentle sway, never a wobbling sticker
      headG.rotation.z = 0.035 * wobble(t, 0.9, 1.3);
      headG.rotation.x = 0.015 * wobble(t, 0.7, 4.1);
      const flare = s.flare ?? 0;
      const sc = 1 + 0.012 * wobble(t, 2.2, 0.5) + flare * 0.18;
      headG.scale.set(1 + flare * 0.06, sc, 1 + flare * 0.06);
      flameMat.emissiveIntensity = 0.2 + flare * 0.45 + 0.03 * wobble(t, 3.1, 2);
      if (light) light.intensity = (opts.light ?? 6) * (1 + flare * 0.8 + 0.05 * wobble(t, 4, 7));
      glow.material.opacity = 0.18 + flare * 0.3;
      // breathing (scale of the whole body group, wax height unchanged relative)
      bodyG.position.y = (sit ? -LEG + 0.02 : 0) + 0.01 * Math.sin(t * 1.6);
      // blink every ~3.7s for 0.12s (deterministic)
      const eyes = faces[current].userData.eyes;
      if (eyes) {
        const ph = (t + (opts.seed ?? 3) * 0.7) % 3.7;
        const k = ph < 0.12 ? 0.12 : 1;
        for (const eg of eyes) eg.scale.y = k;
      }
      // limbs
      for (const c of [...limbs.children, ...legs.children]) c.traverse((o) => o.geometry && o.geometry.dispose());
      limbs.clear(); legs.clear();
      const arms = s.arms || {};
      for (const side of ["L", "R"]) {
        const sx = side === "L" ? -1 : 1;
        const sh = new THREE.Vector3(sx * (R - 0.02), shoulderY, 0.02);
        const tgt = arms[side] ? new THREE.Vector3(...arms[side]) : new THREE.Vector3(sx * (R + 0.2), LEG + BH * 0.18 + 0.02 * Math.sin(t * 1.6 + sx), 0.06);
        const mid = sh.clone().lerp(tgt, 0.5).add(new THREE.Vector3(sx * 0.14, 0.06, -0.02));
        limbs.add(tube([sh, mid, tgt], 0.042, inkMat, 18));
        hands[side].position.copy(tgt);
        hands[side].rotation.z = sx * 0.25;
      }
      // legs + shoes
      for (const side of ["L", "R"]) {
        const sx = side === "L" ? -1 : 1;
        let hip, foot;
        if (throne) {
          // seated on a chair: knees forward, shins hang down off the seat edge
          hip = new THREE.Vector3(sx * 0.2, 0.12, 0.3);
          foot = new THREE.Vector3(sx * 0.24, -0.5, 0.78);
          shoes[side].position.set(foot.x, -0.56, foot.z + 0.08);
          shoes[side].rotation.set(0, 0, 0);
          const knee = new THREE.Vector3(sx * 0.23, 0.12, 0.72);
          legs.add(tube([hip, knee, foot], 0.042, inkMat, 10));
          continue;
        } else if (sit) {
          hip = new THREE.Vector3(sx * 0.2, 0.1, 0.25);
          foot = new THREE.Vector3(sx * 0.26, 0.09, 0.78);
          shoes[side].position.set(foot.x, 0.1, foot.z + 0.06);
          shoes[side].rotation.set(-1.25, 0, 0);
        } else {
          hip = new THREE.Vector3(sx * 0.2, LEG + 0.05 + bodyG.position.y, 0);
          foot = new THREE.Vector3(sx * 0.22, 0.1, 0.02);
          shoes[side].position.set(foot.x, 0.08, 0.08);
          shoes[side].rotation.set(0, 0, 0);
        }
        const mid = hip.clone().lerp(foot, 0.5).add(new THREE.Vector3(sx * 0.03, 0, 0.02));
        legs.add(tube([hip, mid, foot], 0.042, inkMat, 10));
      }
      // held prop rides between the hands
      if (rig.held) {
        const a = hands.L.position, b = hands.R.position;
        rig.held.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.02, (a.z + b.z) / 2 + 0.05);
      }
    },
  };
  rig.setExpression("calm");
  return rig;
}

// simple tunic below the neck (costume rule)
export function addTunic(rig, color = 0xc4623a, trim = 0xe9b949) {
  const { R, BH, LEG } = rig.dims;
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.035, R + 0.07, BH * 0.62, 48, 1, true), clay(color, { bump: 0.9 }));
  cloth.position.y = LEG + BH * 0.31; cloth.castShadow = true;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(R + 0.045, 0.028, 8, 48), clay(trim));
  belt.rotation.x = Math.PI / 2; belt.position.y = LEG + BH * 0.5;
  g.add(cloth, belt);
  rig.body.add(g);
  return g;
}

// the king: a bigger candle with a cape and a gold collar (nothing on the flame)
export function addRegalia(rig) {
  const { R, BH, LEG } = rig.dims;
  const cape = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.09, R + 0.32, BH + LEG - 0.05, 48, 1, true, Math.PI * 0.36, Math.PI * 1.28),
    clay(0x8e2433, { bump: 1 }));
  cape.material.side = THREE.DoubleSide;
  cape.position.y = (BH + LEG) / 2; cape.castShadow = true;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.07, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xe0a82e, roughness: 0.35, metalness: 0.6 }));
  collar.rotation.x = Math.PI / 2; collar.position.y = LEG + BH * 0.88;
  rig.body.add(cape, collar);
}
