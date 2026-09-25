// Pure timing helpers for the Canvas 2D films (no three.js anywhere).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const pop = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6 * k) * Math.cos(10 * k));
export const wobble = (t, f = 1, s = 0) => Math.sin(t * f + s) * 0.5 + Math.sin(t * f * 2.3 + s * 1.7) * 0.3 + Math.sin(t * f * 4.1 + s * 2.9) * 0.2;
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 2D camera path: keys [{t, x, y, z}], eased between keys
export function camPath(keys) {
  return (t) => {
    let i = 0;
    while (i < keys.length - 1 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = a === b ? 0 : easeInOut(seg(t, a.t, b.t));
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  };
}
