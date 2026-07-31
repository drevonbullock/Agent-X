import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { launchBrowser } from "../images/browser.js";

// ─── WICK'S WISDOM — GENERATION + COMPOSITING ────────────────────────────────
// Higgsfield generates the ART only. Every word of label copy is added here at
// composite time, so copy can be fixed without re-rolling art (SKILL.md Step 5).

const HF_BIN = process.env.HF_BIN || "higgsfield";
const WICK_ELEMENT = process.env.WICK_ELEMENT_ID || "5e934732-6de4-438a-b3a6-024144603518";
const MODEL = process.env.WICK_IMAGE_MODEL || "gpt_image_2";
// Backup model. nano_banana_pro is 2 credits vs gpt_image_2's 7 and handles pure
// scenes well. Every Wick frame is a pure scene (all text is composited by us,
// never generated), so the fallback loses nothing but cost.
const FALLBACK_MODEL = process.env.WICK_FALLBACK_MODEL || "nano_banana_pro";

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

// ─── POSE + CAMERA VARIETY ───────────────────────────────────────────────────
// Without this every frame is the same front-on standing pose with one arm up,
// which reads as a sticker pack rather than a character living in scenes.
// A deterministic index keeps a single carousel varied while staying repeatable.

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

const POSES = [
  "He is mid stride, one leg forward, body leaning into the movement, arms swinging naturally.",
  "He is crouched low, weight on his heels, one mitten hand braced on the ground.",
  "He is seated, shoulders relaxed forward, elbows resting on his knees.",
  "He is turned three quarters away, glancing back over one shoulder.",
  "He is reaching forward with one arm extended, torso twisted with the effort.",
  "He is standing with arms folded across his wax body, weight on one leg.",
  "He is leaning against something in the scene, one shoulder taking his weight.",
  "He is kneeling on one knee, head bowed toward what he is doing.",
  "He is stretched upward on tiptoe, both arms raised toward something above him.",
  "He is slumped, shoulders collapsed, arms hanging loose at his sides.",
  "He is walking away from camera into the depth of the scene.",
  "He is bent forward at the waist, absorbed in something close in front of him.",
];

