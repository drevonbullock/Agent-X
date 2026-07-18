import { execFileSync, execSync } from "child_process";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { generateAllVoiceovers } from "./elevenlabs.js";

const HF_BIN = process.env.HF_BIN || "higgsfield";
const FFMPEG = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "/usr/bin/ffmpeg";

// ─── SCENE-BASED PAPER-CUT EXPLAINER (v2, 2026-07-18) ────────────────────────
// Dre rejected text-cards-with-paper-skin. This pipeline generates an ACTUAL
// animated paper-cut explainer: one Higgsfield paper-craft scene per screen
// (paper characters/objects acting out that screen's idea), stitched with the
// ElevenLabs voiceover and a minimal paper-strip title overlay per scene.
// Needs the `higgsfield` CLI authenticated (`higgsfield auth login`).

const PAPER_STYLE =
  "Handcrafted paper cutout stop-motion animation, layered construction paper collage " +
  "in deep navy, cream, orange and cyan, torn paper edges, visible paper tabs, " +
  "paper shadows, diorama depth, subtle stop-motion jitter, warm soft light. " +
  "No text, no letters, no words, no logos anywhere in the scene.";

export function isHiggsfieldCliAvailable() {
  try {
    execFileSync(HF_BIN, ["auth", "token"], { timeout: 10_000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function runHF(args, timeoutMs) {
  const raw = execFileSync(HF_BIN, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }).toString().trim();
  const parsed = JSON.parse(raw);
  const jobs = Array.isArray(parsed) ? parsed : [parsed];
  const urls = jobs.flatMap((j) => j.output_urls ?? []);
  if (!urls.length) throw new Error("Higgsfield returned no output URLs");
  return urls;
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

// ─── 1. SCENE DIRECTION — Haiku turns each screen into a visual metaphor ─────

async function buildScenePrompts(videoScript) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const screens = videoScript.map((s, i) =>
    `${i + 1}. heading: "${s.heading}" body: "${s.body ?? (s.points ?? []).join(" ")}"`).join("\n");

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `You are directing a paper cutout stop-motion explainer video. For EACH screen below, invent ONE concrete visual scene where paper characters or paper objects act out the idea. Physical, visual metaphors only (paper figures, paper machines, paper money, paper doors, paper gears). Never describe text appearing.

Screens:
${screens}

Respond with valid JSON only — an array of ${videoScript.length} strings, each a 1-2 sentence scene description with a simple camera note (e.g. "slow push-in", "gentle pan").`,
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const scenes = JSON.parse(raw.slice(raw.indexOf("[")));
  if (!Array.isArray(scenes) || scenes.length < videoScript.length) throw new Error("Scene direction failed");
  return scenes;
}

// ─── 2. TITLE OVERLAYS — transparent PNG paper strip per scene ───────────────

async function renderTitleOverlay(browser, heading, idx, total, outPath) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1920px;background:transparent;overflow:hidden;font-family:'Space Grotesk',sans-serif;}
.wrap{position:absolute;left:64px;right:64px;bottom:340px;display:flex;flex-direction:column;align-items:flex-start;gap:18px;}
.counter{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;letter-spacing:3px;
  color:#f2ede3;background:rgba(13,24,48,0.92);border:3px solid #FF6B00;padding:8px 20px;
  transform:rotate(-2deg);border-radius:8% 14% 9% 15%/45% 35% 50% 40%;
  box-shadow:0 6px 0 rgba(0,0,0,0.3);}
.strip{font-size:56px;font-weight:800;color:#0d1830;line-height:1.2;background:#f2ede3;
  padding:20px 30px;transform:rotate(-0.8deg);max-width:950px;
  border-radius:2.5% 4% 3% 5%/9% 7% 10% 8%;
  box-shadow:0 8px 0 rgba(0,0,0,0.32),0 20px 40px rgba(0,0,0,0.45);}
.wm{position:absolute;left:64px;bottom:60px;font-size:26px;font-weight:700;color:#FF6B00;
  letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.8);}
</style></head><body>
<div class="wrap">
  ${total > 1 ? `<div class="counter">${String(idx).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>` : ""}
  <div class="strip">${String(heading ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>
</div>
<div class="wm">@DrevonBullock &bull; BCG</div>
</body></html>`;

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {});
  fs.writeFileSync(outPath, Buffer.from(await page.screenshot({ type: "png", omitBackground: true })));
  await page.close();
}

// ─── 3. ASSEMBLY — clip to VO length, overlay title, concat, mix audio ───────

function assembleSegment(clipPath, overlayPath, voPath, durSec, outPath) {
  // tpad clones the last frame if the generated clip is shorter than the VO
  execSync(
    `${FFMPEG} -y -i "${clipPath}" -i "${overlayPath}" -i "${voPath}" ` +
    `-filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=cover,crop=1080:1920,tpad=stop_mode=clone:stop_duration=${Math.ceil(durSec)},trim=duration=${durSec.toFixed(2)},setpts=PTS-STARTPTS[v0];[v0][1:v]overlay=0:0[v]" ` +
    `-map "[v]" -map 2:a -t ${durSec.toFixed(2)} -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -ar 44100 "${outPath}"`,
    { stdio: "pipe", timeout: 5 * 60 * 1000 }
  );
}

// ─── MAIN — returns local MP4 path ───────────────────────────────────────────

export async function generateHiggsfieldVideo(postText, videoScript, { model = null } = {}) {
  const videoModel = model ?? process.env.HIGGSFIELD_VIDEO_MODEL ?? "kling3_0_turbo";
  const ts = Date.now();
  const workDir = path.resolve(`video-projects/papercut-${ts}`);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync("generated_imgs", { recursive: true });
  const outputPath = path.resolve(`generated_imgs/video-${ts}.mp4`);

  // 1. Scene direction
  console.log(`[Higgsfield] Directing ${videoScript.length} paper-cut scenes...`);
  const scenes = await buildScenePrompts(videoScript);

  // 2. Voiceovers (reuse the standard pipeline — writes voice_N.mp3 into workDir)
  console.log(`[Higgsfield] Generating voiceovers...`);
  const voiceovers = await generateAllVoiceovers(videoScript, "list_countdown", workDir);
  const durations = voiceovers.map((v) => Math.max(3, v.durationSeconds + 0.6));

  // 3. Generate one paper-cut scene clip per screen (10s max, trimmed to VO)
  const clipPaths = [];
  for (let i = 0; i < videoScript.length; i++) {
    const prompt = `${scenes[i]} ${PAPER_STYLE}`;
    console.log(`[Higgsfield] Scene ${i + 1}/${videoScript.length}: ${String(scenes[i]).slice(0, 80)}...`);
    const urls = runHF(
      ["generate", "create", videoModel, "--prompt", prompt, "--aspect_ratio", "9:16",
       "--duration", "10", "--wait", "--json"],
      900_000
    );
    const clipPath = path.join(workDir, `scene-${i + 1}.mp4`);
    await downloadToFile(urls[0], clipPath);
    clipPaths.push(clipPath);
  }

  // 4. Title overlays
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const overlayPaths = [];
  try {
    for (let i = 0; i < videoScript.length; i++) {
      const overlayPath = path.join(workDir, `overlay-${i + 1}.png`);
      await renderTitleOverlay(browser, videoScript[i].heading, i, videoScript.length - 1, overlayPath);
      overlayPaths.push(overlayPath);
    }
  } finally {
    await browser.close();
  }

  // 5. Assemble segments + concat
  console.log(`[Higgsfield] Assembling...`);
  const segPaths = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const segPath = path.join(workDir, `seg-${i + 1}.mp4`);
    assembleSegment(clipPaths[i], overlayPaths[i], path.join(workDir, `voice_${i + 1}.mp3`), durations[i], segPath);
    segPaths.push(segPath);
  }
  const listPath = path.join(workDir, "concat.txt");
  fs.writeFileSync(listPath, segPaths.map((p) => `file '${p}'`).join("\n"));
  execSync(`${FFMPEG} -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
    { stdio: "pipe", timeout: 5 * 60 * 1000 });

  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Higgsfield] Paper-cut explainer ready: ${outputPath} (${sizeMB} MB)`);
  return outputPath;
}

// Returns public URL string (used by the cheatsheet background chain)
export async function generateHiggsfieldImage(prompt, { model = null, aspectRatio = "1:1" } = {}) {
  const imageModel = model ?? process.env.HIGGSFIELD_IMAGE_MODEL ?? "gpt_image_2";
  console.log(`[Higgsfield] Generating image — model: ${imageModel}`);
  const urls = runHF(
    ["generate", "create", imageModel, "--prompt", prompt, "--aspect_ratio", aspectRatio, "--wait", "--json"],
    300_000
  );
  return urls[0];
}
