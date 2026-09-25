// Shared helpers for every film. Everything here is deterministic: a frame is a
// pure function of time, so the headless capture can jump to any frame and get
// the exact same picture every run.
import * as THREE from "three";

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
// progress of t through [a, b], clamped 0..1
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const easeOutBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// damped bounce used for "pop" entrances: 0 -> overshoot -> settle at 1
export const pop = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6 * k) * Math.cos(10 * k));

// seeded PRNG (mulberry32) so "random" layouts are identical every render
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap smooth noise for flicker / handheld drift
export const wobble = (t, f = 1, seed = 0) =>
  Math.sin(t * f * 1.0 + seed) * 0.5 + Math.sin(t * f * 2.3 + seed * 1.7) * 0.3 + Math.sin(t * f * 4.1 + seed * 2.9) * 0.2;

// ── CLAY ────────────────────────────────────────────────────────────────────
// A faint fingerprint / press texture used as a bump map, which is most of what
// sells "clay" instead of "plastic".
let clayBump = null;
export function clayBumpTexture() {
  if (clayBump) return clayBump;
  const s = 256, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d"), r = rng(7);
  g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const x = r() * s, y = r() * s, rad = 2 + r() * 10, v = 110 + r() * 40;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
    grd.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  clayBump = new THREE.CanvasTexture(c);
  clayBump.wrapS = clayBump.wrapT = THREE.RepeatWrapping;
  clayBump.repeat.set(2, 2);
  return clayBump;
}

export function clay(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.82, metalness: 0,
    bumpMap: clayBumpTexture(), bumpScale: opts.bump ?? 0.6,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
    ...(opts.extra || {}),
  });
}

export function glossy(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: opts.roughness ?? 0.28, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.2,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

// soft radial glow sprite (additive) — used for flames, lamps, the far square
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const s = 256, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.1)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
export function glowSprite(color, scale = 2, opacity = 0.6) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

// camera keyframes: [{t, pos:[x,y,z], look:[x,y,z], fov}] eased between keys
export function cameraPath(keys) {
  const p = new THREE.Vector3(), l = new THREE.Vector3();
  return (camera, t) => {
    let i = 0;
    while (i < keys.length - 1 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = a === b ? 0 : easeInOut(seg(t, a.t, b.t));
    p.set(lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k));
    l.set(lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k));
    camera.position.copy(p);
    camera.lookAt(l);
    const fov = lerp(a.fov ?? 35, b.fov ?? 35, k);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  };
}

// project a world point to output-canvas pixels (for labels that ride 3D objects)
const _v = new THREE.Vector3();
export function toScreen(obj3dOrVec, camera, W, H) {
  if (obj3dOrVec.isObject3D) obj3dOrVec.getWorldPosition(_v); else _v.copy(obj3dOrVec);
  _v.project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind: _v.z > 1 };
}
