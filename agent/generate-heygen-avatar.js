import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { generateHyperframesVideo } from "./generate-hyperframes-video.js";

const HEYGEN_API = "https://api.heygen.com";
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000;

const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generateHeyGenVideo(script) {
  const apiKey   = process.env.HEYGEN_API_KEY;
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId  = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) {
    console.warn("[HeyGen] HEYGEN_API_KEY not set — skipping avatar video");
    return null;
  }
  if (!avatarId) {
    console.warn("[HeyGen] HEYGEN_AVATAR_ID not set — skipping avatar video");
    return null;
  }

  console.log(`[HeyGen] Generating avatar video (${script.length} chars)...`);

  // 1 — Request video generation
  const generateRes = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key":    apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type:         "avatar",
          avatar_id:    avatarId,
          avatar_style: "normal",
        },
        voice: {
          type:                  "elevenlabs",
          elevenlabs_voice_id:   voiceId ?? undefined,
          input_text:            script,
        },
        background: {
          type:  "color",
          value: "#0A0A0A",
        },
      }],
      dimension:    { width: 1080, height: 1080 },
      aspect_ratio: "1:1",
    }),
  });

  if (!generateRes.ok) {
    const body = await generateRes.text();
    throw new Error(`HeyGen generate failed (${generateRes.status}): ${body}`);
  }

  const { data } = await generateRes.json();
  const videoId  = data?.video_id;
  if (!videoId) throw new Error("HeyGen returned no video_id");
  console.log(`[HeyGen] Video ID: ${videoId}`);

  // 2 — Poll for completion
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let videoUrl   = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(
      `${HEYGEN_API}/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": apiKey } }
    );

    if (!statusRes.ok) continue;
    const { data: statusData } = await statusRes.json();

    console.log(`[HeyGen] Status: ${statusData?.status}`);

    if (statusData?.status === "completed") {
      videoUrl = statusData?.video_url;
      break;
    }
    if (statusData?.status === "failed") {
      throw new Error(`HeyGen video failed: ${statusData?.error ?? "unknown"}`);
    }
  }

  if (!videoUrl) throw new Error("HeyGen timed out after 5 minutes");

  // 3 — Download avatar video
  const timestamp    = Date.now();
  const avatarPath   = path.resolve(`generated_imgs/avatar-${timestamp}.mp4`);

  fs.mkdirSync("generated_imgs", { recursive: true });

  console.log(`[HeyGen] Downloading avatar video...`);
  const dlRes = await fetch(videoUrl);
  if (!dlRes.ok) throw new Error(`HeyGen download failed (${dlRes.status})`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  fs.writeFileSync(avatarPath, buf);
  console.log(`[HeyGen] Avatar saved: ${avatarPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

  // 4 — Composite Hyperframes motion graphics BEHIND the avatar via ffmpeg
  // We treat the avatar as the foreground and the Hyperframes output as background.
  // The avatar is rendered on #0A0A0A which we chroma-key to transparent, then overlay.
  let finalPath = avatarPath;

  try {
    console.log(`[HeyGen] Adding Hyperframes motion graphics overlay...`);
    const bgScript = [{
      screen: 1,
      heading: "Drevon Bullock",
      body: "AI Automation for Business Owners",
    }];
    const bgVideoPath = await generateHyperframesVideo(bgScript, "hook_reveal", null, null);

    const compositePath = path.resolve(`generated_imgs/avatar-composite-${timestamp}.mp4`);
    execFileSync(ffmpeg, [
      "-y",
      "-i", bgVideoPath,
      "-i", avatarPath,
      "-filter_complex",
      "[1:v]colorkey=0x0A0A0A:0.15:0.05[fg];[0:v][fg]overlay=0:0",
      "-codec:a", "copy",
      compositePath,
    ], { stdio: "pipe", timeout: 5 * 60 * 1000 });

    finalPath = compositePath;
    console.log(`[HeyGen] Composite ready: ${compositePath}`);
  } catch (err) {
    console.warn(`[HeyGen] Composite failed — using avatar only: ${err.message}`);
  }

  return finalPath;
}
