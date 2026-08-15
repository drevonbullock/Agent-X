import fs from "fs";
import path from "path";

// ─── THE REUSABLE ART LIBRARY ────────────────────────────────────────────────
// Dre, 2026-08-14: "take the ones you sent me, rate them from best to worse and
// use the best for new batches."
//
// Every raw scene the pipeline generated used to be deleted: the batch removes
// its temp dir after each post, and the composited slides have text burned in,
// so nothing was reusable. The originals were recovered from Higgsfield's job
// history, mirrored to Supabase (its own URLs are signed and expire, and the
// history is a rolling window of 100), then graded by the same vision QA that
// guards published posts.
//
// The grades are the ranking, and they are honest about it:
//   22 clean   safe to reuse as-is
//   10 minor   usable but each has a specific caveat
//    4 bad     never reuse (extra candle characters, off-model clones)
//
// Reuse costs ZERO Higgsfield credits, which is the whole point: a 5 slide
// carousel that reuses art saves roughly 35 credits, a 7 slide LESSON about 50.

const RANKED = path.join(process.cwd(), "data", "wick-art-ranked.json");

let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(RANKED, "utf8")); }
  catch { cache = []; }
  return cache;
}

// Only ever hand out art the grader passed. "minor" is deliberately EXCLUDED by
// default: each minor has a real fault (a prop with a face, legs hidden, a
// human-ish shape in a doorway), and shipping a known fault to save 7 credits is
// a bad trade on a page whose whole asset is one consistent character.
// TWO gates, not one. An image can be perfectly clean as a full frame and still
// fail once compositeLessonItem crops it to a 1080x700 top strip: the crop takes
// the lower part of the picture, and on art where the character stands low that
// removes his body. Graded both ways, only 13 of the 22 clean images survive the
// crop, and a batch built on full-frame grades alone shipped a slide the QA then
// failed as "a floating teardrop flame head".
export function bestArt({ limit = 100, includeMinor = false, forStrip = true } = {}) {
  const ok = new Set(includeMinor ? ["clean", "minor"] : ["clean"]);
  return load()
    .filter((a) => ok.has(a.severity))
    .filter((a) => (forStrip ? a.strip === "clean" : true))
    .slice(0, limit);
}

// Pick n images for one post, avoiding anything already used in this batch so a
// carousel never shows the same frame twice.
export function pickArt(n, used = new Set()) {
  const pool = bestArt().filter((a) => !used.has(a.n));
  const chosen = pool.slice(0, n);
  chosen.forEach((a) => used.add(a.n));
  return chosen;
}

export function libraryStats() {
  const all = load();
  const by = {};
  for (const a of all) by[a.severity] = (by[a.severity] ?? 0) + 1;
  return { total: all.length, ...by, reusable: bestArt().length };
}
