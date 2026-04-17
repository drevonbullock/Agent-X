import "dotenv/config";
import fs from "fs";

// Platform specs per PRD
const PLATFORM_SPECS = {
  tiktok:           { ratio: "9:16",  maxChars: 2200, hashtags: 5,  resolution: "sd",  aspectRatio: "9:16"  },
  instagram_reels:  { ratio: "9:16",  maxChars: 2200, hashtags: 30, resolution: "sd",  aspectRatio: "9:16"  },
  youtube_shorts:   { ratio: "9:16",  maxChars: 500,  hashtags: 3,  resolution: "sd",  aspectRatio: "9:16"  },
  instagram_feed:   { ratio: "1:1",   maxChars: 2200, hashtags: 30, resolution: "sd",  aspectRatio: "1:1"   },
  twitter:          { ratio: "16:9",  maxChars: 280,  hashtags: 2,  resolution: "sd",  aspectRatio: "16:9"  },
  linkedin:         { ratio: "16:9",  maxChars: 3000, hashtags: 5,  resolution: "hd",  aspectRatio: "16:9"  },
};

// ─── CAPTION TRIMMER ─────────────────────────────────────────────────────────
// Trims caption to platform character limit, preserving complete sentences.

function trimCaption(text, maxChars) {
  if (text.length <= maxChars) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > maxChars - 20) break;
    out += (out ? " " : "") + s;
  }
  return out.trim() + (out.length < text.length ? " ..." : "");
}

// Trim to max hashtag count
function trimHashtags(text, maxHashtags) {
  const tags = text.match(/#\w+/g) ?? [];
  if (tags.length <= maxHashtags) return text;
  const excess = tags.slice(maxHashtags);
  let trimmed = text;
  for (const tag of excess) {
    trimmed = trimmed.replace(tag, "").trim();
  }
  return trimmed;
}

// ─── SHOTSTACK RESIZE ─────────────────────────────────────────────────────────

async function resizeWithShotstack(videoPath, targetPlatform) {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) throw new Error("SHOTSTACK_API_KEY not set in .env");

  const spec = PLATFORM_SPECS[targetPlatform];
  if (!spec) throw new Error(`Unknown platform: ${targetPlatform}`);

  // Read local file as base64 for upload — or use a URL if already hosted
  const isUrl = videoPath.startsWith("http");
  const videoSrc = isUrl ? videoPath : `file://${videoPath}`;

  const timeline = {
    tracks: [{
      clips: [{
        asset: { type: "video", src: videoSrc },
        start: 0,
        length: 60, // will be auto-trimmed by Shotstack
        fit: "crop",
      }],
    }],
  };

  const res = await fetch("https://api.shotstack.io/edit/v1/render", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      timeline,
      output: {
        format: "mp4",
        resolution: spec.resolution,
        aspectRatio: spec.aspectRatio,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shotstack resize failed (${res.status}): ${err}`);
  }

  const { response } = await res.json();
  return response.id;
}

// ─── POLL RENDER STATUS ──────────────────────────────────────────────────────

export async function pollRenderStatus(renderId, maxAttempts = 30) {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) throw new Error("SHOTSTACK_API_KEY not set in .env");

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000)); // 10s between polls

    const res = await fetch(`https://api.shotstack.io/edit/v1/render/${renderId}`, {
      headers: { "x-api-key": key },
    });

    if (!res.ok) continue;
    const { response } = await res.json();

    if (response.status === "done") return response.url;
    if (response.status === "failed") throw new Error(`Shotstack render ${renderId} failed`);

    console.log(`[FormatAgent] Render ${renderId}: ${response.status} (attempt ${i + 1})`);
  }

  throw new Error(`Shotstack render ${renderId} timed out`);
}

// ─── MAIN: RESIZE FOR ALL PLATFORMS ─────────────────────────────────────────

export async function formatForAllPlatforms(videoPath, caption, platforms = Object.keys(PLATFORM_SPECS)) {
  console.log(`[FormatAgent] Formatting: ${videoPath} → ${platforms.join(", ")}`);

  const results = [];

  for (const platform of platforms) {
    const spec = PLATFORM_SPECS[platform];
    if (!spec) { console.warn(`[FormatAgent] Unknown platform: ${platform}`); continue; }

    const trimmedCaption = trimHashtags(trimCaption(caption, spec.maxChars), spec.hashtags);

    let renderId = null;
    try {
      renderId = await resizeWithShotstack(videoPath, platform);
      console.log(`[FormatAgent] ${platform}: render queued (${renderId})`);
    } catch (err) {
      console.error(`[FormatAgent] ${platform}: resize failed — ${err.message}`);
    }

    results.push({
      platform,
      ratio: spec.ratio,
      caption: trimmedCaption,
      shotstack_render_id: renderId,
      status: renderId ? "queued" : "failed",
    });
  }

  return {
    formatted_at: new Date().toISOString(),
    source: videoPath,
    platforms: results,
  };
}

// CLI: node modules/format-agent.js path/to/video.mp4 "caption text"
const isMain = process.argv[1]?.endsWith("format-agent.js");
if (isMain) {
  const videoPath = process.argv[2];
  const caption = process.argv[3] ?? "";
  if (!videoPath) {
    console.error("Usage: node modules/format-agent.js <video.mp4> [caption]");
    process.exit(1);
  }
  formatForAllPlatforms(videoPath, caption)
    .then((out) => {
      const outPath = "generated_imgs/format-output.json";
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`[FormatAgent] Done → ${outPath}`);
    })
    .catch((err) => { console.error(`[FormatAgent] Fatal: ${err.message}`); process.exit(1); });
}
