import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { generateAllVoiceovers } from "./elevenlabs.js";

const STYLE_TO_COMPOSITION = {
  hook_reveal: "HookReveal",
  stat_stack: "StatStack",
  problem_solution: "ProblemSolution",
  list_countdown: "ListCountdown",
  review_card: "ReviewCard",
};

const MIN_SECONDS = 25;
const FPS = 30;

export async function generateVideo(videoScript, videoStyle = "list_countdown") {
  // Only list_countdown is approved — override anything else
  const safeStyle = "list_countdown";
  if (videoStyle !== safeStyle) {
    console.warn(`[Agent X] Video style "${videoStyle}" is not approved — using list_countdown`);
  }
  const compositionId = STYLE_TO_COMPOSITION[safeStyle];

  // 1. Generate one voiceover MP3 per screen
  const voiceResults = await generateAllVoiceovers(videoScript, safeStyle);

  // 2. Build parallel arrays for Remotion props
  const screenDurations = videoScript.map((screen) => {
    const match = voiceResults.find((r) => r.screen === screen.screen);
    return match ? match.durationSeconds : (screen.screen === 1 ? 2.5 : 6.0);
  });

  const screenHasAudio = videoScript.map((screen) => {
    const match = voiceResults.find((r) => r.screen === screen.screen);
    return match ? match.hasAudio : false;
  });

  // 3. Sum durations — pad last screen if under minimum, never cap the maximum
  let totalDurationSeconds = screenDurations.reduce((a, b) => a + b, 0);

  if (totalDurationSeconds < MIN_SECONDS) {
    const diff = MIN_SECONDS - totalDurationSeconds;
    screenDurations[screenDurations.length - 1] += diff;
    totalDurationSeconds = MIN_SECONDS;
  }

  const totalFrames = Math.round(totalDurationSeconds * FPS);
  console.log(`[Agent X] Total video duration: ${totalDurationSeconds.toFixed(1)}s`);
  console.log(`[Agent X] Rendering at ${FPS}fps: ${totalFrames} frames`);

  // 4. Render with Remotion — pass all timing data as props
  const remotionRoot = path.resolve("remotion-videos/src/index.ts");
  const outputPath = path.resolve("generated_imgs/output.mp4");

  const propsFile = path.join(os.tmpdir(), `agentx-props-${Date.now()}.json`);
  fs.writeFileSync(
    propsFile,
    JSON.stringify({ videoScript, screenDurations, screenHasAudio, totalDurationSeconds })
  );

  const cmd = [
    "npx remotion render",
    `"${remotionRoot}"`,
    compositionId,
    `--output="${outputPath}"`,
    `--props="${propsFile}"`,
    "--log=verbose",
    "--overwrite",
  ].join(" ");

  try {
    execSync(cmd, {
      cwd: path.resolve("remotion-videos"),
      stdio: "inherit",
      timeout: 5 * 60 * 1000,
    });
  } catch (err) {
    throw new Error(`Remotion render failed for ${compositionId}: ${err.message}`);
  } finally {
    try { fs.unlinkSync(propsFile); } catch { /* ignore */ }
  }

  console.log(`[Agent X] Video ready: ${outputPath}`);
  return outputPath;
}
