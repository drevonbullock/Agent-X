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
  // `account status` is READ ONLY. This used to probe with `auth token`, which
  // ROTATES the refresh token -- so every batch entry point was rotating the
  // credential just to ask "are you there?", and two runs close together race
  // each other's rotation. OAuth refresh-token reuse detection treats a replayed
  // rotation as theft and can revoke the whole session, which is a plausible
  // path for how the login died in the first place. Never probe with a write.
  try {
    const out = execFileSync(HF_BIN, ["account", "status"], { timeout: 30_000, stdio: "pipe" }).toString();
    return /credits/i.test(out);
  } catch { return false; }
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
    // The Overseer's standing orders for the ARTIST ride the same appendix.
    try {
      const { ordersBlock } = await import("./wick-overseer.js");
      const o = await ordersBlock("artist", "THE OVERSEER'S ORDERS FOR EVERY IMAGE");
      if (o) IMAGE_LESSONS += " " + o.replace(/\n/g, " ");
    } catch { /* orders must never block generation */ }
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

// ─── EDITORIAL VERSUS + ORDER (2026-09-15) ──────────────────────────────────
// Same paper system as LESSON (see EDITORIAL LESSON SYSTEM below). One generated
// scene now serves the whole post: it is the art card on the first and last
// slides and a whole-body Wick card on the slides between, so Wick is on every
// slide (image QA code C) without paying for a scene per slide.
//
// VERSUS: the winning side is a white card with an amber check, the losing side
// an ink card with an X. The icons are drawn in CSS, not glyphs, so a missing
// symbol font can never print empty boxes. Stacked keeps the good side on top;
// split puts the consequence on the left and the cause on the right, as Dre's
// reference did. Old queued rows still pass two scene paths; only the first is
// used now.
const dollars = (t) => (String(t ?? "").match(/\$\s?[\d,]+(?:\.\d+)?/g) ?? []).map((a) => a.replace(/\s/g, ""));
const dollarValue = (a) => parseFloat(String(a).replace(/[$,]/g, "")) || 0;

