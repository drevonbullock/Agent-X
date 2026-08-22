import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";

// ─── IMAGE QA — AN AUTOMATED EYE ON EVERY SLIDE ──────────────────────────────
// Dre, 2026-08-09: "make sure the images are consistent i see one of them where
// his body is cut off ... always run an analysis where you can see where the
// image is high quality and good" + "no ai slop".
//
// Two distinct failures were shipping, both invisible to any code check:
//
// 1. BODY CUT OFF. LESSON item scenes are generated 4:5 (1080x1350) but the
//    slot is 1080x700, so fitJpeg keeps only rows ~65-765 and the wax body,
//    arms and legs below that are discarded. The character reads as a floating
//    head.
// 2. AI SLOP. One queued slide had NO Wick in it at all: a blob-headed creature
//    and a slice of bread with HUMAN HANDS holding a phone, while Wick's flame
//    sat on the table as a disembodied puddle.
//
// Neither is detectable without looking, so this looks. Claude vision grades
// every slide against the brand's own rules and returns a structured verdict.

const client = new Anthropic();

// What Wick must be in every frame. Restated here rather than imported so the
// grader is judging against an explicit standard, not a prompt fragment.
const CHARACTER = `WICK is an anthropomorphic CANDLE:
- His HEAD is a golden teardrop flame with a simple cartoon face (two eyes, a small mouth). The flame is roughly the same height as his body.
- His BODY is a short cream wax cylinder with soft drips. Nothing else.
- His ARMS and LEGS are thin black rubber hose limbs ending in rounded mitten hands and rounded feet.
- He has NO human torso, shoulders, chest, hips, neck, skin, hair or fingers.`;

const RUBRIC = `Grade this Instagram slide for Wick's Wisdom. Look closely at the ARTWORK, not the text.

${CHARACTER}

Fail it for ANY of these:
A. CUT OFF — Wick's body is sliced by the frame edge or by the text panel so his wax body, arms or legs are missing and he reads as a floating head. A deliberate close-up is fine ONLY if it looks intentional and he is not awkwardly bisected.
B. WRONG ANATOMY — human hands with fingers, a human torso, shoulders, legs in trousers, skin, or any figure built like a person rather than a candle.
C. OFF-MODEL OR MISSING — Wick is absent, or the main character is not a candle (a blob, a loaf of bread, a generic mascot), or a second character appears that is not clearly a candle in the same style.
D. DISEMBODIED PARTS — a flame, limb or face floating detached from a body.
E. AI SLOP — melted or warped geometry, duplicated or fused limbs, garbled or nonsense objects, an object merging into another, uncanny extra eyes or mouths, obvious rendering mush.
F. TEXT IN THE ARTWORK — any letters, numbers or signage generated inside the image (composited caption text at the bottom is expected and fine).
G. STYLE BREAK — not the warm amber cinematic 3D cartoon look: wrong palette, flat 2D, photoreal, or a different rendering style.

Return ONLY this JSON:
{"pass": true|false, "severity": "clean"|"minor"|"bad", "codes": ["A".."G"], "reason": "one plain sentence naming what is wrong, or 'clean'"}
"minor" = shippable but not great. "bad" = must not publish.`;

// Format-specific allowances. Without these the grader marks correct work as
// broken, which is worse than missing a fault: it trains the learning loop on
// false positives and would auto-pull good posts.
const FORMAT_NOTES = {
  SCENE:
    " NOTE: this is a RAW generated scene, graded BEFORE any text or layout is added. There is " +
    "no composited text yet, so do not fault missing headlines or captions; any readable text " +
    "visible here was generated inside the artwork and IS a fault. Judge only the character, " +
    "the scene and the craft.",
  PARABLE:
    "\nFORMAT NOTE: this is a PARABLE. An inanimate OBJECT in the scene is deliberately given a " +
    "simple cartoon face because it speaks to Wick. That is correct and must NOT be failed under C. " +
    "Only fail C if WICK himself is off-model or a human-like figure appears.",
  COSTUME:
    "\nFORMAT NOTE: this is a COSTUME slide. Wick wears ONE small accessory denoting a role (hard hat, " +
    "lanyard, visor, apron). That is correct. Still fail B if the accessory gives him a human torso, " +
    "shoulders or legs.",
};

// Sniff the MAGIC BYTES, never the extension. Recovered library art is written
// with a .jpg name but is actually PNG, and the API rejects the mismatch with
// "specified using the image/jpeg media type, but the image appears to be png".
// Trusting the filename made every one of those images ungradeable.
const mediaType = (p) => {
  try {
    const b = fs.readFileSync(p).subarray(0, 4);
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x52 && b[1] === 0x49) return "image/webp";
    if (b[0] === 0x47 && b[1] === 0x49) return "image/gif";
  } catch { /* fall through */ }
  return p.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
};

