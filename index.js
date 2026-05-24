import "dotenv/config";
import supabase from "./supabase/client.js";

// ─── WHITE-LABEL CONFIG ───────────────────────────────────────────────────────
export const AGENT_CONFIG = {
  author:       process.env.BRAND_AUTHOR    ?? "Drevon Bullock",
  title:        process.env.BRAND_TITLE     ?? "AI Consultant • Bullock Consulting Group",
  handle:       process.env.BRAND_HANDLE    ?? "@DrevonBullock",
  niche:        process.env.BRAND_NICHE     ?? "AI automation for small businesses",
  audience:     process.env.BRAND_AUDIENCE  ?? "founders, agency owners, small business operators",
  platforms:    (process.env.BRAND_PLATFORMS ?? "linkedin").split(",").map((p) => p.trim()),
  videoCadence: parseInt(process.env.VIDEO_CADENCE ?? "10", 10),
};

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import http from "http";
import Anthropic from "@anthropic-ai/sdk";
import { generateLinkedInPost, generateVideoPost, generateThreadsPost } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import { postVideoToThreads } from "./distributors/threads.js";
import { postVideoToTikTok } from "./distributors/tiktok.js";
import { uploadYouTubeShort } from "./distributors/youtube-shorts.js";
import { postTextToThreads } from "./distributors/threads.js";
import { generateAndPostCarousel, generateAndPostCarouselToThreads } from "./modules/carousel-generator.js";
import { handleInstagramWebhook } from "./modules/comment-reply.js";
import { pickVariant } from "./analytics/index.js";
import { startScheduler } from "./scheduler.js";

// ─── STARTUP — RAW FOOTAGE CHECK ─────────────────────────────────────────────
fs.mkdirSync("raw_footage",    { recursive: true });
fs.mkdirSync("video-projects", { recursive: true });
{
  const _rawFiles = fs.readdirSync("raw_footage").filter((f) => /\.(mp4|mov|avi|mkv)$/i.test(f));
  if (_rawFiles.length > 0) {
    console.log(`[Agent X] Raw footage detected — next video post will use PATH A: ${_rawFiles[0]}`);
  } else {
    console.log(`[Agent X] No raw footage — next video post will use PATH B (AI generated)`);
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const IG_BUCKET  = "agent-x-videos";

const IG_REEL_TOPICS = [
  "how to automate your client onboarding",
  "AI tools that replace a $60k/yr hire",
  "how to use AI if you work a 9-to-5",
  "what happens when you automate lead follow-up",
  "the difference between tools and systems",
  "how to build a second brain using AI",
  "AI automations every solo founder needs",
  "stop doing manually what AI can do in seconds",
];

async function ensureIgBucket() {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      apikey: process.env.SUPABASE_SECRET_KEY,
    },
    body: JSON.stringify({ id: IG_BUCKET, name: IG_BUCKET, public: true }),
  });
  const j = await res.json();
  if (!res.ok && !JSON.stringify(j).includes("already exists") && j.message !== "Duplicate") {
    console.warn(`[Instagram] Bucket note: ${JSON.stringify(j)}`);
  }
}

async function generateReelScript(topic) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Write an Instagram Reel script for: "${topic}". Target audience: founders and 9-to-5 employees curious about AI. Drevon Bullock voice — direct, no hype.

Return ONLY valid JSON:
{
  "caption": "Short punchy caption, under 400 chars, no hashtags.",
  "videoScript": [
    { "screen": 1, "heading": "Hook, 6 words max", "body": "" },
    { "screen": 2, "heading": "Point one, 5 words", "body": "", "points": ["Insight one, max 12 words.", "How to apply it."] },
    { "screen": 3, "heading": "Point two, 5 words", "body": "", "points": ["Insight two, specific.", "What changes."] },
    { "screen": 4, "heading": "Point three, 5 words", "body": "", "points": ["Biggest unlock.", "Result within one week."] }
  ]
}`,
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────

async function loadPostCount(platform = null) {
  let query = supabase.from("posts").select("*", { count: "exact", head: true });
  if (platform) query = query.eq("platform", platform);
  const { count, error } = await query;
  if (error) {
    console.warn(`[Agent X] Supabase count failed, defaulting to 0: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function logPost({ postId, postUrl, postText, format, postType, platform = "linkedin", designVariant = null }) {
  const hook = postText.split(/[.!?\n]/)[0].trim().slice(0, 200);
  const { error } = await supabase.from("posts").insert({
    content: postText,
    platform,
    post_type: postType,
    hook,
    format,
    post_id: postId,
    post_url: postUrl,
    design_variant: designVariant,
  });
  if (error) console.warn(`[Agent X] Supabase log failed (${platform}): ${error.message}`);
}

