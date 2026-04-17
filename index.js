import "dotenv/config";
import supabase from "./supabase/client.js";

// ─── WHITE-LABEL CONFIG ───────────────────────────────────────────────────────
// Override these per client deployment. Defaults to Dre's personal brand.
export const AGENT_CONFIG = {
  // Identity
  author:       process.env.BRAND_AUTHOR       ?? "Drevon Bullock",
  title:        process.env.BRAND_TITLE        ?? "AI Consultant • Bullock Consulting Group",
  handle:       process.env.BRAND_HANDLE       ?? "@DrevonBullock",
  niche:        process.env.BRAND_NICHE        ?? "AI automation for small businesses",
  audience:     process.env.BRAND_AUDIENCE     ?? "founders, agency owners, small business operators",

  // Platforms to post to (comma-separated in env, or override here)
  platforms:    (process.env.BRAND_PLATFORMS   ?? "linkedin").split(",").map((p) => p.trim()),

  // Posting schedule — passed as withImage flags to runAgent
  // Currently controlled by scheduler.js; listed here for reference
  schedule: [
    { label: "9:00 AM",  withImage: true  },
    { label: "1:00 PM",  withImage: false },
    { label: "6:00 PM",  withImage: false },
  ],

  // Video cadence — every Nth post triggers video mode
  videoCadence: parseInt(process.env.VIDEO_CADENCE ?? "10", 10),
};
import { generateLinkedInPost, generateVideoPost } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { startScheduler } from "./scheduler.js";

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────

async function loadPostCount() {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
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
  if (error) console.warn(`[Agent X] Supabase log failed: ${error.message}`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isShortPost(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length < 6;
}

// ─── AGENT ────────────────────────────────────────────────────────────────────

export async function runAgent(withImage = true) {
  const postCount = await loadPostCount();
  const isVideoPost = withImage && (postCount + 1) % AGENT_CONFIG.videoCadence === 0;

  console.log(`\n[Agent X] Starting run`);
  console.log(`[Agent X] Post count: ${postCount} | Video mode: ${isVideoPost}`);

  // ── VIDEO MODE ────────────────────────────────────────────────────────────
  if (isVideoPost) {
    let videoAsset = null;
    let caption = null;

    try {
      const { caption: c, videoScript, videoStyle } = await generateVideoPost();
      caption = c;
      console.log(`[Agent X] VIDEO MODE triggered`);
      console.log(`[Agent X] Caption: ${caption}`);
      console.log(`[Agent X] Video script: ${videoScript.length} screens | Style: ${videoStyle}`);

      const videoPath = await generateVideo(videoScript, videoStyle);
      videoAsset = { type: "video", path: videoPath };
    } catch (err) {
      console.error(`[Agent X] Video pipeline failed — falling back to text post: ${err.message}`);
    }

    const postText = caption ?? "[Agent X] Video render failed.";
    console.log(`[Agent X] Posting to LinkedIn...`);
    const { postId, postUrl } = await postToLinkedIn(postText, null, videoAsset);
    console.log(`[Agent X] Posted! ID: ${postId} | URL: ${postUrl}`);

    await logPost({ postId, postUrl, postText, format: "video", postType: videoAsset ? "video" : "text" });
    console.log(`[Agent X] Done.\n`);
    return { postId, postUrl, postText };
  }

  // ── NORMAL MODE ───────────────────────────────────────────────────────────
  console.log(`[Agent X] Generating LinkedIn post...`);
  const { postText, format } = await generateLinkedInPost();
  console.log(`[Agent X] Format: ${format} | Post: "${postText.slice(0, 80)}..."`);

  const short = isShortPost(postText);
  let imageBuffer = null;
  let postType = "text";

  if (!withImage) {
    console.log(`[Agent X] Skipping media — text-only slot`);
  } else if (short) {
    console.log(`[Agent X] Skipping image — short post`);
  } else {
    console.log(`[Agent X] Rendering image...`);
    try {
      imageBuffer = await generateImage(postText);
      if (imageBuffer) {
        postType = "image";
        console.log(`[Agent X] Image rendered (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
      }
    } catch (err) {
      console.warn(`[Agent X] Image render failed — posting text-only. Error: ${err.message}`);
    }
  }

  console.log(`[Agent X] Posting to LinkedIn...`);
  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[Agent X] Posted! ID: ${postId} | URL: ${postUrl}`);

  await logPost({ postId, postUrl, postText, format, postType, platform: "linkedin" });
  console.log(`[Agent X] Done.\n`);
  return { postId, postUrl, postText };
}

// ─── ENTRY ────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--test")) {
    await runAgent();
  } else {
    startScheduler();
    console.log("[Agent X] Scheduler started. Waiting for next run...");
  }
}

main().catch((err) => {
  console.error(`[Agent X] Fatal error:`, err.message);
  process.exit(1);
});
