import "dotenv/config";
import fs from "fs";
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
export async function gradeImage(filePath, format = null) {
  const b64 = fs.readFileSync(filePath).toString("base64");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType(filePath), data: b64 } },
        { type: "text", text: RUBRIC + (FORMAT_NOTES[format] ?? "") },
      ],
    }],
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
export async function auditQueue({ autoPull = false } = {}) {
  const { data } = await supabase.from("wick_posts")
    .select("id,format,topic_id,slide_urls")
    .eq("status", "approved")
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

    // Store the grade so a pattern is visible later, same reasoning as pull_reasons.
    await supabase.from("wick_posts")
      .update({ image_qa: r, image_qa_at: new Date().toISOString() })
      .eq("id", p.id);

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