function isShortPost(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length < 6;
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────────
// Text + single images only. Video every 10th LinkedIn post. No carousels.

export async function runLinkedIn(withImage = true) {
  if (!AGENT_CONFIG.platforms.includes("linkedin")) return;

  const liCount = await loadPostCount("linkedin");
  const isVideoPost = withImage && (liCount + 1) % AGENT_CONFIG.videoCadence === 0;

  console.log(`\n[LinkedIn] Starting run | post #${liCount + 1} | ${isVideoPost ? "VIDEO" : withImage ? "image" : "text"}`);

  // ── VIDEO MODE ──────────────────────────────────────────────────────────────
  if (isVideoPost) {
    let videoAsset = null;
    let caption = null;
    let videoPath = null;

    try {
      const { caption: c, videoScript, videoStyle } = await generateVideoPost();
      caption = c;
      console.log(`[LinkedIn] Video script: ${videoScript.length} screens | style: ${videoStyle}`);
      videoPath = await generateVideo(caption, videoScript, videoStyle);
      videoAsset = { type: "video", path: videoPath };
    } catch (err) {
      console.error(`[LinkedIn] Video pipeline failed, falling back to text: ${err.message}`);
    }

    const postText = caption ?? "[Agent X] Video render failed.";
    const { postId, postUrl } = await postToLinkedIn(postText, null, videoAsset);
    console.log(`[LinkedIn] Posted! ID: ${postId} | ${postUrl}`);
    await logPost({ postId, postUrl, postText, format: "video", postType: videoAsset ? "video" : "text", platform: "linkedin" });

    // TikTok / YouTube if tokens present
    if (videoPath) await distributeVideo(postText, videoPath);

    console.log(`[LinkedIn] Done.\n`);
    return { postId, postUrl, postText };
  }

  // ── TEXT / IMAGE MODE ───────────────────────────────────────────────────────
  // Ask the optimizer which creative variant to run for this slot. Cold start
  // returns the brand default, so output is unchanged until real data accrues.
  let copyStyleId = null;
  let imageVariantId = null;
  if (withImage) imageVariantId = await pickVariant("linkedin", "image").catch(() => null);
  else           copyStyleId    = await pickVariant("linkedin", "text").catch(() => null);

  const { postText, format } = await generateLinkedInPost(copyStyleId);
  console.log(`[LinkedIn] Format: ${format} | "${postText.slice(0, 80)}..."`);

  const short = isShortPost(postText);
  let imageBuffer = null;
  let postType = "text";
  let designVariant = copyStyleId; // text-only slots tag their copy style

  if (!withImage || short) {
    console.log(`[LinkedIn] ${!withImage ? "Text-only slot" : "Short post — skipping image"}`);
  } else {
    try {
      imageBuffer = await generateImage(postText, imageVariantId);
      if (imageBuffer) {
        postType = "image";
        designVariant = imageVariantId;
        console.log(`[LinkedIn] Image rendered (${(imageBuffer.length / 1024).toFixed(0)} KB) | theme: ${imageVariantId}`);
      }
    } catch (err) {
      console.warn(`[LinkedIn] Image render failed — text-only: ${err.message}`);
    }
  }

  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[LinkedIn] Posted! ID: ${postId} | ${postUrl}`);
  await logPost({ postId, postUrl, postText, format, postType, platform: "linkedin", designVariant });

  console.log(`[LinkedIn] Done.\n`);
  return { postId, postUrl, postText };
}

// Re-encode the 4K master to a web-optimized 1080p MP4 for Supabase upload.
// The 4K render (CRF=15) produces 300MB+ files that exceed Supabase's 50MB limit.
function compressForUpload(inputPath) {
  const outPath = path.join(os.tmpdir(), `ig-upload-${Date.now()}.mp4`);
  const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";
  const cmd = [
    `${ffmpeg} -y`,
    `-i "${inputPath}"`,
    `-vf "scale=1080:1920"`,
    `-c:v libx264 -crf 23 -preset fast`,
    `-c:a aac -b:a 128k`,
    `-movflags +faststart`,
    `"${outPath}"`,
  ].join(" ");
  execSync(cmd, { stdio: "inherit", timeout: 5 * 60 * 1000 });
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Instagram] Compressed for upload: ${sizeMB} MB → ${outPath}`);
  return outPath;
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────────
// 10am + 8pm → Reel (video)   |   3pm → Carousel (static)

export async function runInstagramReel() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) return;
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  const topic = IG_REEL_TOPICS[Math.floor(Math.random() * IG_REEL_TOPICS.length)];
  console.log(`\n[Instagram] Reel run | topic: ${topic}`);

  try {
    const { caption, videoScript } = await generateReelScript(topic);
    console.log(`[Instagram] Hook: "${videoScript[0].heading}"`);

    const rawPath = await generateVideo(caption, videoScript, "auto");
    const videoPath = compressForUpload(rawPath);

    await ensureIgBucket();
    const key = `reels/ig-${Date.now()}.mp4`;
    const buffer = fs.readFileSync(videoPath);
    try {
      const { error } = await supabase.storage.from(IG_BUCKET).upload(key, buffer, {
        contentType: "video/mp4",
        upsert: true,
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    } finally {
      try { fs.unlinkSync(videoPath); } catch { /* tmp cleanup */ }
    }
    const { data } = supabase.storage.from(IG_BUCKET).getPublicUrl(key);

    const { mediaId, postUrl } = await postReelToInstagram(data.publicUrl, caption);
    console.log(`[Instagram] Reel live: ${postUrl}\n`);
    await logPost({ postId: mediaId, postUrl, postText: caption, format: "reel", postType: "video", platform: "instagram" });
    return { postUrl };
  } catch (err) {
    console.error(`[Instagram] Reel failed: ${err.message}\n`);
  }
}

export async function runInstagram() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) return;
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  console.log(`\n[Instagram] Carousel run`);
  try {
    const { postUrl, slideCount } = await generateAndPostCarousel(AGENT_CONFIG.niche);
    console.log(`[Instagram] ${slideCount} slides live: ${postUrl}\n`);
    await logPost({ postId: null, postUrl, postText: AGENT_CONFIG.niche, format: "carousel", postType: "image", platform: "instagram" });
    return { postUrl, slideCount };
  } catch (err) {
    console.error(`[Instagram] Carousel failed: ${err.message}\n`);
  }
}

