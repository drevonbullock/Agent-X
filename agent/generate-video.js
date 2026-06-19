import { generateHyperframesVideo } from "./generate-hyperframes-video.js";
import { processRawFootage } from "./process-raw-footage.js";
import { generateHeyGenVideo } from "./generate-heygen-avatar.js";
import { generateHiggsfieldVideo } from "./generate-higgsfield.js";
import fs from "fs";
import path from "path";

// ─── AUTO STYLE SELECTOR ──────────────────────────────────────────────────────
// Haiku picks the best style from the script content.
// Falls back to list_countdown on any error.
async function selectVideoStyle(videoScript) {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const topic   = videoScript[0]?.heading ?? "";
    const bodies  = videoScript.slice(1).map((s) => s.body ?? s.points?.join(" ") ?? "").join(" ");
    const hasNumbers = /\d+/.test(bodies) || /\b(percent|revenue|hours|days|weeks|minutes|million|billion|thousand|dollars)\b/i.test(bodies);
    if (hasNumbers) return "stat_stack";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [{
        role: "user",
        content: `Pick the best video style for this hook: "${topic}"

Options:
- list_countdown: numbered how-to steps, tips, frameworks
- hook_reveal: story-driven, emotional, narrative, insight
- stat_stack: number-heavy, data-driven, metrics
- problem_solution: before/after, contrast, transformation
- review_card: testimonial, quote, social proof

Return ONLY the style key, nothing else.`,
      }],
    });

    const style = msg.content[0].text.trim().toLowerCase().replace(/[^a-z_]/g, "");
    const valid = ["list_countdown", "hook_reveal", "stat_stack", "problem_solution", "review_card"];
    return valid.includes(style) ? style : "list_countdown";
  } catch {
    return "list_countdown";
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generateVideo(postText, videoScript, videoStyle) {
  // ── PATH A — Raw footage in raw_footage/ ─────────────────────────────────
  const rawFolder = path.join(process.cwd(), "raw_footage");
  const rawFiles  = fs.existsSync(rawFolder)
    ? fs.readdirSync(rawFolder).filter((f) => /\.(mp4|mov|avi|mkv)$/i.test(f))
    : [];

  if (rawFiles.length > 0) {
    console.log(`[Agent X] PATH A — Raw footage detected: ${rawFiles[0]}`);
    const inputPath = path.join(rawFolder, rawFiles[0]);
    return await processRawFootage(inputPath, videoScript);
  }

  // ── PATH B — Higgsfield AI video ─────────────────────────────────────────
  if (process.env.USE_HIGGSFIELD === "true") {
    console.log(`[Agent X] PATH B — Higgsfield video generation`);
    try {
      const result = await generateHiggsfieldVideo(postText, videoScript);
      if (result) return result;
      console.warn("[Agent X] Higgsfield returned null — falling back");
    } catch (err) {
      console.warn(`[Agent X] Higgsfield failed (${err.message}) — falling back to HeyGen/Hyperframes`);
    }
  }

  // ── PATH C — AI generated (HeyGen / Hyperframes) ─────────────────────────
  const useAvatar = !!process.env.HEYGEN_API_KEY && !!process.env.HEYGEN_AVATAR_ID;

  if (useAvatar) {
    console.log(`[Agent X] PATH C — HeyGen avatar video`);
    const spokenScript = videoScript
      .map((s) => `${s.heading}. ${s.body || (s.points ?? []).join(" ")}`)
      .join(" ");
    try {
      const result = await generateHeyGenVideo(spokenScript);
      if (result) return result;
      console.warn("[Agent X] HeyGen returned null — falling back to Hyperframes");
    } catch (err) {
      console.warn(`[Agent X] HeyGen failed (${err.message}) — falling back to Hyperframes`);
    }
  }

  // ── PATH C fallback — Hyperframes only ──────────────────────────────────
  console.log(`[Agent X] PATH C — Hyperframes motion graphics`);

  const resolvedStyle = videoStyle === "auto" || !videoStyle
    ? await selectVideoStyle(videoScript)
    : videoStyle;

  console.log(`[Agent X] Format: ${resolvedStyle}`);
  console.log(`[Agent X] Rendering with Hyperframes...`);
  return await generateHyperframesVideo(videoScript, resolvedStyle, null, postText);
}
