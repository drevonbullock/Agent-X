import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import supabase from "../supabase/client.js";
import {
  generateScene, download,
  compositeSinglePanel, compositeReveal, compositeCta, compositeParable,
  compositeCostume, compositeLessonCover, compositeLessonItem,
  compositeTwoPanel, compositeSplitPanel,
} from "./wick-render.js";

// ─── SLIDE-LEVEL REPAIR ──────────────────────────────────────────────────────
// Every image-rejected post in the 2026-08-22 batch had EXACTLY ONE bad slide
// out of 5-7. The gate's only verdict was post-level, so six good, paid-for
// slides were binned each time -- that is the whole gap between the 37% pass
// rate and an acceptable one. This regenerates just the failing slide from the
// recipe the builder recorded (wick_posts.slide_specs), re-composites it with
// the same text, and hands the new image back to the gate for re-grading.
//
// Scope rules:
//   - Repair only when the recipe exists (older posts have no slide_specs).
//   - At most 2 bad slides. Three or more failing means the scene prompts for
//     this post are systematically off; regenerating them one by one just
//     spends credits chasing variance.
//   - ONE repair pass per slide. The re-grade decides; no loops.
//   - The QA reason is appended to the prompt as a correction, so the second
//     attempt knows exactly what the first got wrong.

const COMPOSITORS = {
  compositeSinglePanel, compositeReveal, compositeCta, compositeParable,
  compositeCostume, compositeLessonCover, compositeLessonItem,
  compositeTwoPanel, compositeSplitPanel,
};

const BUCKET = "agent-x-images";

// Derive the storage key from the slide's public URL, and suffix the repair so
// the original object survives. NEVER overwrite in place: the CDN caches the
// old bytes under the old key, and a same-key overwrite can serve the rejected
// image to Instagram later while the DB claims it was repaired.
function repairKey(publicUrl) {
  const m = String(publicUrl).split(`/object/public/${BUCKET}/`)[1];
  if (!m) return null;
  return m.replace(/(\.[a-z]+)?$/i, "") + "-repair.jpg";
}

async function uploadBuffer(buf, key) {
  let last;
  for (let i = 1; i <= 4; i++) {
    const { error } = await supabase.storage.from(BUCKET)
      .upload(key, buf, { contentType: "image/jpeg", upsert: true });
    if (!error) return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    last = error;
    await new Promise((r) => setTimeout(r, 2000 * i));
  }
  throw new Error(`upload ${key}: ${last?.message}`);
}

// Rebuild ONE slide. Returns { url, buffer } or throws.
export async function rebuildSlide(post, slideIndex, reason = "") {
  const spec = post.slide_specs?.[slideIndex];
  if (!spec?.c || !COMPOSITORS[spec.c]) throw new Error(`no rebuild recipe for slide ${slideIndex + 1}`);

  const dir = path.join(os.tmpdir(), "wick-repair", post.id);
  fs.mkdirSync(dir, { recursive: true });

  // Regenerate every scene this slide needs (two for VERSUS panels, one
  // otherwise), with the grader's objection appended as a correction.
  const correction = reason
    ? ` CORRECTION: a previous attempt at this exact scene was rejected for the following fault, do not repeat it: ${reason}`
    : "";
  const params = { ...(spec.params ?? {}) };
  for (let j = 0; j < spec.scenes.length; j++) {
    const sc = spec.scenes[j];
    const { url } = generateScene(sc.prompt + correction, sc.aspect);
    const p = await download(url, path.join(dir, `scene-${j}.png`));
    params[spec.pathKeys[j]] = p;
  }

  const buffer = await COMPOSITORS[spec.c](params);

  const key = repairKey(post.slide_urls[slideIndex]);
  if (!key) throw new Error(`cannot derive storage key from ${post.slide_urls[slideIndex]}`);
  const url = await uploadBuffer(buffer, key);

  fs.rmSync(dir, { recursive: true, force: true });
  return { url, buffer };
}

// Attempt to save a BAD post by repairing its failing slides. `gradeFile` is
// injected by the QA module (avoids a circular import). Returns the updated
// slides array and urls if the post is now clean, or null if repair failed.
export async function repairPost(post, qaResult, gradeFile, { maxBad = 2 } = {}) {
  const badSlides = (qaResult.slides ?? []).filter((s) => s.severity === "bad");
  if (!badSlides.length || badSlides.length > maxBad) return null;
  if (!post.slide_specs?.length) return null;

  const urls = [...post.slide_urls];
  const slides = qaResult.slides.map((s) => ({ ...s }));

  for (const bad of badSlides) {
    const idx = bad.slide - 1;
    console.log(`[Repair] ${post.format} slide ${bad.slide}: regenerating (${String(bad.reason).slice(0, 90)})`);
    let rebuilt;
    try {
      rebuilt = await rebuildSlide(post, idx, bad.reason);
    } catch (err) {
      console.warn(`[Repair] slide ${bad.slide} rebuild failed: ${err.message}`);
      return null;
    }

    // Re-grade the REPLACEMENT before trusting it. A repair that skips the
    // grader is the ungraded-publish bug all over again.
    const tmp = path.join(os.tmpdir(), `wick-repair-grade-${post.id}-${idx}.jpg`);
    fs.writeFileSync(tmp, rebuilt.buffer);
    const g = await gradeFile(tmp, post.format);
    fs.rmSync(tmp, { force: true });

    if (g.severity === "bad") {
      console.log(`[Repair] slide ${bad.slide} replacement ALSO failed (${String(g.reason).slice(0, 90)}) — post stays rejected`);
      return null;
    }
    urls[idx] = rebuilt.url;
    slides[idx] = { slide: bad.slide, ...g, repaired: true };
    console.log(`[Repair] slide ${bad.slide} repaired: ${g.severity}`);
  }

  return { urls, slides };
}
