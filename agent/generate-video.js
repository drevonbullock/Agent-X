import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import Anthropic from "@anthropic-ai/sdk";
import { generateAllVoiceovers } from "./elevenlabs.js";
import { generateGeminiImage } from "../images/gemini.js";
import { generateRunwayClip } from "./runway.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PUBLIC_DIR = path.resolve("remotion-videos/public");

const STYLE_TO_COMPOSITION = {
  hook_reveal: "HookReveal",
  hook_reveal_vertical: "HookRevealVertical",
  explainer_vertical: "ExplainerVertical",
  stat_stack: "StatStack",
  problem_solution: "ProblemSolution",
  list_countdown: "ListCountdown",
  review_card: "ReviewCard",
  carousel_slide_vertical: "CarouselSlideVertical",
};

const APPROVED_STYLES = ["list_countdown", "hook_reveal_vertical", "explainer_vertical", "carousel_slide_vertical"];

const MIN_SECONDS = 25;
const FPS = 30;

// Find when a trigger phrase is spoken using word timestamps from ElevenLabs.
function findPhraseTime(wordTimestamps, triggerPhrase) {
  const targets = triggerPhrase.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  for (let i = 0; i <= wordTimestamps.length - targets.length; i++) {
    if (targets.every((t, j) => wordTimestamps[i + j]?.word.startsWith(t))) {
      return wordTimestamps[i].startTime;
    }
  }
  // Fallback: 40% through the word list
  const midIdx = Math.floor(wordTimestamps.length * 0.4);
  return wordTimestamps[midIdx]?.startTime ?? 2.0;
}

// Ask Claude to pick one visual moment per screen, generate the image with Gemini,
// and return a Visual object { at, imageFile, side }.
async function generateVisualForScreen(screen, wordTimestamps, screenIdx) {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are a visual director for a social media video. Given this screen content, pick ONE visual that would enhance the voiceover.

Heading: ${screen.heading}
Body: ${screen.body || "(none)"}

Return ONLY valid JSON, no explanation:
{
  "triggerPhrase": "exact short phrase from the text (2-4 words) where the visual should appear",
  "imagePrompt": "cinematic photorealistic scene: [describe the scene in detail]. Dark moody background, dramatic lighting, no text, no words, ultra-sharp. 16:9 landscape.",
  "side": "left or right"
}`,
      }],
    });

    const raw = msg.content[0].text.trim();
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());

    // Find timestamp
    const at = Math.max(0.5, findPhraseTime(wordTimestamps, json.triggerPhrase) - 0.3);

    // Generate still image
    console.log(`[Agent X] Visual for screen ${screen.screen}: "${json.triggerPhrase}" at ${at.toFixed(1)}s`);
    const imgBuffer = await generateGeminiImage(json.imagePrompt);
    const imageFile = `visual_${screen.screen}_${screenIdx}.jpg`;
    fs.writeFileSync(path.join(PUBLIC_DIR, imageFile), imgBuffer);
    console.log(`[Agent X] Visual image saved: ${imageFile}`);

    // Attempt Runway animated clip — falls back to static image if key missing or fails
    let clipFile;
    if (process.env.RUNWAY_API_KEY) {
      try {
        const clipName = `clip_${screen.screen}_${screenIdx}.mp4`;
        clipFile = await generateRunwayClip(imgBuffer, json.imagePrompt, clipName, PUBLIC_DIR);
      } catch (runwayErr) {
        console.warn(`[Agent X] Runway skipped for screen ${screen.screen}: ${runwayErr.message}`);
      }
    }

    return { at, imageFile, clipFile, side: json.side === "left" ? "left" : "right" };
  } catch (err) {
    console.warn(`[Agent X] Visual generation skipped for screen ${screen.screen}: ${err.message}`);
    return null;
  }
}

async function generateCTAScreen(videoScript) {
  try {
    const topic = videoScript[0].heading;
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Social media video CTA screen for a video about: "${topic}"
Return ONLY valid JSON:
{"keyword":"ONE_WORD_ALL_CAPS","resource":"short free resource description (e.g. AI systems playbook, 5-day prompt guide)"}`,
      }],
    });
    const raw = msg.content[0].text.trim();
    const { keyword, resource } = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    const lastScreen = videoScript[videoScript.length - 1].screen;
    console.log(`[Agent X] CTA: Comment "${keyword}" → free ${resource}`);
    return {
      screen: lastScreen + 1,
      heading: `Comment "${keyword}"`,
      body: `and I'll send you my free ${resource}.`,
    };
  } catch (err) {
    console.warn(`[Agent X] CTA generation failed: ${err.message}`);
    return null;
  }
}