// ─── THREADS ──────────────────────────────────────────────────────────────────
// Video every 5th post. Carousel every 3rd (non-video). Text fills the rest.

export async function runThreads() {
  if (!AGENT_CONFIG.platforms.includes("threads")) return;
  if (!process.env.THREADS_ACCESS_TOKEN) {
    console.log("[Threads] Skipped — THREADS_ACCESS_TOKEN not set");
    return;
  }

  const threadsCount  = await loadPostCount("threads");
  const isVideoSlot   = (threadsCount + 1) % 5 === 0;
  const isCarouselSlot = !isVideoSlot && (threadsCount + 1) % 3 === 0;

  console.log(`\n[Threads] Starting run | post #${threadsCount + 1} | ${isVideoSlot ? "video" : isCarouselSlot ? "carousel" : "text"}`);

  // ── VIDEO MODE ──────────────────────────────────────────────────────────────
  if (isVideoSlot) {
    try {
      const { caption, videoScript } = await generateVideoPost();
      console.log(`[Threads] Video hook: "${videoScript[0].heading}"`);

      const rawPath = await generateVideo(caption, videoScript, "auto");
      const videoPath = compressForUpload(rawPath);

      await ensureIgBucket();
      const key = `reels/threads-${Date.now()}.mp4`;
      const buffer = fs.readFileSync(videoPath);
      try {
        const { error } = await supabase.storage.from(IG_BUCKET).upload(key, buffer, {
          contentType: "video/mp4",
          upsert: true,
        });
        if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      } finally {
        try { fs.unlinkSync(videoPath); } catch { /* tmp cleanup */ }
      }
      const { data } = supabase.storage.from(IG_BUCKET).getPublicUrl(key);

      const { postId, postUrl } = await postVideoToThreads(data.publicUrl, caption);
      await logPost({ postId, postUrl, postText: caption, format: "video", postType: "video", platform: "threads" });
      console.log(`[Threads] Video posted: ${postUrl}\n`);
      return { postId, postUrl };
    } catch (err) {
      console.error(`[Threads] Video failed, falling back to text: ${err.message}`);
      // fall through to text post
    }
  }

  // ── CAROUSEL MODE ───────────────────────────────────────────────────────────
  if (isCarouselSlot) {
    try {
      const { postUrl, slideCount } = await generateAndPostCarouselToThreads(AGENT_CONFIG.niche);
      console.log(`[Threads] Carousel done. ${slideCount} slides: ${postUrl}\n`);
      return { postUrl, slideCount };
    } catch (err) {
      console.warn(`[Threads] Carousel failed, falling back to text: ${err.message}`);
      // fall through to text post
    }
  }

  // ── TEXT MODE ────────────────────────────────────────────────────────────────
  try {
    const postText = await generateThreadsPost();
    const { postId, postUrl } = await postTextToThreads(postText);
    await logPost({ postId, postUrl, postText, format: "threads_native", postType: "text", platform: "threads" });
    console.log(`[Threads] Text posted: ${postUrl}\n`);
    return { postId, postUrl };
  } catch (err) {
    console.error(`[Threads] Text post failed: ${err.message}\n`);
  }
}