async function versusSlide({ artPath, good, bad, split, topic, index, total }) {
  const first = index <= 1;
  const order = split ? [["lose", bad], ["win", good]] : [["win", good], ["lose", bad]];
  const longest = Math.max(String(good ?? "").length, String(bad ?? "").length);
  let header, headH;
  if (first) {
    headH = 520;
    header = `<div class="art card" style="height:${headH}px;"><img src="${dataUri(fitJpeg(artPath, 952, headH, 0.1))}"></div>`;
  } else {
    headH = 300;
    const [a, b] = order.map(([, t]) => dollars(t)[0]);
    const stat = a && b
      ? `<div class="vs" style="font-size:${heroFit(`${a}${b}vs`, 600, 190)}px;"><span class="mk">${esc(a)}</span> <span class="x">vs</span> ${esc(b)}</div>`
      : (a || b) ? `<div class="vs" style="font-size:${heroFit(a || b, 600, 230)}px;"><span class="mk">${esc(a || b)}</span></div>` : "";
    header = `<div class="hdr" style="${stat ? "" : "justify-content:center;"}">${stat}` +
      `<div class="wick card"><img src="${dataUri(wickCard(artPath, 300, 300))}"></div></div>`;
  }
  const size = first
    ? (split ? (longest > 30 ? 44 : 50) : (longest > 40 ? 50 : 56))
    : (split ? (longest > 30 ? 56 : 62) : (longest > 40 ? 56 : 64));
  const rows = order.map(([cls, t]) => `<div class="row ${cls}"><span class="chip"></span><div>${markNumbers(esc(t))}</div></div>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}
.art{position:absolute;left:64px;right:64px;top:140px;}
.hdr{position:absolute;left:72px;right:72px;top:140px;height:${headH}px;display:flex;align-items:center;justify-content:space-between;gap:32px;}
.vs{font-family:'Anton',sans-serif;line-height:1;color:${INK};white-space:nowrap;}
.vs .x{color:${INK_SOFT};font-size:0.5em;vertical-align:middle;}
.wick{width:300px;height:300px;flex-shrink:0;}
.rows{position:absolute;left:64px;right:64px;top:${140 + headH + 32}px;bottom:104px;display:flex;flex-direction:${split ? "row" : "column"};gap:24px;}
.row{flex:1;min-width:0;border-radius:28px;padding:26px 34px;display:flex;${split ? "flex-direction:column;justify-content:center;gap:22px;" : "align-items:center;gap:28px;"}
  font-family:'DM Sans',sans-serif;font-weight:800;font-size:${size}px;line-height:1.14;}
.row.win{background:#FFFFFF;color:${INK};border:4px solid ${AMBER};}
.row.lose{background:${INK};color:${PAPER};}
.lose .hl{background:none;color:${AMBER};padding:0;}
.chip{position:relative;width:64px;height:64px;border-radius:50%;flex-shrink:0;}
.win .chip{background:${AMBER};}
.win .chip::after{content:"";position:absolute;left:24px;top:11px;width:14px;height:30px;border:solid ${INK};border-width:0 7px 7px 0;transform:rotate(45deg);}
.lose .chip{background:rgba(247,243,234,0.16);}
.lose .chip::before,.lose .chip::after{content:"";position:absolute;left:15px;top:28px;width:34px;height:8px;border-radius:4px;background:${PAPER};}
.lose .chip::before{transform:rotate(45deg);} .lose .chip::after{transform:rotate(-45deg);}
</style></head><body>
<div class="slide">
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, total ? `${index}/${total}` : "")}
  ${header}
  <div class="rows">${rows}</div>
  <div class="wm">${esc(WATERMARK)}</div>
  <div class="swipe">SWIPE →</div>
</div></body></html>`;
  return renderHtml(html);
}

export async function compositeSplitPanel({ leftPath, rightPath, leftLabel, rightLabel, topic = "", index = 0, total = 0 }) {
  return versusSlide({ artPath: rightPath || leftPath, good: rightLabel, bad: leftLabel, split: true, topic, index, total });
}

export async function compositeTwoPanel({ topPath, bottomPath, topLabel, bottomLabel, topic = "", index = 0, total = 0 }) {
  return versusSlide({ artPath: topPath || bottomPath, good: topLabel, bad: bottomLabel, split: false, topic, index, total });
}

// ─── ORDER — the same sentence, a bigger number each slide ──────────────────
// ORDER is NOT a comparison: one sentence said four times with the number
// changing, and the repetition is the effect. Slide 1 is the thumbnail, so it
// carries the art card and the line as a headline. After that the line's biggest
// dollar figure takes the slide, so the swipe reads as the number climbing.
export async function compositeSinglePanel({ scenePath, label, topic = "", index = 0, total = 0 }) {
  const text = String(label ?? "");
  const hero = dollars(text).sort((a, b) => dollarValue(b) - dollarValue(a))[0];
  const bar = topBar(`<span class="pill">${esc(topic || "Money")}</span>`, total ? `${index}/${total}` : "");
  let css, inner;
  if (index <= 1) {
    const len = text.length;
    const size = len <= 30 ? 110 : len <= 45 ? 96 : len <= 60 ? 84 : 72;
    css = `
.art{position:absolute;left:64px;right:64px;top:140px;height:640px;}
.head{position:absolute;left:72px;right:72px;top:810px;bottom:110px;display:flex;align-items:center;
  font-family:'Anton',sans-serif;font-size:${size}px;line-height:1.04;color:${INK};text-transform:uppercase;}`;
    inner = `<div class="art card"><img src="${dataUri(fitJpeg(scenePath, 952, 640, 0.08))}"></div>
  <div class="head"><div>${markNumbers(esc(text))}</div></div>`;
  } else if (!hero) {
    const len = text.length;
    const size = len <= 30 ? 124 : len <= 45 ? 108 : len <= 60 ? 94 : 80;
    css = `
.block{position:absolute;left:72px;right:72px;top:150px;bottom:110px;display:flex;flex-direction:column;justify-content:center;gap:56px;}
.head{font-family:'Anton',sans-serif;font-size:${size}px;line-height:1.04;color:${INK};text-transform:uppercase;}
.wick{width:300px;height:300px;}`;
    inner = `<div class="block"><div class="wick card"><img src="${dataUri(wickCard(scenePath, 300, 300))}"></div><div class="head">${markNumbers(esc(text))}</div></div>`;
  } else {
    css = `
.block{position:absolute;left:72px;right:72px;top:150px;bottom:110px;display:flex;flex-direction:column;justify-content:center;gap:60px;}
.stat{font-family:'Anton',sans-serif;font-size:${heroFit(hero, 936, 300)}px;line-height:1;color:${INK};white-space:nowrap;}
.lineRow{display:flex;align-items:center;gap:36px;}
.line{flex:1;min-width:0;font-family:'DM Sans',sans-serif;font-weight:800;font-size:${text.length > 48 ? 56 : 64}px;line-height:1.12;color:${INK};}
.wick{width:240px;height:240px;flex-shrink:0;}`;
    inner = `<div class="block">
    <div class="stat"><span class="mk">${esc(hero)}</span></div>
    <div class="lineRow"><div class="line">${markNumbers(esc(text))}</div><div class="wick card"><img src="${dataUri(wickCard(scenePath, 240, 240))}"></div></div>
  </div>`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}${css}
</style></head><body>
<div class="slide">
  ${bar}
  ${inner}
  <div class="wm">${esc(WATERMARK)}</div>
  <div class="swipe">SWIPE →</div>
</div></body></html>`;
  return renderHtml(html);
}

// ORDER's final slide: breaks the drumbeat and names the rule, then the share ask.
// The closing frame is where the share is asked for, so it is the most readable
// slide in the post. Copy budget is 240 characters (wick-copy CLOSING_BUDGET).
export async function compositeReveal({ scenePath, revealLine, closingLine, sendTo, topic = "", index = 0, total = 0 }) {
  const len = String(revealLine ?? "").length + String(closingLine ?? "").length + String(sendTo ?? "").length;
  const r1 = len > 190 ? 64 : len > 130 ? 74 : 84;
  const r2 = len > 190 ? 38 : 44;
  const r3 = len > 190 ? 32 : 36;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}
.art{position:absolute;left:64px;right:64px;top:140px;height:520px;}
.close{position:absolute;left:72px;right:72px;top:690px;bottom:100px;display:flex;flex-direction:column;justify-content:center;gap:22px;}
.r1{font-family:'Anton',sans-serif;font-size:${r1}px;line-height:1.04;color:${INK};text-transform:uppercase;}
.r2{font-family:'DM Sans',sans-serif;font-weight:800;font-size:${r2}px;line-height:1.18;color:${INK};}
.r3{font-family:'DM Sans',sans-serif;font-weight:600;font-size:${r3}px;line-height:1.28;color:${INK};}
.r4{font-family:'DM Sans',sans-serif;font-weight:800;font-size:28px;letter-spacing:2px;color:#B26A00;text-transform:uppercase;}
</style></head><body>
<div class="slide">
  ${topBar(`<span class="pill amber">Save this</span>`, total ? `${index}/${total}` : "")}
  <div class="art card"><img src="${dataUri(fitJpeg(scenePath, 952, 520, 0.08))}"></div>
  <div class="close">
    <div class="r1">${markNumbers(esc(revealLine))}</div>
    ${closingLine ? `<div class="r2">${markNumbers(esc(closingLine))}</div>` : ""}
    <div class="r3">Send this to <span class="hl">${esc(inlineSendTo(sendTo))}</span>.</div>
    <div class="r4">Send it. Repost it.</div>
  </div>
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
// ─── EDITOR SETTINGS ─────────────────────────────────────────────────────────
// The dashboard's "Edit the Editor" panel writes these to agent_kv (key
// wick_style); the Editor loads them once per batch. Dre, 2026-08-28: hooks
// "slanted to the left instead of being in the middle" — alignment is his
// call, not a hardcode, so it lives here. Centered is the default he chose.
let STYLE = { coverAlign: "center" };
export async function loadStyleSettings() {
  try {
    const { default: supabase } = await import("../supabase/client.js");
    const { data } = await supabase.from("agent_kv").select("value").eq("key", "wick_style").maybeSingle();
    if (data?.value) STYLE = { ...STYLE, ...JSON.parse(data.value) };
    console.log(`[Wick] editor style: ${JSON.stringify(STYLE)}`);
  } catch { /* defaults stand */ }
  return STYLE;
}

// ─── EDITORIAL LESSON SYSTEM (2026-09-15) ────────────────────────────────────
// Dre: "change the looks of the carousels that's best for algorithm and culture."
// Research, September 2026: infographic-style finance posts are saved about 3x
// more than scene-led ones, bold clean typography is what is trending, slides
// 1 to 3 decide the swipe-through, and the last slide should be worth saving on
// its own. The old look put a dark generated scene behind every slide and buried
// the numbers in small grey text.
//
// Now: warm off-white paper, ink type, the key number as the biggest thing on the
// slide under an amber marker, a topic pill (viewers can pick topics on
// Instagram), a slide counter and a swipe cue. Wick stays on EVERY slide as a card
// cut from the post's cover art, because image QA fails a slide where Wick is
// absent (code C) and a crop that leaves a floating head (code A); the card keeps
// his whole body. One generated image now serves the whole post.
const PAPER = "#F7F3EA", INK = "#141C2B", INK_SOFT = "#5A6472", AMBER = "#F0A31C";

const PAPER_CSS = `
.slide{background:${PAPER};}
.wm{color:rgba(20,28,43,0.45);text-shadow:none;bottom:44px;left:72px;right:auto;text-align:left;}
.pill{display:inline-block;padding:10px 22px;border-radius:999px;background:${INK};color:${PAPER};
  font-family:'DM Sans',sans-serif;font-weight:800;font-size:24px;letter-spacing:4px;text-transform:uppercase;}
.pill.amber{background:${AMBER};color:${INK};}
.count{font-family:'DM Sans',sans-serif;font-weight:700;font-size:26px;letter-spacing:2px;color:${INK_SOFT};}
.swipe{position:absolute;right:72px;bottom:40px;font-family:'DM Sans',sans-serif;font-weight:800;
  font-size:26px;letter-spacing:3px;color:${INK};}
.hl{background:linear-gradient(180deg,transparent 56%,${AMBER} 56%);padding:0 6px;}
.mk{position:relative;display:inline-block;z-index:0;}
.mk::after{content:"";position:absolute;left:-10px;right:-10px;bottom:8%;height:30%;background:${AMBER};z-index:-1;}
.card{border-radius:32px;overflow:hidden;box-shadow:0 18px 40px rgba(20,28,43,0.18);background:#1a120b;}
.card img{width:100%;height:100%;object-fit:cover;display:block;}
`;

// Wick, whole body, from a generated scene. Scenes compose him upper-centre, so
// keep the middle 64% of the width and the top half of the height, then scale to
// the card. A tighter face crop would fail QA code A.
function wickCard(srcPath, w, h) {
  const out = srcPath.replace(/\.(png|jpg|jpeg|webp)$/i, "") + `_wick_${w}x${h}.jpg`;
  try {
    execFileSync(FFMPEG, ["-y", "-i", srcPath, "-vf",
      `crop=iw*0.64:ih*0.5:iw*0.18:ih*0.03,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
      "-q:v", "3", out], { stdio: "pipe", timeout: 60_000 });
    return out;
  } catch {
    return fitJpeg(srcPath, w, h, 0.12);
  }
}