export async function generateVideo(videoScript, videoStyle = "list_countdown") {
  const safeStyle = APPROVED_STYLES.includes(videoStyle) ? videoStyle : "list_countdown";
  if (!APPROVED_STYLES.includes(videoStyle)) {
    console.warn(`[Agent X] Video style "${videoStyle}" is not approved — using list_countdown`);
  }
  const compositionId = STYLE_TO_COMPOSITION[safeStyle];
  const isVertical = safeStyle === "hook_reveal_vertical" || safeStyle === "explainer_vertical" || safeStyle === "carousel_slide_vertical";

  // 1. Append auto-generated CTA screen
  const ctaScreen = await generateCTAScreen(videoScript);
  const scriptWithCTA = ctaScreen ? [...videoScript, ctaScreen] : videoScript;

  // 2. Generate one voiceover MP3 per screen (including CTA)
  const voiceResults = await generateAllVoiceovers(scriptWithCTA, safeStyle);

  // 3. Generate contextual image visuals for content screens (not hook, not CTA)
  const ctaScreenNum = ctaScreen?.screen ?? -1;
  const augmentedScript = await Promise.all(
    scriptWithCTA.map(async (screen, idx) => {
      if (screen.screen === 1) return screen;            // hook: no visual
      if (screen.screen === ctaScreenNum) return screen; // CTA: no visual
      if (screen.visuals) return screen;                 // already has manual visuals
      const voiceResult = voiceResults.find((r) => r.screen === screen.screen);
      const wordTimestamps = voiceResult?.wordTimestamps ?? [];
      if (wordTimestamps.length === 0) return screen;
      const visual = await generateVisualForScreen(screen, wordTimestamps, idx);
      if (!visual) return screen;
      return { ...screen, visuals: [visual] };
    })
  );

  // 3. Build parallel arrays for Remotion props
  const screenDurations = augmentedScript.map((screen) => {
    const match = voiceResults.find((r) => r.screen === screen.screen);
    return match ? match.durationSeconds : (screen.screen === 1 ? 2.5 : 6.0);
  });

  const screenHasAudio = augmentedScript.map((screen) => {
    const match = voiceResults.find((r) => r.screen === screen.screen);
    return match ? match.hasAudio : false;
  });

  // 4. Sum durations — pad last screen if under minimum, never cap the maximum
  let totalDurationSeconds = screenDurations.reduce((a, b) => a + b, 0);

  if (totalDurationSeconds < MIN_SECONDS) {
    const diff = MIN_SECONDS - totalDurationSeconds;
    screenDurations[screenDurations.length - 1] += diff;
    totalDurationSeconds = MIN_SECONDS;
  }

  const totalFrames = Math.round(totalDurationSeconds * FPS);
  console.log(`[Agent X] Total video duration: ${totalDurationSeconds.toFixed(1)}s`);
  console.log(`[Agent X] Rendering at ${FPS}fps: ${totalFrames} frames`);

  // 5. Render with Remotion — pass augmented script (with visuals) in props
  const remotionRoot = path.resolve("remotion-videos/src/index.ts");
  const outputPath = path.resolve(isVertical ? "generated_imgs/output-vertical.mp4" : "generated_imgs/output.mp4");

  const propsFile = path.join(os.tmpdir(), `agentx-props-${Date.now()}.json`);
  const renderProps = { videoScript: augmentedScript, screenDurations, screenHasAudio, totalDurationSeconds };
  if (isVertical) renderProps.bgImage = "dre_vertical_v3.png";
  fs.writeFileSync(propsFile, JSON.stringify(renderProps));

  // Vertical: render 4K master (2160×3840, CRF=15), then compress to web copy for upload
  // Square: standard 1080×1080 with higher-quality encoding
  const qualityFlags = isVertical
    ? ["--scale=2", "--crf=15"]
    : ["--crf=18"];

  const masterPath = isVertical
    ? path.resolve("generated_imgs/output-vertical-4k.mp4")
    : outputPath;

  const masterCmd = [
    "npx remotion render",
    `"${remotionRoot}"`,
    compositionId,
    `--output="${masterPath}"`,
    `--props="${propsFile}"`,
    "--log=verbose",
    "--overwrite",
    ...qualityFlags,
  ].join(" ");

  try {
    execSync(masterCmd, {
      cwd: path.resolve("remotion-videos"),
      stdio: "inherit",
      timeout: 40 * 60 * 1000,
    });
  } catch (err) {
    throw new Error(`Remotion render failed for ${compositionId}: ${err.message}`);
  } finally {
    try { fs.unlinkSync(propsFile); } catch { /* ignore */ }
  }

  // For vertical: remux 4K master with faststart for streaming upload (stream copy, no re-encode)
  if (isVertical) {
    console.log(`[Agent X] Remuxing 4K master for upload (faststart)...`);
    const ffmpegCmd = [
      "/opt/homebrew/bin/ffmpeg -y",
      `-i "${masterPath}"`,
      "-c copy",
      "-movflags +faststart",
      `"${outputPath}"`,
    ].join(" ");
    execSync(ffmpegCmd, { stdio: "inherit", timeout: 3 * 60 * 1000 });
    const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
    console.log(`[Agent X] Upload-ready 4K: ${outputPath} (${sizeMB} MB)`);
  }

  const masterSizeMB = (fs.statSync(masterPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Agent X] 4K master: ${masterPath} (${masterSizeMB} MB)`);
  return outputPath;
}