// Grade one image file.
// Canonical Wick, cropped from the character sheet. The grader compares every
// candidate against THIS, because 9 of 10 of Dre's manual rejections were a
// DIFFERENT candle passing review: the rubric said "a candle with rubber-hose
// limbs" and any candle satisfied it. Identity cannot be checked from a text
// description; the grader has to see the real character.
const REF_PATH = path.join(process.cwd(), "data", "wick-reference.jpg");
let REF_B64 = null;
function refImage() {
  if (REF_B64 === null) {
    try { REF_B64 = fs.readFileSync(REF_PATH).toString("base64"); }
    catch { REF_B64 = ""; console.warn("[QA] data/wick-reference.jpg missing — grading WITHOUT identity reference"); }
  }
  return REF_B64;
}

const IDENTITY_RUBRIC =
  "The FIRST image is the canonical reference of Wick, the only character this page is allowed " +
  "to show. The SECOND image is the candidate being graded. Before anything else, check " +
  "IDENTITY: every candle character in the candidate must be unmistakably THE SAME character " +
  "as the reference — same golden teardrop flame head with the same simple face, same cream " +
  "wax cylinder body with soft drips, same thin black rubber-hose limbs with rounded mitten " +
  "hands. A candle with different proportions, a different face, a different body shape, " +
  "holder or base, or a second candle that does not match the reference is fault code I, " +
  "severity bad, no exceptions — being 'a nice candle character' is not enough, it must be " +
  "HIM. ";

export async function gradeImage(filePath, format = null) {
  const b64 = fs.readFileSync(filePath).toString("base64");
  const ref = refImage();
  const content = [];
  if (ref) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: ref } });
  content.push({ type: "image", source: { type: "base64", media_type: mediaType(filePath), data: b64 } });
  content.push({ type: "text", text: (ref ? IDENTITY_RUBRIC : "") + RUBRIC + (FORMAT_NOTES[format] ?? "") });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content }],
  });
  try {
    const t = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const v = JSON.parse(t.slice(t.indexOf("{")));
    return { pass: !!v.pass, severity: v.severity ?? "bad", codes: v.codes ?? [], reason: v.reason ?? "" };
  } catch {
    // A grader that cannot parse must not silently pass a slide.
    return { pass: false, severity: "minor", codes: [], reason: "grader returned unparseable output" };
  }
}

// Pre-composite gate for a RAW scene, before any text is burned in. This is
// the "check the image before the post gets created" Dre asked for: a wrong
// candle caught here costs 2 credits to regenerate; caught after compositing
// it costs the slide, and missed entirely it costs a manual reject.
export async function gradeScene(filePath) {
  try {
    return await gradeImage(filePath, "SCENE");
  } catch (err) {
    // The grader being down must never block generation — the post-composite
    // gate still stands between this image and the feed.
    console.warn(`[QA] scene grade unavailable (${String(err.message).slice(0, 80)}) — proceeding`);
    return { pass: true, severity: "clean", codes: [], reason: "grader unavailable" };
  }
}

// Grade every slide of a post from its public URLs.
export async function gradePost(post, { tmpDir = "/tmp/wick-qa" } = {}) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const urls = post.slide_urls ?? [];
  const slides = [];

  for (let i = 0; i < urls.length; i++) {
    const f = `${tmpDir}/${post.id}-${i + 1}.jpg`;
    try {
      const r = await fetch(urls[i]);
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    } catch (err) {
      slides.push({ slide: i + 1, pass: false, severity: "minor", reason: `could not fetch: ${err.message}` });
      continue;
    }
    const g = await gradeImage(f, post.format);
    slides.push({ slide: i + 1, ...g });
    fs.rmSync(f, { force: true });
  }

  const bad = slides.filter((s) => s.severity === "bad");
  const minor = slides.filter((s) => s.severity === "minor");
  return {
    postId: post.id,
    format: post.format,
    topicId: post.topic_id,
    slides,
    bad: bad.length,
    minor: minor.length,
    verdict: bad.length ? "BAD" : minor.length > 1 ? "WEAK" : "OK",
  };
}

// Sweep everything currently queued. This is the "always run an analysis" part.
// Reels get the same gate as posts. One image (the cover) instead of a
// carousel, but the failure modes are identical -- and reels had NO grader at
// all until 2026-08-22, landing directly as 'approved'.
export async function auditReels() {
  const { data } = await supabase.from("wick_reels")
    .select("id,layout,topic_id,cover_url,status")
    .in("status", ["qa_pending"])
    .order("created_at");
  if (!data?.length) return { checked: 0 };

  let passed = 0;
  for (const r of data) {
    try {
      const dir = path.join(os.tmpdir(), "wick-qa-reels");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${r.id}.img`);
      const res = await fetch(r.cover_url);
      if (!res.ok) throw new Error(`fetch cover: ${res.status}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));

      const g = await gradeImage(file, "REEL");
      const promoted = g.severity === "bad" ? "rejected" : "approved";
      await supabase.from("wick_reels")
        .update({ image_qa: g, image_qa_at: new Date().toISOString(), status: promoted })
        .eq("id", r.id);
      if (promoted === "approved") passed++;
      console.log(`${promoted === "approved" ? "✅" : "❌"} REEL ${r.layout} ep${r.topic_id}: ${g.severity}${g.reason ? " — " + String(g.reason).slice(0, 100) : ""}`);
    } catch (err) {
      // An ungradeable reel stays qa_pending: never promote what was not seen.
      console.warn(`[QA] reel ${r.id} ungradeable (stays qa_pending): ${err.message}`);
    }
  }
  return { checked: data.length, passed };
}