// Every money figure and percentage gets the amber marker: the number is the hook.
const markNumbers = (escaped) =>
  escaped.replace(/(\$\s?[\d,]+(?:\.\d+)?\w*|\b\d[\d,.]*%)/g, '<span class="hl">$1</span>');

// Anton runs about 0.47em per character, so a hero number is sized from the width
// it has rather than guessed from a length bucket.
const heroFit = (text, avail, max) => Math.min(max, Math.floor(avail / (Math.max(3, String(text).length) * 0.47)));

const topBar = (left, right) =>
  `<div style="position:absolute;left:72px;right:72px;top:60px;display:flex;justify-content:space-between;align-items:center;z-index:20;">${left}<span class="count">${right}</span></div>`;

export async function compositeLessonCover({ scenePath, headline, topic = "", index = 1, total = 0 }) {
  const art = fitJpeg(scenePath, 952, 720, 0.08);
  const text = String(headline).toUpperCase().replace(/[.,!?\s]*HERE'?S\s+HOW[.,!?\s]*$/i, "").trim();
  const len = text.length;
  const size = len <= 26 ? 118 : len <= 36 ? 104 : len <= 50 ? 88 : 76;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}
.art{position:absolute;left:64px;right:64px;top:140px;height:720px;}
.head{position:absolute;left:72px;right:72px;top:900px;bottom:120px;display:flex;align-items:center;
  font-family:'Anton',sans-serif;font-size:${size}px;line-height:1.04;color:${INK};text-transform:uppercase;}
</style></head><body>
<div class="slide">
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, total ? `${index}/${total}` : "")}
  <div class="art card"><img src="${dataUri(art)}"></div>
  <div class="head"><div>${markNumbers(esc(text))}</div></div>
  <div class="wm">${esc(WATERMARK)}</div>
  <div class="swipe">SWIPE →</div>
