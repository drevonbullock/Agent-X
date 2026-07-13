import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── HIGGSFIELD BACKGROUND LIBRARY ───────────────────────────────────────────
// Premium pre-generated backgrounds (Higgsfield nano_banana_2) committed to the
// repo in images/backgrounds/. Deploys with the app, so Railway gets them with
// zero runtime dependency. Used as the primary cheatsheet background source.

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "backgrounds");

let cache = null;

function listBackgrounds() {
  if (cache) return cache;
  try {
    cache = fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  } catch {
    cache = [];
  }
  return cache;
}

// Returns base64 PNG string or null. Rotates randomly across the library.
export function getRandomBackgroundBase64() {
  const files = listBackgrounds();
  if (!files.length) return null;
  const pick = files[Math.floor(Math.random() * files.length)];
  try {
    return fs.readFileSync(path.join(DIR, pick)).toString("base64");
  } catch {
    return null;
  }
}
