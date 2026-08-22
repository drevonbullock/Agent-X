import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { launchBrowser } from "../images/browser.js";

// ─── WICK'S WISDOM — GENERATION + COMPOSITING ────────────────────────────────
// Higgsfield generates the ART only. Every word of label copy is added here at
// composite time, so copy can be fixed without re-rolling art (SKILL.md Step 5).

// Resolve the CLI without relying on PATH. On the Mac it is a global Homebrew
// symlink; on Railway it is a project dependency at node_modules/.bin, which is
// NOT on PATH for a binary spawned directly by `node index.js` (only npm
// scripts get that). Checking the local path first is what lets Railway build.
function resolveHfBin() {
  if (process.env.HF_BIN) return process.env.HF_BIN;
  const local = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");
  if (fs.existsSync(local)) return local;
  return "higgsfield";                      // global install / on PATH
}
const HF_BIN = resolveHfBin();
const FFPROBE = process.platform === "darwin" ? "/opt/homebrew/bin/ffprobe" : "/usr/bin/ffprobe";
const WICK_ELEMENT = process.env.WICK_ELEMENT_ID || "5e934732-6de4-438a-b3a6-024144603518";
// nano_banana_pro is the PRIMARY model (Dre, 2026-08-21: "use nano banana pro
// not gpt2"). It is not the budget option, and I was wrong to call it the weaker
// one: for this brand it is the better fit on the merits, cost aside.
//   - It accepts 4:5 NATIVELY. gpt_image_2 rejects 4:5, so every frame had to be
//     asked for at 3:4 and resampled to 1080x1350 — a quality loss on every
//     single slide that nano_banana_pro simply does not incur.
//   - Character consistency from a reference element is its strength, and one
//     consistent character IS this page's entire asset.
// Its one real weakness, inventing UI text in scenes, is already countered by
// NO_TEXT_HARD below, and every label we ship is composited by us anyway.
const MODEL = process.env.WICK_IMAGE_MODEL || "nano_banana_pro";
// Exported so every post records WHICH model made its art. See the migration
// add_image_model_to_wick_posts: without attribution, model comparisons are
// opinion. With it, image_qa.verdict grouped by image_model is evidence.
export const activeModel = () => MODEL;
const FALLBACK_MODEL = process.env.WICK_FALLBACK_MODEL || "gpt_image_2";

// The locked style stack. Appended to EVERY scene prompt, never varied.
// This is what makes 200 posts look like one page.
export const STYLE_STACK =
  "Polished cinematic 3D cartoon. Smooth dimensional shading, soft wax texture, glossy " +
  "golden highlights, warm rim lighting, subtle glow around the flame head, crisp edges, " +
  "premium animated mascot quality, clearly cartoon and not photorealistic. Deep vignette " +
  "at the frame edges. No logos, no real brand names, no watermark, no text of any kind.";

const PALETTE_WARM = "Warm amber gold, cream ivory, deep near-black shadow.";
const PALETTE_COLD = "Cold blue-grey with a weak surviving amber core on his face.";

const el = () => `<<<${WICK_ELEMENT}>>>`;

// ─── CAMERA VARIETY ──────────────────────────────────────────────────────────
// Without this every frame is the same front-on eye-level shot, which reads as a
// sticker pack rather than a character living in scenes. A deterministic index
// keeps a single carousel varied while staying repeatable across re-runs.

const CAMERAS = [
  "Wide establishing shot, camera at his eye level.",
  "Low angle looking slightly up at him, making him feel larger in the frame.",
  "High angle looking gently down, the world bigger than he is.",
  "Medium shot from a three quarter angle, camera slightly off to one side.",
  "Over the shoulder from behind him, looking past him into the scene.",
  "Close medium shot, camera near the ground looking across at him.",
  "Wide shot with him small in a large space, dwarfed by the setting.",
  "Slight dutch tilt, camera angled a few degrees off level for unease.",
];

// There used to be a POSES list injected here at random by seed. It gave the
// carousel physical variety and destroyed its meaning: a slide reading "he kept
// the old rent when income went up" rendered him squatting at a kitchen counter,
// because the pose was picked by arithmetic and knew nothing about the label.
//
// Pose is MEANING, so it comes from the copy, which knows what the slide is
// arguing. Only the camera is varied here, because the angle can change freely
// without contradicting the sentence.
function variety(seed = 0) {
  return { camera: CAMERAS[seed % CAMERAS.length] };
}

// ─── HIGGSFIELD ──────────────────────────────────────────────────────────────

export function hfAvailable() {
  try { execFileSync(HF_BIN, ["auth", "token"], { timeout: 10_000, stdio: "pipe" }); return true; }
  catch { return false; }
}

// gpt_image_2 accepts only 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3 — it REJECTS 4:5.
// Ask for 3:4 (the nearest vertical) and let the compositor normalize to the
// exact 1080x1350 Instagram needs. Without this every CTA, COSTUME and LESSON
// slide fails at generation time.
const ASPECT_MAP = { "4:5": "3:4", "5:4": "4:3" };

// nano_banana_pro renders UI text into scenes even when the style stack forbids
// it (observed 2026-07-31: a laptop drawn with "Banking App" and invented dollar
// figures). Every label we ship is composited, and a generated number reads as a
// real figure, so the ban gets restated in the strongest terms for that model.
const NO_TEXT_HARD =
  " CRITICAL: render absolutely no text, no letters, no numbers, no digits, no " +
  "currency amounts, no words, no UI labels, no menu items, no app interfaces, no " +
  "signage, no shop signs, no logos, no emblems, no icons, no symbols, no pictograms, no badges, " +
  "no brand marks and no writing of any kind anywhere in this image. Any screen, " +
  "paper, notebook, sign or display must be completely blank, showing only abstract " +
  "shapes, blocks, lines or glowing colour with no readable characters whatsoever.";

