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

import { generateLinkedInPost, generateVideoPost, generateThreadsPost } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { postVideoToTikTok } from "./distributors/tiktok.js";
import { uploadYouTubeShort } from "./distributors/youtube-shorts.js";
import { postTextToThreads } from "./distributors/threads.js";
import { generateAndPostCarousel, generateAndPostCarouselToThreads } from "./modules/carousel-generator.js";
import { startScheduler } from "./scheduler.js";

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

async function logPost({ postId, postUrl, postText, format, postType, platform = "linkedin" }) {
  const hook = postText.split(/[.!?\n]/)[0].trim().slice(0, 200);
  const { error } = await supabase.from("posts").insert({
    content: postText,
    platform,
    post_type: postType,
    hook,
    format,
    post_id: postId,
    post_url: postUrl,
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
      videoPath = await generateVideo(videoScript, videoStyle);
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
  const { postText, format } = await generateLinkedInPost();
  console.log(`[LinkedIn] Format: ${format} | "${postText.slice(0, 80)}..."`);

  const short = isShortPost(postText);
  let imageBuffer = null;
  let postType = "text";

  if (!withImage || short) {
    console.log(`[LinkedIn] ${!withImage ? "Text-only slot" : "Short post — skipping image"}`);
  } else {
    try {
      imageBuffer = await generateImage(postText);
      if (imageBuffer) {
        postType = "image";
        console.log(`[LinkedIn] Image rendered (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
      }
    } catch (err) {
      console.warn(`[LinkedIn] Image render failed — text-only: ${err.message}`);
    }
  }

  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[LinkedIn] Posted! ID: ${postId} | ${postUrl}`);
  await logPost({ postId, postUrl, postText, format, postType, platform: "linkedin" });

  console.log(`[LinkedIn] Done.\n`);
  return { postId, postUrl, postText };
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────────
// Carousels only — every post uses carousel-generator.js.

export async function runInstagram() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) return;
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  console.log(`\n[Instagram] Starting carousel run`);
  try {
    const { postUrl, slideCount } = await generateAndPostCarousel(AGENT_CONFIG.niche);
    console.log(`[Instagram] Done. ${slideCount} slides: ${postUrl}\n`);
    return { postUrl, slideCount };
  } catch (err) {
    console.error(`[Instagram] Run failed: ${err.message}\n`);
  }
}

// ─── THREADS ──────────────────────────────────────────────────────────────────
// Text posts + carousels every 3rd post. No single images.

export async function runThreads() {
  if (!AGENT_CONFIG.platforms.includes("threads")) return;
  if (!process.env.THREADS_ACCESS_TOKEN) {
    console.log("[Threads] Skipped — THREADS_ACCESS_TOKEN not set");
    return;
  }

  const threadsCount = await loadPostCount("threads");
  const isCarouselSlot = (threadsCount + 1) % 3 === 0;

  console.log(`\n[Threads] Starting run | post #${threadsCount + 1} | ${isCarouselSlot ? "carousel" : "text"}`);

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

  // Text post — Threads-native short format
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
    console.log("[Agent X] Scheduler started. Waiting for next run...");
  }
}

main().catch((err) => {
  console.error(`[Agent X] Fatal error:`, err.message);
  process.exit(1);
});