</div></body></html>`;
  return renderHtml(html);
}

// LESSON interior: the number first, then the lesson, then the move.
export async function compositeLessonItem({ scenePath, number, title, problem, solution, how, topic = "", index = 0, total = 0 }) {
  const card = wickCard(scenePath, 260, 260);
  // The hero is the figure the item is about: a dollar amount the solution adds
  // (not one it repeats from the problem), the biggest if several. "$100 a month
  // becomes $121,997" heroes $121,997; "VOO charges $3 on that same $10,000"
  // heroes $3.
  const inProblem = new Set(dollars(problem));
  const largest = (list) => [...list].sort((a, b) => dollarValue(b) - dollarValue(a))[0];
  const find = (re) => String(solution ?? "").match(re) || String(problem ?? "").match(re);
  const m = find(/\d+(?:\.\d+)?%/) || find(/\b\d{2,}[\d,]*\b/);
  const hero = largest(dollars(solution).filter((a) => !inProblem.has(a))) || largest(dollars(solution))
    || largest(dollars(problem)) || (m ? m[0].replace(/\s/g, "") : String(number ?? "").padStart(2, "0"));
  const bodyChars = String(problem ?? "").length + String(solution ?? "").length + String(how ?? "").length;
  const body = bodyChars > 230 ? 40 : bodyChars > 170 ? 44 : 48;
  const tSize = String(title ?? "").length > 30 ? 56 : 64;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}
.hero{position:absolute;left:72px;right:72px;top:140px;height:290px;display:flex;align-items:center;justify-content:space-between;gap:32px;}
.stat{font-family:'Anton',sans-serif;font-size:${heroFit(hero, 620, 240)}px;line-height:1;color:${INK};white-space:nowrap;}
.wick{width:260px;height:260px;flex-shrink:0;}
.body{position:absolute;left:72px;right:72px;top:460px;bottom:110px;display:flex;flex-direction:column;justify-content:center;gap:30px;}
.t{font-family:'DM Sans',sans-serif;font-weight:800;font-size:${tSize}px;line-height:1.1;color:${INK};}
.t .n{color:#B26A00;}
.p{font-family:'DM Sans',sans-serif;font-weight:400;font-size:${body}px;line-height:1.3;color:${INK_SOFT};}
.s{font-family:'DM Sans',sans-serif;font-weight:600;font-size:${body}px;line-height:1.3;color:${INK};}
.how{background:${AMBER};border-radius:22px;padding:24px 30px;font-family:'DM Sans',sans-serif;font-weight:800;
  font-size:${body - 2}px;line-height:1.25;color:${INK};}
</style></head><body>
<div class="slide">
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, total ? `${index}/${total}` : "")}
  <div class="hero"><div class="stat"><span class="mk">${esc(hero)}</span></div><div class="wick card"><img src="${dataUri(card)}"></div></div>
  <div class="body">
    <div class="t"><span class="n">${esc(number)}.</span> ${esc(title)}</div>
    <div class="p">${markNumbers(esc(problem))}</div>
    <div class="s">${markNumbers(esc(solution))}</div>
    ${how ? `<div class="how">→ ${esc(how)}</div>` : ""}
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
  <div class="swipe">SWIPE →</div>
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

// Closing slide. With `steps` it is a save-worthy checklist (research: the last
// slide should be worth saving on its own); without, a closing card for formats
// that have no steps.
export async function compositeCta({ scenePath, closingLine, sendTo, keyword, resource, steps = null, topic = "", index = 0, total = 0 }) {
  const list = Array.isArray(steps) ? steps.filter(Boolean) : [];
  const send = sendTo
    ? `Send this to <span class="hl">${esc(inlineSendTo(sendTo))}</span>.`
    : `Comment <span class="hl">${esc(keyword)}</span> and I'll send you ${esc(resource)}.`;
  const counter = total ? `${index}/${total}` : "";
  let inner, css;
  if (list.length) {
    const card = wickCard(scenePath, 220, 220);
    const chars = list.join(" ").length;
    const stepSize = chars > 300 ? 34 : chars > 220 ? 38 : 42;
    css = `
.wrap{position:absolute;left:72px;right:72px;top:150px;bottom:100px;display:flex;flex-direction:column;justify-content:center;gap:90px;}
.steps{list-style:none;display:flex;flex-direction:column;gap:28px;}
.steps li{display:flex;gap:22px;align-items:flex-start;font-family:'DM Sans',sans-serif;font-weight:600;
  font-size:${stepSize}px;line-height:1.26;color:${INK};}
.box{width:42px;height:42px;border:4px solid ${INK};border-radius:10px;flex-shrink:0;margin-top:${Math.max(0, Math.round((stepSize * 1.26 - 42) / 2))}px;}
.closeRow{display:flex;align-items:center;gap:32px;}
.close{flex:1;min-width:0;}
.c1{font-family:'DM Sans',sans-serif;font-weight:800;font-size:50px;line-height:1.14;color:${INK};margin-bottom:18px;}
.c2{font-family:'DM Sans',sans-serif;font-weight:600;font-size:36px;line-height:1.28;color:${INK};}
.wick{width:220px;height:220px;flex-shrink:0;}`;
    inner = `
  ${topBar(`<span class="pill amber">Save this checklist</span>`, counter)}
  <div class="wrap">
    <ol class="steps">${list.map((st) => `<li><span class="box"></span><span>${markNumbers(esc(st))}</span></li>`).join("")}</ol>
    <div class="closeRow"><div class="close"><div class="c1">${esc(closingLine)}</div><div class="c2">${send}</div></div>
      <div class="wick card"><img src="${dataUri(card)}"></div></div>
  </div>`;
  } else {
    const art = fitJpeg(scenePath, 952, 640, 0.08);
    css = `
.art{position:absolute;left:64px;right:64px;top:140px;height:640px;}
.close{position:absolute;left:72px;right:72px;top:830px;bottom:130px;display:flex;flex-direction:column;justify-content:center;}
.c1{font-family:'DM Sans',sans-serif;font-weight:800;font-size:58px;line-height:1.12;color:${INK};margin-bottom:26px;}
.c2{font-family:'DM Sans',sans-serif;font-weight:600;font-size:40px;line-height:1.25;color:${INK};}
.c3{font-family:'DM Sans',sans-serif;font-weight:800;font-size:30px;letter-spacing:2px;color:#B26A00;margin-top:22px;text-transform:uppercase;}`;
    inner = `
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, counter)}
  <div class="art card"><img src="${dataUri(art)}"></div>
  <div class="close"><div class="c1">${esc(closingLine)}</div><div class="c2">${send}</div><div class="c3">Save it. Send it.</div></div>`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}${PAPER_CSS}${css}
</style></head><body>
<div class="slide">${inner}
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

export function tmpDir(batchId, postId) {
  const d = path.join(os.tmpdir(), "wick", batchId, String(postId));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// Shared with modules/wick-story.js (the story carousel renderer).
export { esc, fitJpeg, dataUri, FONTS, renderHtml };