// execFileSync's err.message is "Command failed: <full binary path>" and nothing
// else useful, so logging 80 characters of it prints a truncated file path and
// no reason at all. That is what "Command failed: .../node_modules/.bin/higg"
// was: a failure report containing zero information about the failure. The real
// cause (moderation, a bad aspect, a queue error) is on stderr.
function cliError(err) {
  const stderr = String(err?.stderr ?? "").trim();
  const stdout = String(err?.stdout ?? "").trim();
  return (stderr || stdout || String(err?.message ?? "unknown")).replace(/\s+/g, " ").slice(0, 300);
}

function runModel(model, prompt, aspect) {
  // nano_banana_pro accepts 4:5 natively and takes no quality flag.
  const isNB = model.startsWith("nano_banana");
  const args = [
    "generate", "create", model,
    "--prompt", isNB ? prompt + NO_TEXT_HARD : prompt,
    "--aspect_ratio", isNB ? aspect : (ASPECT_MAP[aspect] ?? aspect),
    "--resolution", "2k",
    "--wait", "--wait-timeout", "12m",
    "--json",
  ];
  if (!isNB) args.splice(args.indexOf("--resolution"), 0, "--quality", "high");
  return execFileSync(HF_BIN, args, { timeout: 15 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 }).toString().trim();
}

// Generate one image. Returns { url, jobId, model }.
// Tries the primary model, falls back to the cheaper backup on failure.
// ─── PACING ──────────────────────────────────────────────────────────────────
// 2026-08-21: a batch produced 21 "Higgsfield API request failed" errors, 42
// retries and 11 dead posts out of 14 -- while a SINGLE generation run 45
// seconds later succeeded in 31s. The API was never unhealthy. The batch fires
// generations back to back with no gap, and hits a rate limit.
//
// My own retry loop then made it worse: 3 fast attempts with 4s and 8s backoff
// meant every rate-limited call became SIX rapid calls, so the thing added to
// survive transient failures was manufacturing them. A retry that does not back
// off properly is a denial of service against yourself.
//
// So: a floor on the gap between calls, and backoff measured in tens of seconds
// rather than single digits.
const MIN_GAP_MS = parseInt(process.env.WICK_GEN_GAP_MS ?? "6000", 10);
let lastCallAt = 0;

const sleepSync = (ms) => { if (ms > 0) execFileSync("sleep", [String(Math.ceil(ms / 1000))]); };

function pace() {
  const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
  if (wait > 0) sleepSync(wait);
  lastCallAt = Date.now();
}

export function generateScene(prompt, aspect = "3:4") {
  // RETRY THE SAME MODEL. DO NOT SWITCH MODELS MID-CAROUSEL.
  //
  // This used to fall straight to FALLBACK_MODEL on the first failure, which is
  // wrong for this brand in three ways at once. A single carousel would ship
  // slides drawn by two different models, so the character's look changes
  // between slide 3 and slide 4 -- on a page whose entire asset is one
  // consistent character, that is precisely the slop we are trying to prevent.
  // It also silently overrides Dre's explicit model choice, and it makes
  // wick_posts.image_model a lie, since the row records one model while some
  // slides came from another.
  //
  // Generation failures are usually transient (a queue hiccup, a moderation
  // false positive on one prompt), so the right response is to ask the SAME
  // model again with a short backoff. Only if it fails repeatedly do we
  // consider another model, and that now requires WICK_ALLOW_MODEL_FALLBACK
  // to be set explicitly rather than happening behind Dre's back.
  const ATTEMPTS = 3;
  let raw, usedModel = MODEL, lastErr;
  for (let a = 1; a <= ATTEMPTS; a++) {
    try { pace(); raw = runModel(MODEL, prompt, aspect); lastErr = null; break; }
    catch (err) {
      lastErr = err;
      console.warn(`[Wick] ${MODEL} attempt ${a}/${ATTEMPTS} failed: ${cliError(err)}`);
      // 30s, then 60s. Rate limits do not clear in four seconds, and the old
      // 4s/8s backoff is what turned one throttled call into a storm.
      if (a < ATTEMPTS) sleepSync(30_000 * a);
    }
  }
  if (lastErr) {
    if (process.env.WICK_ALLOW_MODEL_FALLBACK !== "true") {
      // Fail the SLIDE, not the look of the whole carousel. The batch catches
      // this per post and moves on, so one bad prompt costs one post rather
      // than quietly degrading every post after it.
      throw new Error(`${MODEL} failed ${ATTEMPTS}x: ${cliError(lastErr)}`);
    }
    console.warn(`[Wick] ${MODEL} failed ${ATTEMPTS}x — WICK_ALLOW_MODEL_FALLBACK=true, using ${FALLBACK_MODEL}`);
    usedModel = FALLBACK_MODEL;
    raw = runModel(FALLBACK_MODEL, prompt, aspect);
  }

  const parsed = JSON.parse(raw);
  const jobs = Array.isArray(parsed) ? parsed : [parsed];
  const job = jobs[0] ?? {};
  // CLI v1.x returns result_url; older shapes used output_urls / results.rawUrl.
  const url = job.result_url
    ?? (job.output_urls ?? [])[0]
    ?? job.results?.rawUrl
    ?? job.results?.[0]?.rawUrl
    ?? job.min_result_url;
  if (!url) {
    throw new Error(`Higgsfield returned no result URL (status: ${job.status ?? "unknown"})`);
  }
  return { url, jobId: job.id ?? null, model: usedModel };
}