// Deterministic per-slide pick so a carousel varies but re-runs are stable.
function variety(seed = 0) {
  return {
    camera: CAMERAS[seed % CAMERAS.length],
    pose: POSES[(seed * 5 + 3) % POSES.length],
  };
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

function runModel(model, prompt, aspect) {
  // nano_banana_pro accepts 4:5 natively and takes no quality flag.
  const isNB = model.startsWith("nano_banana");
  const args = [
    "generate", "create", model,
    "--prompt", prompt,
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
export function generateScene(prompt, aspect = "3:4") {
  let raw, usedModel = MODEL;
  try {
    raw = runModel(MODEL, prompt, aspect);
  } catch (err) {
    console.warn(`[Wick] ${MODEL} failed (${String(err.message).slice(0, 80)}) — falling back to ${FALLBACK_MODEL}`);
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

export async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}

// ─── PROMPT BUILDERS ─────────────────────────────────────────────────────────
// Never re-describe Wick in prose. Always the element placeholder.

export function scenePrompt({ scene, lighting, palette, extra = "" }) {
  return `A polished cinematic 3D cartoon scene, vertical. ${el()} ${scene} ` +
    `${lighting} ${STYLE_STACK} ${palette} ${extra}`.replace(/\s+/g, " ").trim();
}

export function versusPanelPrompt(sceneText, { ancient, expression, seed = 0 }) {
  const { camera, pose } = variety(seed);
  const lighting = ancient
    ? "His own golden flame head is the only light source, throwing warm amber light across the objects nearest him, everything else falling into deep soft shadow."
    : "Cold blue-white light from a modern screen washes across him, flattening his warm glow to a weak surviving amber core on his face, the rest of the room in cold dim shadow.";
  return scenePrompt({
    scene: `${sceneText} ${pose} His expression is ${expression || (ancient ? "calm and absorbed" : "hollow and vacant")}.`,
    lighting,
    palette: ancient ? PALETTE_WARM : PALETTE_COLD,
    extra: `${camera} Character clearly visible, room for a text label across the lower third. Absolutely no text anywhere in the image.`,
  });
}

export function costumePrompt(a, seed = 0) {
  const { camera } = variety(seed);
  return scenePrompt({
    scene: `${a.pose || "stands in a pose that fits the role"}, ${a.wardrobe}, in ${a.setting}. ${a.beat}. His expression is ${a.expression || "calm and composed"}.`,
    lighting: "His golden flame head is the primary light source, throwing warm amber light across the scene, the edges falling into deep soft shadow.",
    palette: PALETTE_WARM,
    extra: `${camera} Generous empty space across the middle of the frame for a text label. Absolutely no text anywhere in the image.`,
  });
}

export function lessonScenePrompt(sceneText, expression, seed = 0) {
  const { camera, pose } = variety(seed + 2);
  return scenePrompt({
    scene: `${sceneText} ${pose}${expression ? ` His expression is ${expression}.` : ""}`,
    lighting: "His golden flame head is the only light source, throwing warm amber light across the nearest objects, long soft shadows behind.",
    palette: PALETTE_WARM,
    extra: `${camera} Composed so the character and objects sit in the UPPER portion of the frame with clear space below. Absolutely no text anywhere in the image.`,
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
function fitJpeg(srcPath, targetW, targetH) {
  const out = srcPath.replace(/\.(png|jpg|jpeg|webp)$/i, "") + `_fit_${targetW}x${targetH}.jpg`;
  try {
    execFileSync(FFMPEG, [
      "-y", "-i", srcPath,
      "-vf", `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`,
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

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">`;

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
.plabel{position:absolute;left:64px;right:64px;bottom:34px;z-index:20;text-align:center;
  font-family:'DM Sans',sans-serif;font-weight:700;font-size:44px;line-height:1.18;color:#fff;
  text-shadow:0 3px 16px rgba(0,0,0,0.9),0 1px 3px rgba(0,0,0,0.9);}
.pshade{position:absolute;left:0;right:0;bottom:0;height:52%;
  background:linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.78) 62%,rgba(8,6,4,0.92) 100%);}
</style></head><body>
<div class="slide">
  <div class="panel top"><img src="${dataUri(topPath)}"><div class="pshade"></div>
    <div class="plabel">${esc(topLabel)}</div></div>
  <div class="seam"></div>
  <div class="panel bot"><img src="${dataUri(bottomPath)}"><div class="pshade"></div>
    <div class="plabel" style="bottom:74px">${esc(bottomLabel)}</div></div>
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
export async function compositeLessonCover({ scenePath, headline }) {
  scenePath = fitJpeg(scenePath, W, H);
  const len = String(headline).length;
  const size = len <= 26 ? 104 : len <= 38 ? 88 : len <= 52 ? 74 : 62;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.bg{position:absolute;inset:0;} .bg img{width:100%;height:100%;object-fit:cover;display:block;}
.head{position:absolute;left:56px;right:56px;bottom:112px;z-index:20;text-align:center;
  font-family:'Anton',sans-serif;font-size:${size}px;line-height:1.02;letter-spacing:0.5px;
  color:#fff;text-transform:uppercase;text-shadow:0 4px 24px rgba(0,0,0,0.95),0 2px 5px rgba(0,0,0,0.95);}
</style></head><body>
<div class="slide">
  <div class="bg"><img src="${dataUri(scenePath)}"></div>
  <div class="shade"></div>
  <div class="head">${esc(headline)}</div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// LESSON interior — scene top, numbered headline, PROBLEM / SOLUTION on black.
export async function compositeLessonItem({ scenePath, number, title, problem, solution }) {
  scenePath = fitJpeg(scenePath, W, 560);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.slide{display:flex;flex-direction:column;background:#0a0806;}
.top{position:relative;width:${W}px;height:560px;flex-shrink:0;overflow:hidden;}
.top img{width:100%;height:100%;object-fit:cover;display:block;}
.topfade{position:absolute;left:0;right:0;bottom:0;height:40%;
  background:linear-gradient(180deg,transparent,#0a0806);}
.body{flex:1;padding:26px 58px 0;display:flex;flex-direction:column;}
.h{font-family:'DM Sans',sans-serif;font-weight:700;font-size:46px;line-height:1.14;color:#fff;margin-bottom:24px;}
.lbl{font-family:'DM Sans',sans-serif;font-weight:700;font-size:25px;letter-spacing:1.6px;
  color:#F5A524;margin-bottom:9px;}
.txt{font-family:'DM Sans',sans-serif;font-weight:400;font-size:29px;line-height:1.42;
  color:#ece5dd;margin-bottom:26px;}
</style></head><body>
<div class="slide">
  <div class="top"><img src="${dataUri(scenePath)}"><div class="topfade"></div></div>
  <div class="body">
    <div class="h">${esc(number)}. ${esc(title)}</div>
    <div class="lbl">PROBLEM:</div><div class="txt">${esc(problem)}</div>
    <div class="lbl">SOLUTION</div><div class="txt">${esc(solution)}</div>
  </div>
  <div class="wm">${esc(WATERMARK)}</div>
</div></body></html>`;
  return renderHtml(html);
}

// CTA / recap slide — scene, closing line, keyword in amber.
export async function compositeCta({ scenePath, closingLine, keyword, resource }) {
  scenePath = fitJpeg(scenePath, W, 790);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>
${BASE_CSS}
.slide{display:flex;flex-direction:column;background:#0a0806;}
.top{position:relative;width:${W}px;height:790px;flex-shrink:0;overflow:hidden;}
.top img{width:100%;height:100%;object-fit:cover;display:block;}
.topfade{position:absolute;left:0;right:0;bottom:0;height:34%;
  background:linear-gradient(180deg,transparent,#0a0806);}
.body{flex:1;padding:14px 62px 0;display:flex;flex-direction:column;justify-content:center;text-align:center;}
.l1{font-family:'DM Sans',sans-serif;font-weight:700;font-size:42px;line-height:1.24;color:#fff;margin-bottom:26px;}
.l2{font-family:'DM Sans',sans-serif;font-weight:700;font-size:38px;line-height:1.3;color:#fff;}
.kw{color:#F5A524;}
</style></head><body>
<div class="slide">
  <div class="top"><img src="${dataUri(scenePath)}"><div class="topfade"></div></div>
  <div class="body">
    <div class="l1">${esc(closingLine)}</div>
    <div class="l2">Comment <span class="kw">${esc(keyword)}</span> and I'll send you ${esc(resource)}.</div>
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