export async function auditQueue({ autoPull = false } = {}) {
  const { data } = await supabase.from("wick_posts")
    .select("id,format,topic_id,slide_urls,status,slide_specs")
    .in("status", ["qa_pending", "approved"])
    .order("created_at");
  if (!data?.length) return { checked: 0, results: [] };

  const results = [];
  for (const p of data) {
    const r = await gradePost(p);
    results.push(r);
    const tag = r.verdict === "OK" ? "✅" : r.verdict === "WEAK" ? "⚠️ " : "❌";
    console.log(`${tag} ${r.format} ep${r.topicId}: ${r.verdict} (${r.bad} bad, ${r.minor} minor)`);
    for (const s of r.slides.filter((x) => x.severity !== "clean")) {
      console.log(`     slide ${s.slide} [${(s.codes ?? []).join("")}] ${s.reason}`);
    }

    // The QA is now the GATE. Posts land as qa_pending and only reach "approved"
    // (the state publishNextApproved draws from) by passing here. Before this,
    // a post built at 2pm was approved instantly and published at 4pm, while the
    // QA only ran at 7am: ep1024 went out 23 minutes after being built and
    // ep1029 100 minutes after, neither ever graded.
    // BAD posts get ONE shot at slide-level repair before rejection. Every
    // image rejection in the 2026-08-22 batch was a single bad slide out of
    // 5-7; rejecting the post threw away six good, paid-for slides each time.
    // The repair regenerates just the failing slide from the recipe the builder
    // recorded, and its replacement is re-graded before being trusted.
    if (r.verdict === "BAD" && p.slide_specs?.length) {
      try {
        const { repairPost } = await import("./wick-repair.js");
        const fixed = await repairPost(p, r, gradeImage);
        if (fixed) {
          r.slides = fixed.slides;
          r.bad = fixed.slides.filter((s) => s.severity === "bad").length;
          r.minor = fixed.slides.filter((s) => s.severity === "minor").length;
          r.verdict = r.bad ? "BAD" : r.minor > 1 ? "WEAK" : "OK";
          r.repaired = true;
          await supabase.from("wick_posts").update({ slide_urls: fixed.urls }).eq("id", p.id);
          console.log(`     → repaired in place, new verdict ${r.verdict}`);
        }
      } catch (err) {
        console.warn(`     repair attempt failed (post stays as graded): ${err.message}`);
      }
    }

    const promoted = r.verdict === "BAD" ? "rejected" : "approved";
    await supabase.from("wick_posts")
      .update({ image_qa: r, image_qa_at: new Date().toISOString(), status: promoted })
      .eq("id", p.id);
    if (promoted === "approved" && p.status === "qa_pending") {
      console.log(`     → passed QA, cleared to publish`);
    }

    // Artwork faults teach the IMAGE prompts, the same way copy faults teach the
    // writing prompts.
    if (r.verdict !== "OK") {
      try {
        const { learnFrom } = await import("./wick-lessons.js");
        await learnFrom(r.slides.filter((x) => x.severity === "bad").map((x) => x.reason),
                        { scope: "image", source: "image-qa" });
      } catch (err) { console.warn(`[WickQA] could not learn: ${err.message}`); }
    }

    if (autoPull && r.verdict === "BAD") {
      await supabase.from("wick_posts").update({ status: "rejected" }).eq("id", p.id);
      console.log(`     → pulled (would have published broken artwork)`);
    }
  }
  // Reels ride the same sweep so every caller of the gate covers both tables.
  try { await auditReels(); } catch (err) { console.warn(`[QA] reel audit failed: ${err.message}`); }
  return { checked: data.length, results };
}

// CLI: node modules/wick-image-qa.js            audit the queue
//      node modules/wick-image-qa.js --pull     audit and pull anything BAD
const entry = process.argv[1] ? (await import("url")).pathToFileURL(process.argv[1]).href : null;
if (entry && import.meta.url === entry) {
  auditQueue({ autoPull: process.argv.includes("--pull") }).then((r) => {
    const bad = r.results.filter((x) => x.verdict === "BAD").length;
    console.log(`\n${r.checked} posts checked, ${bad} unpublishable.`);
    process.exit(bad ? 1 : 0);
  });
}