// Retries here rather than letting the caller retry, because the caller's retry
// re-runs generateScene and spends the credits again. The image already exists
// on Higgsfield at this point; a fetch blip should never cost another 7 credits.
export async function download(url, destPath, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed ${res.status}`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
      return destPath;
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const backoff = 2000 * i;
        console.warn(`[Wick] download attempt ${i}/${attempts} failed (${err.message}), retrying in ${backoff / 1000}s`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr;
}

// ─── PROMPT BUILDERS ─────────────────────────────────────────────────────────
// Never re-describe Wick in prose. Always the element placeholder.

// Anatomy + framing, on EVERY scene. Both were previously only on costume
// prompts, and a vision audit of the queue on 2026-08-09 found the cost: 6 of 9
// posts unpublishable. Failures included a slice of toast with human hands
// holding a phone, a suited humanoid with articulated fingers, Wick as a
// disembodied flame on a table, and repeated "floating head" frames where the
// wax body was simply absent. The generator will invent a person unless told
// plainly and every single time what this character is.
// No leading "CHARACTER:" label here — scenePrompt's CHARACTER section supplies
// it, and carrying it in both places printed the word twice in every prompt.
const ANATOMY_HARD =
  " He is a CANDLE, not a person. His head is a golden teardrop flame with a simple " +
  "cartoon face, roughly as tall as his body. His body is a short cream wax cylinder with soft " +
  "drips and nothing else. His arms and legs are thin black rubber hose limbs ending in rounded " +
  "mitten hands and rounded feet. He has NO human torso, shoulders, chest, hips, neck, skin, hair " +
  "or fingers, and never wears clothing that implies any of them. " +
  "ONLY ONE CHARACTER. Exactly one candle appears in this frame and it is Wick. Do NOT add a " +
  "second candle, a smaller candle, a background candle, a candle inside a box or on a shelf, a " +
  "crowd, a bystander, a shopkeeper, a clerk or any other figure of any kind. If the sentence " +
  "seems to need someone else, show the EVIDENCE of them instead: an empty chair, a closed door, " +
  "a hand-less counter, an object they left behind. Never a human, never a generic mascot, never " +
  "a loaf, blob or animal, never a silhouette or vague shape in the background. NEVER show " +
  "disembodied human hands or arms reaching in from off screen. " +
  "This rule is absolute: the QA gate rejected 2 of 3 posts on 2026-08-21 for a second off-model " +
  "candle appearing beside him, so an added figure fails the post outright.";

// The most common failure was the body not being visible, but the CAUSE differs
// per layout, so a single global rule is wrong. Two distinct cases:
//   full   — the whole frame is his (LESSON item strip, VERSUS panel). Fill it.
//   upper  — large composited text sits OVER the lower part of the frame (the
//            reveal and CTA closers). Verified 2026-08-09: his wax body WAS
//            generated and then buried under the enlarged CTA text, which the
//            grader correctly read as "floating flame head".
const FRAMING = {
  full:
    " FRAMING: show his COMPLETE body, flame head down to his feet, with clear margin above and " +
    "below him. NOTHING MAY STAND IN FRONT OF HIM. Counters, tables, desks, boxes and railings " +
    "must be BESIDE him or BEHIND him, never between him and the camera: place him clear of the " +
    "furniture, standing beside a counter rather than behind it, next to a table rather than " +
    "seated at it. His legs and feet must be visible against the floor with clear space around " +
    "them. Never crop, cut, occlude or hide his wax body, arms, hands, legs or feet behind any " +
    "object or at the frame edge. He must never read as a floating head or a head and torso " +
    "only. If the scene needs a counter or table, show it from an angle where his whole body " +
    "still reads.",
  upper:
    " FRAMING: his COMPLETE body, flame head down to his feet, must sit entirely within the TOP " +
    "HALF of the frame, standing well back so he reads small and whole. The BOTTOM HALF must be " +
    "empty floor, wall or table with nothing important in it, because large text is placed there " +
    "afterwards. Never let his wax body, arms or legs fall into the bottom half.",
  // COVER layouts (LESSON cover, CTA, reveal) carry the biggest type in the
  // brand: up to 196px Anton, and a three line headline anchored at bottom:158
  // reaches y=627 in a 1350 frame -- ABOVE the halfway line. So "upper" was a
  // promise the layout could not keep: the model correctly placed his body in
  // the top half and the headline was then drawn straight through his legs.
  // Every slide-1 rejection on 2026-08-21 was code A/B, "cut off by the text
  // panel", and this is why. The frame is not half text, it is nearly two
  // thirds, so the body has to live in the top 40%.
  coverTop:
    " FRAMING: his COMPLETE body, flame head down to his feet, must sit entirely " +
    "within the TOP 40% of the frame, standing well back so he reads small and whole " +
    "with clear floor beneath his feet. The BOTTOM 60% must be completely empty " +
    "floor, wall, sky or table with nothing important in it, because very large text " +
    "is placed there afterwards. Never let his wax body, arms, hands, legs or feet " +
    "fall below the top 40%.",
  // PARABLE puts its speech bubble at the TOP of the frame, so the character has
  // to live low or the bubble lands on his face. This was fixed once already for
  // parables specifically; it is now a named mode so any top-text layout can ask.
  lower:
    " FRAMING: his COMPLETE body, flame head down to his feet, must sit in the LOWER TWO THIRDS " +
    "of the frame. Leave the TOP THIRD as empty ceiling, sky or wall with nothing important in " +
    "it, because a speech bubble is placed there afterwards. Never crop his body at the bottom " +
    "edge.",
};

// ─── CRAFT: THE ANTI-SLOP BLOCK ──────────────────────────────────────────────
// Dre, 2026-08-21: "make sure when your creating images to prevent slop, use a
// prompt template that's consistent and will allow you to make anything while
// keeping character consistency and quality."
//
// ANATOMY_HARD says what Wick IS, FRAMING says where he SITS. Neither says
// anything about whether the picture is any GOOD, and that gap is where slop
// came from. "Polished cinematic 3D cartoon" in STYLE_STACK is an aspiration,
// not a constraint: it does nothing to stop the specific tells that make an
// image read as AI output rather than as art.
//
// Every item below is a tell that was actually observed in the queue or is a
// known failure mode of this model family. Naming them explicitly is what stops
// them, because a generator asked only for "premium quality" will still centre
// the subject, blow out the highlights and fill the background with mush.
const CRAFT_HARD =
  " CRAFT: ONE clear subject with a readable silhouette. Compose deliberately and OFF CENTRE, " +
  "using the frame's negative space. Keep the set SIMPLE: only include props the sentence " +
  "actually needs, each one solid, correctly built and clearly recognisable. Backgrounds stay " +
  "clean and softly out of focus, never busy. Surfaces read as real materials with weight and " +
  "believable contact shadows where things touch. " +
  "DO NOT PRODUCE: plastic or over-rendered surfaces, glassy skin-like sheen on anything that is " +
  "not his wax, blown out highlights, heavy bloom, HDR glow, oversaturated colour, cluttered or " +
  "random set dressing, duplicated or repeated objects, warped melted or half-formed geometry, " +
  "extra limbs, extra flames, a second Wick, floating disconnected parts, objects that intersect " +
  "wrongly, mushy indistinct background detail, lens flare, sparkles, confetti, floating particles, " +
  "gradient mush, or a dead-centre symmetrical composition.";

// Learned artwork rules, loaded once per batch by loadImageLessons(). Kept in a
// module-level cache because scenePrompt is synchronous and runs per frame.
let IMAGE_LESSONS = "";
export async function loadImageLessons() {
  try {
    const { activeLessons } = await import("./wick-lessons.js");
    const rules = await activeLessons("image", 18);
    IMAGE_LESSONS = rules.length
      ? " MISTAKES ALREADY MADE, DO NOT REPEAT: " + rules.join(" ")
      : "";
    if (rules.length) console.log(`[Wick] ${rules.length} learned image rule(s) applied`);
  } catch { IMAGE_LESSONS = ""; }   // learning must never block generation
  return IMAGE_LESSONS;
}

// ─── THE TEMPLATE ────────────────────────────────────────────────────────────
// One assembly point for every frame this brand ever generates. It used to be a
// single run-on sentence, which buried the CHARACTER definition in the middle
// where it competed with scene description for attention. It is now LABELLED
// SECTIONS in a fixed order, because that is what keeps 200 posts looking like
// one page while still letting `scene` describe literally anything.
//
// The order is deliberate:
//   MEDIUM     what kind of picture this is at all
//   CHARACTER  the element placeholder FIRST, then what he is made of. Identity
//              is the one thing that must never drift, so it leads.
//   ACTION     the free slot. Any scene, any staging, any setting goes here.
//   LIGHT      mood, then the locked palette
//   LOOK       the style stack that never varies
//   CRAFT      the quality bar and the anti-slop negatives
//   FRAMING    where his body sits, which differs per layout
//   LEARNED    mistakes already made on this account, appended last so the most
//              recent hard-won corrections sit closest to the output
//
// Only `scene` is free. Everything else is locked, which is the whole point:
// consistency comes from the fixed scaffold, range comes from the one slot.
export function scenePrompt({ scene, lighting, palette, extra = "", framing = "full", camera = "" }) {
  return [
    "MEDIUM: a polished cinematic 3D cartoon frame, vertical.",
    `CHARACTER: ${el()}${ANATOMY_HARD}`,
    `ACTION: ${scene}`,
    camera ? `CAMERA: ${camera}` : "",
    `LIGHT: ${lighting} ${palette}`,
    `LOOK: ${STYLE_STACK}`,
    extra,
    CRAFT_HARD,
    FRAMING[framing] ?? FRAMING.full,
    IMAGE_LESSONS,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

// `owned` = the panel where he is holding the controls. Both panels are present
// day; the split is warm self-lit versus cold screen-lit, never old versus new.
export function versusPanelPrompt(sceneText, { owned, expression, seed = 0 }) {
  const { camera } = variety(seed);
  const lighting = owned
    ? "His own golden flame head is the only light source, throwing warm amber light across the objects nearest him, everything else falling into deep soft shadow."
    : "Cold blue-white light from a phone or laptop screen washes across him, flattening his warm glow to a weak surviving amber core on his face, the rest of the room in cold dim shadow.";
  return scenePrompt({
    scene: `${sceneText} His expression is ${expression || (owned ? "focused and unhurried" : "hollow and vacant")}.`,
    lighting,
    palette: owned ? PALETTE_WARM : PALETTE_COLD,
    // The label sits across the lower third of every VERSUS panel, so "full"
    // framing (clear margin above AND below) put him centre and let the label
    // and the frame edge take his legs. Same fault as the closers.
    extra: `${camera} Absolutely no text anywhere in the image.`,
    framing: "upper",
  });
}

// Wick is a CANDLE. Asking for "a wardrobe over his wax body" made the model
// draw a human in clothes with a flame for a head: dress shirt, slacks, leather
// shoes, human shoulders and hips. That is a different character. Dre: "he's a
// candlestick, why does he have human bodies?"
//
// The anatomy is non-negotiable and gets restated on every costume frame, and
// wardrobe is demoted to small props sitting ON the candle rather than a body.
const CANDLE_ANATOMY =
  "CRITICAL ANATOMY: he is a CANDLE, not a person in costume. His body is a short " +
  "cream wax cylinder with soft drips down the sides, and nothing else. No human " +
  "torso, no shoulders, no chest, no hips, no waist, no neck. His arms are thin " +
  "black rubber-hose tubes ending in rounded black mitten hands, and his legs are " +
  "thin black rubber-hose tubes ending in simple rounded feet. The flame is his " +
  "whole head. Clothing NEVER replaces the wax cylinder and never gives him a human " +
  "silhouette: any garment is a small accessory resting on, wrapped around, or " +
  "hanging off the candle body, and the cream wax with its drips stays clearly " +
  "visible. Keep his proportions identical to the reference: flame head roughly the " +
  "same height as the wax body.";

export function costumePrompt(a, seed = 0) {
  const { camera } = variety(seed);
  return scenePrompt({
    scene: `${a.pose || "stands in a pose that fits the role"}, wearing ${a.wardrobe} as a small accessory on his wax candle body, in ${a.setting}. ${a.beat}. His expression is ${a.expression || "calm and composed"}. ${CANDLE_ANATOMY}`,
    lighting: "His golden flame head is the primary light source, throwing warm amber light across the scene, the edges falling into deep soft shadow.",
    palette: PALETTE_WARM,
    extra: `${camera} Generous empty space across the middle of the frame for a text label. Absolutely no text anywhere in the image.`,
  });
}

export function lessonScenePrompt(sceneText, expression, seed = 0, framing = "full") {
  const { camera } = variety(seed + 2);
  return scenePrompt({
    scene: `${sceneText}${expression ? ` His expression is ${expression}.` : ""}`,
    lighting: "His golden flame head is the only light source, throwing warm amber light across the nearest objects, long soft shadows behind.",
    palette: PALETTE_WARM,
    extra: `${camera} Absolutely no text anywhere in the image.`,
    framing,
  });
}

// ─── COMPOSITING ─────────────────────────────────────────────────────────────
// Everything normalizes to EXACTLY 1080x1350 (4:5). Non-negotiable: Instagram
// crops every carousel slide to match slide 1, so a mismatch silently destroys
// slides 2-10.

const W = 1080, H = 1350;
const WATERMARK = process.env.WICK_WATERMARK || "@WICKSWISDOM";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const FFMPEG = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "/usr/bin/ffmpeg";

// A 2k PNG base64-encoded into HTML is tens of megabytes, and two of them on one
// page reliably times out Puppeteer's screenshot. Downscale to the size the slot
// actually needs and convert to JPEG first — this is a ~50x size reduction.
// `yBias` picks where a tall source gets cropped: 0.5 is centred, lower keeps
// the top. Wick is composed upper-centre in almost every scene, so a centred
// crop into a short band decapitates him and loses the face, which is the one
// element that has to survive. Short bands crop high instead.
function fitJpeg(srcPath, targetW, targetH, yBias = 0.5) {
  const out = srcPath.replace(/\.(png|jpg|jpeg|webp)$/i, "") + `_fit_${targetW}x${targetH}_${yBias}.jpg`;
  const y = yBias === 0.5 ? "(ih-oh)/2" : `(ih-oh)*${yBias}`;
  try {
    execFileSync(FFMPEG, [
      "-y", "-i", srcPath,
      "-vf", `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}:(iw-ow)/2:${y}`,
      "-q:v", "3", out,
    ], { stdio: "pipe", timeout: 60_000 });
    return out;
  } catch {
    return srcPath; // ffmpeg missing or failed — fall back to the original
  }
}

const dataUri = (p) => {
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
};

// Fonts are EMBEDDED, not fetched. The Google Fonts <link> silently failed to
// resolve inside the headless shell, so every slide had been rendering in the
// system fallback: Anton's condensed display face never actually appeared, which
// is why the covers looked generic. A base64 @font-face cannot fail, cannot be
// slow, and cannot vary between this machine and Railway.
function fontFace(family, file, weight = "400") {
  try {
    const b64 = fs.readFileSync(path.join(process.cwd(), "assets", "fonts", file)).toString("base64");
    return `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;` +
           `src:url(data:font/truetype;charset=utf-8;base64,${b64}) format('truetype');}`;
  } catch {
    console.warn(`[Wick] font ${file} missing — falling back to system sans`);
    return "";
  }
}

const FONTS = `<style>
${fontFace("Anton", "Anton-Regular.ttf")}
${fontFace("DM Sans", "DMSans.ttf", "100 900")}
</style>`;

const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0d0b09;font-family:'DM Sans',sans-serif;}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;}
.wm{position:absolute;bottom:26px;left:0;right:0;text-align:center;z-index:40;
  font-family:'DM Sans',sans-serif;font-size:17px;letter-spacing:5px;font-weight:500;
  color:rgba(255,255,255,0.45);text-shadow:0 2px 8px rgba(0,0,0,0.7);}
.shade{position:absolute;left:0;right:0;bottom:0;height:46%;z-index:10;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.72) 55%,rgba(8,6,4,0.94) 100%);}
`;

