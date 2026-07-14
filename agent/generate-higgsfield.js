import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const HF_BIN = process.env.HF_BIN || "higgsfield";

function buildVideoPrompt(videoScript, postText) {
  const hook = videoScript[0]?.heading ?? postText ?? "Business automation insight";
  const points = videoScript
    .slice(1, 4)
    .map((s) => s.heading ?? s.body ?? (s.points ?? [])[0] ?? "")
    .filter(Boolean)
    .join(". ");
  // Paper-cut explainer style (Dre, 2026-07-13): handcrafted stop-motion collage
  return `Paper cutout stop-motion explainer video, vertical 9:16. Layered construction-paper collage world in deep navy, cream, and orange with cyan accents: torn paper edges, visible paper tabs and shadows, handcrafted diorama depth, subtle stop-motion jitter. Scene illustrates: ${hook}. ${points}. Craft aesthetic like a paper theater, warm soft lighting, no text, no logos.`;
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

// Fast check: is the CLI installed on this host? (Railway doesn't ship it —
// nixpacks.toml would need the binary. Local needs `higgsfield auth login`.)
export function isHiggsfieldCliAvailable() {
  try {
    execFileSync(HF_BIN, ["version"], { timeout: 10_000, stdio: "pipe" });
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

// Returns local file path (MP4)
export async function generateHiggsfieldVideo(postText, videoScript, {
  model = null,
  duration = 8,
} = {}) {
  const videoModel = model ?? process.env.HIGGSFIELD_VIDEO_MODEL ?? "seedance_2_0";
  const prompt = buildVideoPrompt(videoScript, postText);
  const outputDir = path.resolve("generated_imgs");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `video-${Date.now()}.mp4`);

  console.log(`[Higgsfield] Generating video — model: ${videoModel}`);
  const urls = runHF(
    ["generate", "create", videoModel, "--prompt", prompt, "--aspect_ratio", "9:16", "--duration", String(duration), "--wait", "--json"],
    900_000
  );

  await downloadToFile(urls[0], outputPath);
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Higgsfield] Video ready: ${outputPath} (${sizeMB} MB)`);
  return outputPath;
}

// Returns public URL string
export async function generateHiggsfieldImage(prompt, {
  model = null,
  aspectRatio = "1:1",
} = {}) {
  const imageModel = model ?? process.env.HIGGSFIELD_IMAGE_MODEL ?? "gpt_image_2";
  console.log(`[Higgsfield] Generating image — model: ${imageModel}`);
  const urls = runHF(
    ["generate", "create", imageModel, "--prompt", prompt, "--aspect_ratio", aspectRatio, "--wait", "--json"],
    300_000
  );
  return urls[0];
}