// ─── VIDEO DISTRIBUTION (TikTok / YouTube) ───────────────────────────────────

async function distributeVideo(postText, videoPath) {
  if (AGENT_CONFIG.platforms.includes("tiktok") && process.env.TIKTOK_ACCESS_TOKEN) {
    try {
      const { publish_id } = await postVideoToTikTok(videoPath, postText);
      await logPost({ postId: publish_id, postUrl: null, postText, format: "video", postType: "video", platform: "tiktok" });
      console.log(`[LinkedIn] TikTok queued: ${publish_id}`);
    } catch (err) {
      console.warn(`[LinkedIn] TikTok skipped: ${err.message}`);
    }
  }

  if (AGENT_CONFIG.platforms.includes("youtube") && process.env.YOUTUBE_REFRESH_TOKEN) {
    try {
      const title = postText.split(/[.!?\n]/)[0].trim().slice(0, 100);
      const { videoId, videoUrl } = await uploadYouTubeShort(videoPath, title, postText);
      await logPost({ postId: videoId, postUrl: videoUrl, postText, format: "video", postType: "video", platform: "youtube" });
      console.log(`[LinkedIn] YouTube Short: ${videoUrl}`);
    } catch (err) {
      console.warn(`[LinkedIn] YouTube Shorts skipped: ${err.message}`);
    }
  }
}

// ─── ENTRY ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv;
  if (args.includes("--test")) {
    // Test LinkedIn (9am slot = withImage true)
    await runLinkedIn(true);
  } else if (args.includes("--test-instagram")) {
    await runInstagram();
  } else if (args.includes("--test-threads")) {
    await runThreads();
  } else {
    startScheduler();

    // Instagram webhook — GET = hub verification, POST = comment events
    const PORT = parseInt(process.env.PORT ?? "3000", 10);
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost`);

      if (req.method === "GET" && url.pathname === "/webhook/instagram") {
        const mode      = url.searchParams.get("hub.mode");
        const token     = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(challenge);
        } else {
          res.writeHead(403);
          res.end("Forbidden");
        }
        return;
      }

      if (req.method === "POST" && url.pathname === "/webhook/instagram") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            await handleInstagramWebhook(parsed);
          } catch (err) {
            console.error(`[Webhook] IG parse/handle failed: ${err.message}`);
          }
          res.writeHead(200);
          res.end("OK");
        });
        return;
      }

      res.writeHead(200);
      res.end("Agent X");
    });

    server.listen(PORT, () => {
      console.log(`[Agent X] Webhook server on port ${PORT}`);
    });

    console.log("[Agent X] Scheduler started. Waiting for next run...");
  }
}

main().catch((err) => {
  console.error(`[Agent X] Fatal error:`, err.message);
  process.exit(1);
});