async function renderHtml(html) {
  const browser = await launchBrowser({ protocolTimeout: 180_000 });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 30_000 }).catch(() => {});
    return Buffer.from(await page.screenshot({ type: "jpeg", quality: 90 }));
  } finally { await browser.close(); }
}

// VERSUS / ORDER — stack two panels, thin dark seam, labels added here.
// ─── PARABLE — speech-bubble story ──────────────────────────────────────────
// Dre's fifth format, supplied as reference: a three beat story told in speech
// bubbles. Something in the world asks a question, Wick gives the naive answer,
// then the turn lands. Beat four states the application over full-bleed art.
//
// Locked to the MIND_BEHAVIOUR lane. A parable earns its ending by being about
// how a person thinks and acts; the same shape applied to interchange fees or
// credit scoring would be a lecture wearing a story's clothes.
//
// The bubble is cream with near-black text, the inverse of every other slide, so
// spoken words never read as a caption.
// A parable frame has to LEAVE ROOM for the bubble. The composite cannot know
// where the character ended up, so the prompt reserves the corner: Wick and the
// speaker sit low and to one side, and the opposite upper third is deliberately
// empty. Without this the bubble lands across his face, which is exactly what
// happened on the first parable render.
export function parableScenePrompt(sceneText, expression, side = "left", seed = 0) {
  const { camera } = variety(seed);
  const clear = side === "left" ? "upper LEFT" : "upper RIGHT";
  const stand = side === "left" ? "lower right" : "lower left";
  return scenePrompt({
    scene: `${sceneText}${expression ? ` His expression is ${expression}.` : ""}`,
    lighting: "His golden flame head is the only light source, throwing warm amber light across the nearest objects, long soft shadows behind.",
    palette: PALETTE_WARM,
    // framing "lower" reinforces this rather than fighting it: the default "full"
    // mode asks for clear margin above AND below, which would pull him back into
    // the bubble's third.
    extra: `${camera} COMPOSITION IS CRITICAL: place the character and the speaking object in the ${stand} portion of the frame, both fully visible and unobstructed. Leave the entire ${clear} third of the frame as EMPTY UNCLUTTERED BACKGROUND with no character, no face and no important detail, because a speech bubble is placed there afterwards. Absolutely no text anywhere in the image.`,
    framing: "lower",
  });
}

export async function compositeParable({ scenePath, bubbleText, side = "left" }) {
  scenePath = fitJpeg(scenePath, W, H, 0.30);
  const len = String(bubbleText).length;
  const size = len <= 22 ? 62 : len <= 40 ? 54 : 46;
  const pos = side === "right" ? "right:64px;left:auto;" : "left:64px;right:auto;";
  const tail = side === "right"
    ? "right:88px;border-width:44px 30px 0 0;border-color:#f4ead4 transparent transparent transparent;"
    : "left:88px;border-width:44px 0 0 30px;border-color:#f4ead4 transparent transparent transparent;";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
.bwrap{position:absolute;top:96px;${pos}max-width:640px;z-index:25;}
.bubble{background:#f4ead4;border-radius:44px;padding:34px 44px;
  box-shadow:0 14px 44px rgba(0,0,0,0.55);}
.bubble p{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${size}px;line-height:1.14;
  color:#17130d;text-align:center;}
.tail{position:absolute;bottom:-42px;width:0;height:0;border-style:solid;${tail}}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div>
  <div class="bwrap"><div class="bubble"><p>${esc(bubbleText)}</p></div><div class="tail"></div></div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// ─── VERSUS variant B — SIDE BY SIDE ────────────────────────────────────────
// The second VERSUS layout Dre supplied: a vertical split rather than a stack.
// Left is the consequence, right is the cause that produced it ("Diabetes at 70"
// / "Started at 20"). Reading left to right lands the causation in one beat,
// which the stacked version cannot do.
export async function compositeSplitPanel({ leftPath, rightPath, leftLabel, rightLabel }) {
  const PW = Math.floor((W - 4) / 2);
  // Guard: a landscape source cropped to this half loses most of its width and
  // routinely crops the character out. Split panels must be generated at 9:16.
  for (const [side, f] of [["left", leftPath], ["right", rightPath]]) {
    try {
      const out = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { timeout: 15_000 }).toString().trim();
      const [w, h] = out.split(",").map(Number);
      if (w > h) console.warn(`[Wick] split ${side} panel is landscape (${w}x${h}); it will crop hard. Generate 9:16 for split layouts.`);
    } catch { /* probe is advisory only */ }
  }
  leftPath = fitJpeg(leftPath, PW, H);
  rightPath = fitJpeg(rightPath, PW, H);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.half{position:absolute;top:0;width:${PW}px;height:${H}px;overflow:hidden;}
.half.l{left:0;} .half.r{right:0;}
.half img{width:100%;height:100%;object-fit:cover;display:block;}
.vseam{position:absolute;top:0;left:${PW}px;width:4px;height:${H}px;background:#0d0b09;z-index:30;}
.hlabel{position:absolute;left:22px;right:22px;bottom:${Math.round(H * 0.30)}px;z-index:20;
  text-align:center;font-family:'DM Sans',sans-serif;font-weight:700;font-size:42px;
  line-height:1.16;color:#fff;
  text-shadow:0 2px 4px rgba(0,0,0,0.98),0 4px 18px rgba(0,0,0,0.92),0 0 46px rgba(0,0,0,0.85);}
.hshade{position:absolute;left:0;right:0;bottom:0;height:52%;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.28) 50%,rgba(8,6,4,0.50) 100%);}
</style></head><body>
<div class="slide">
  <div class="half l"><img src="${dataUri(leftPath)}"><div class="hshade"></div>
    <div class="hlabel">${esc(leftLabel)}</div></div>
  <div class="half r"><img src="${dataUri(rightPath)}"><div class="hshade"></div>
    <div class="hlabel">${esc(rightLabel)}</div></div>
  <div class="vseam"></div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// ─── ORDER — one full-bleed scene, one line ─────────────────────────────────
// ORDER is NOT a comparison. It is the same sentence said four times about four
// different things, one scene per slide, and the repetition is the whole effect.
// It was previously rendered with the two-panel comparison renderer, which is
// why Dre said the orders looked exactly like the versus.
export async function compositeSinglePanel({ scenePath, label }) {
  scenePath = fitJpeg(scenePath, W, H, 0.30);
  const size = 54;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
.oshade{position:absolute;left:0;right:0;bottom:0;height:60%;z-index:10;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.26) 46%,rgba(8,6,4,0.55) 100%);}
.oline{position:absolute;left:78px;right:78px;bottom:${Math.round(H * 0.30)}px;z-index:20;
  text-align:center;font-family:'DM Sans',sans-serif;font-weight:700;font-size:${size}px;
  line-height:1.2;color:#fff;
  text-shadow:0 2px 4px rgba(0,0,0,0.98),0 4px 18px rgba(0,0,0,0.92),0 0 46px rgba(0,0,0,0.85);}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div><div class="oshade"></div>
  <div class="oline">${esc(label)}</div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// ORDER's final slide: breaks the drumbeat and names the rule, then the share ask.
export async function compositeReveal({ scenePath, revealLine, closingLine, sendTo }) {
  // Same brief as compositeCta: the closing frame is where the share is asked
  // for, so it must be the most readable slide in the carousel, not the least.
  // Copy is capped at two short sentences now, so these scale well up.
  scenePath = fitJpeg(scenePath, W, H, 0.22);
  const len = String(revealLine ?? "").length + String(closingLine ?? "").length + String(sendTo ?? "").length;
  const v1 = len > 190 ? 58 : len > 130 ? 66 : 74;   // reveal line
  const v2 = len > 190 ? 42 : 50;                    // closing line: the payoff, never smaller than the send instruction
  const v3 = len > 190 ? 42 : 50;                    // send this to
  const v4 = len > 190 ? 34 : 40;                    // repost ask
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
.rshade{position:absolute;inset:0;z-index:10;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.34) 28%,rgba(8,6,4,0.92) 52%,rgba(8,6,4,0.98) 100%);}
.rbody{position:absolute;left:56px;right:56px;bottom:104px;z-index:20;text-align:center;}
.r1{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${v1}px;line-height:1.1;color:#fff;
  margin-bottom:26px;text-shadow:0 3px 14px rgba(0,0,0,0.9);}
.r2{font-family:'DM Sans',sans-serif;font-weight:400;font-size:${v2}px;line-height:1.26;
  color:#ece5dd;margin-bottom:30px;}
.r3{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${v3}px;line-height:1.2;color:#fff;}
.r3 b{color:#F5A524;}
.r4{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${v4}px;line-height:1.2;
  color:#F5A524;margin-top:18px;}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div><div class="rshade"></div>
  <div class="rbody">
    <div class="r1">${esc(revealLine)}</div>
    ${closingLine ? `<div class="r2">${esc(closingLine)}</div>` : ""}
    <div class="r3">Send this to <b>${esc(inlineSendTo(sendTo))}</b>.</div>
    <div class="r4">Repost it if it landed.</div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

export async function compositeTwoPanel({ topPath, bottomPath, topLabel, bottomLabel }) {
  const PH = Math.floor((H - 4) / 2);
  topPath = fitJpeg(topPath, W, PH);
  bottomPath = fitJpeg(bottomPath, W, PH);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.panel{position:absolute;left:0;width:${W}px;height:${(H - 4) / 2}px;overflow:hidden;}
.panel.top{top:0;} .panel.bot{bottom:0;}
.panel img{width:100%;height:100%;object-fit:cover;display:block;}
.seam{position:absolute;top:${(H - 4) / 2}px;left:0;width:${W}px;height:4px;background:#0d0b09;z-index:30;}
/* Label sits INSIDE the art, about a third up from the panel's base, and the
   scene stays visible behind it. The old scrim ran to 92% opacity across the
   bottom half, which read as a black bar with a caption pasted under the picture
   and threw away the art we had just paid for. Legibility now comes from a hard
   drop shadow plus a soft local pool behind the text, the way the reference does
   it. */
.plabel{position:absolute;left:70px;right:70px;bottom:${Math.round(((H - 4) / 2) * 0.22)}px;
  z-index:20;text-align:center;
  font-family:'DM Sans',sans-serif;font-weight:700;font-size:46px;line-height:1.2;color:#fff;
  text-shadow:0 2px 4px rgba(0,0,0,0.98),0 4px 18px rgba(0,0,0,0.92),0 0 46px rgba(0,0,0,0.85);}
.pshade{position:absolute;left:0;right:0;bottom:0;height:46%;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.30) 55%,rgba(8,6,4,0.52) 100%);}
</style></head><body>
<div class="slide">
  <div class="panel top"><img src="${dataUri(topPath)}"><div class="pshade"></div>
    <div class="plabel">${esc(topLabel)}</div></div>
  <div class="seam"></div>
  <div class="panel bot"><img src="${dataUri(bottomPath)}"><div class="pshade"></div>
    <div class="plabel">${esc(bottomLabel)}</div></div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// COSTUME — full-bleed scene, "Verb like a Noun" label across the middle.
export async function compositeCostume({ scenePath, label, boldWord }) {
  scenePath = fitJpeg(scenePath, W, H);
  const parts = String(label).split(new RegExp(`(${boldWord})`, "i"));
  const labelHtml = parts.map((p) =>
    p.toLowerCase() === String(boldWord).toLowerCase()
      ? `<b>${esc(p)}</b>` : esc(p)).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
.label{position:absolute;left:70px;right:70px;top:50%;transform:translateY(-50%);z-index:20;
  text-align:center;font-family:'DM Sans',sans-serif;font-weight:500;font-size:62px;
  line-height:1.15;color:#fff;text-shadow:0 4px 22px rgba(0,0,0,0.92),0 1px 4px rgba(0,0,0,0.9);}
.label b{font-weight:700;}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div>
  <div class="label">${labelHtml}</div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// LESSON cover — scene with a huge condensed headline low in the frame.
// The cover is a THUMBNAIL first and a slide second. On a profile grid it is
// rendered about 360px wide, so the old 62-104px headline shrank to roughly 25px
// and read as grey texture. Dre: "it has to pop, instantly legible."
//
// So the headline now dominates the frame rather than sitting in the bottom
// margin: 2x the type size, top-anchored, with the leading count knocked out in
// the brand amber so the eye lands on "5" before it reads a single word.
export async function compositeLessonCover({ scenePath, headline }) {
  scenePath = fitJpeg(scenePath, W, H, 0.10);
  const text = String(headline).toUpperCase();
  const len = text.length;
  // Sized so the longest realistic headline still clears ~45px at grid scale.
  const size = len <= 22 ? 196 : len <= 30 ? 172 : len <= 40 ? 150 : len <= 52 ? 126 : 108;

  // Lead with the count. "5 WAYS FREE TRIALS..." -> amber "5", white remainder.
  const m = text.match(/^(\d+)\s+(.*)$/s);
  const inner = m
    ? `<span class="n">${esc(m[1])}</span> ${esc(m[2])}`
    : esc(text);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
/* Heavier scrim than the shared one: big type needs a floor to sit on. */
.cover-shade{position:absolute;inset:0;z-index:10;
  background:linear-gradient(180deg,rgba(8,6,4,0.35) 0%,rgba(8,6,4,0.10) 22%,rgba(8,6,4,0.30) 42%,rgba(8,6,4,0.88) 62%,rgba(8,6,4,0.97) 100%);}
.head{position:absolute;left:56px;right:56px;bottom:158px;z-index:20;text-align:center;
  font-family:'Anton',sans-serif;font-size:${size}px;line-height:0.96;letter-spacing:0px;
  color:#fff;text-transform:uppercase;
  text-shadow:0 6px 34px rgba(0,0,0,0.95),0 2px 6px rgba(0,0,0,0.9);}
.head .n{color:#F5A524;}
.kicker{position:absolute;left:56px;right:56px;bottom:100px;z-index:20;text-align:center;
  font-family:'DM Sans',sans-serif;font-weight:700;font-size:28px;letter-spacing:4px;
  color:#F5A524;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.9);}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div>
  <div class="cover-shade"></div>
  <div class="head">${inner}</div>
  <div class="kicker">Swipe</div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// LESSON interior — scene top, numbered headline, PROBLEM / SOLUTION on black.
// Body slide, matched to the reference account's layout (Dre supplied it as the
// target): art bleeding across the top, then EVERYTHING CENTRE ALIGNED under it.
// A bold sentence-case headline, a full line of air, then short paragraphs with
// generous space between them.
//
// The old version was left-aligned with "PROBLEM:" / "SOLUTION" chips in amber.
// The chips read as a worksheet rather than a story, and the ragged left edge is
// what Dre meant by "too much to the left". Centre alignment with real breathing
// room is doing the work here, not the labels.
export async function compositeLessonItem({ scenePath, number, title, problem, solution }) {
  scenePath = fitJpeg(scenePath, W, 700, 0.10);
  // Dre, 2026-08-09: "subtext needs to be a lot shorter, it won't keep their
  // attention span, plus needs to be bigger for the lessons."
  //
  // The copy engine now caps problem and solution at ONE sentence of 12 words,
  // which frees a huge amount of vertical space, so the type scales UP hard.
  // Old sizes (27-31px body, 42-48px head) were sized to fit 2-3 sentence
  // paragraphs and were unreadable at feed-grid scale.
  //
  // The ladder still steps down if the model overruns its word cap, because a
  // slide that overflows past the watermark is worse than one set slightly
  // smaller. But the TOP of the ladder is now the normal case, not the rare one.
  const chars = String(problem).length + String(solution).length;
  const body = chars > 220 ? 36 : chars > 160 ? 42 : 48;
  const head = String(title).length > 34 ? 54 : 62;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.slide{display:flex;flex-direction:column;background:#0a0806;}
.top{position:relative;width:${W}px;height:700px;flex-shrink:0;overflow:hidden;}
.top img{width:100%;height:100%;object-fit:cover;display:block;}
.topfade{position:absolute;left:0;right:0;bottom:0;height:34%;
  background:linear-gradient(180deg,transparent,#0a0806);}
.body{flex:1;padding:0 66px 96px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;}
.h{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${head}px;line-height:1.12;
  color:#fff;margin-bottom:34px;}
.h .n{color:#F5A524;}
/* Tighter leading than before: at 48px a 1.46 line-height opens gaps that read
   as separate thoughts. The two blocks are separated by margin, not by air
   inside them. The solution line is brightened so the pair reads as
   problem then answer at a glance rather than one undifferentiated wall. */
.txt{font-family:'DM Sans',sans-serif;font-weight:400;font-size:${body}px;line-height:1.3;
  color:#d8cfc4;margin-bottom:30px;max-width:940px;}
.txt.sol{color:#fff;font-weight:500;margin-bottom:0;}
</style></head><body>
<div class="slide">
  <div class="top"><img src="${dataUri(scenePath)}"><div class="topfade"></div></div>
  <div class="body">
    <div class="h"><span class="n">${esc(number)}.</span> ${esc(title)}</div>
    <div class="txt">${esc(problem)}</div>
    <div class="txt sol">${esc(solution)}</div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// CTA / recap slide — scene, closing line, keyword in amber.
// The CTA goal is a SHARE, not lead capture. This used to render "Comment
// LEDGER and I'll send you <resource>" for resources that were never written
// and had no delivery path, so every post made a promise the account could not
// keep. `sendTo` names who to forward it to; keyword/resource are still accepted
// so rows queued under the old shape still render.
// send_to is authored as a standalone phrase ("The friend who...") but renders
// inside "Send this to ___.", where a leading capital reads as a typo. Lowercase
// only the safe leading articles/determiners so a proper noun keeps its capital.
const inlineSendTo = (t) => String(t ?? "")
  .replace(/^(The|A|An|Your|My|Anyone|Someone|Every|Whoever|That|Those|Any)\b/,
           (m) => m.toLowerCase())
  .replace(/\.\s*$/, "");

export async function compositeCta({ scenePath, closingLine, sendTo, keyword, resource }) {
  // Dre, 2026-08-09: "make the cta slide words wayy bigger to see."
  // The old sizes (42/38/32px) were set when closing lines ran long. Copy is now
  // capped at two short sentences, so the type scales up hard AND the image
  // gives back 70px of height to hold it. A ladder still steps down when a
  // send_to runs long, because overflowing past the watermark is worse than
  // slightly smaller type.
  scenePath = fitJpeg(scenePath, W, 720, 0.25);
  const len = String(closingLine ?? "").length + String(sendTo ?? "").length;
  const s1 = len > 150 ? 52 : len > 100 ? 60 : 68;   // closing line
  const s2 = len > 150 ? 44 : len > 100 ? 50 : 56;   // send this to
  const s3 = len > 150 ? 36 : 44;                    // repost ask
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.slide{display:flex;flex-direction:column;background:#0a0806;}
.top{position:relative;width:${W}px;height:720px;flex-shrink:0;overflow:hidden;}
.top img{width:100%;height:100%;object-fit:cover;display:block;}
.topfade{position:absolute;left:0;right:0;bottom:0;height:36%;
  background:linear-gradient(180deg,transparent,#0a0806);}
.body{flex:1;padding:10px 54px 0;display:flex;flex-direction:column;justify-content:center;text-align:center;}
.l1{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${s1}px;line-height:1.14;color:#fff;margin-bottom:24px;}
.l2{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${s2}px;line-height:1.2;color:#fff;}
.l3{font-family:'DM Sans',sans-serif;font-weight:700;font-size:${s3}px;line-height:1.2;
  color:#F5A524;margin-top:20px;}
.kw{color:#F5A524;}
</style></head><body>
<div class="slide">
  <div class="top"><img src="${dataUri(scenePath)}"><div class="topfade"></div></div>
  <div class="body">
    <div class="l1">${esc(closingLine)}</div>
    <div class="l2">${sendTo
      ? `Send this to <span class="kw">${esc(inlineSendTo(sendTo))}</span>.`
      : `Comment <span class="kw">${esc(keyword)}</span> and I'll send you ${esc(resource)}.`}</div>
    <div class="l3">Repost it if it landed.</div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

export function tmpDir(batchId, postId) {
  const d = path.join(os.tmpdir(), "wick", batchId, String(postId));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
