import "dotenv/config";
import fs from "fs";
import { generateLinkedInPost, generateVideoPost } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { startScheduler } from "./scheduler.js";

const COUNT_FILE = "post_count.json";

function loadPostCount() {
  try {
    const data = JSON.parse(fs.readFileSync(COUNT_FILE, "utf8"));
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

function savePostCount(count) {
  fs.writeFileSync(COUNT_FILE, JSON.stringify({ count }, null, 2));
}

function isShortPost(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length < 6;
}

export async function runAgent(withImage = true) {
  const postCount = loadPostCount();
  // Every 10th post: count=9 → post 10, count=19 → post 20, etc.
  const isVideoPost = withImage && (postCount + 1) % 10 === 0;

  console.log(`\n[Agent X] Starting run`);
  console.log(`[Agent X] Post count: ${postCount} | Video mode: ${isVideoPost}`);

  // ── VIDEO MODE ────────────────────────────────────────────────────────────
  if (isVideoPost) {
    let videoAsset = null;
    let caption = null;

    try {
      // 1. Generate caption + structured video script from Claude
      const { caption: c, videoScript, videoStyle } = await generateVideoPost();
      caption = c;

      console.log(`[Agent X] VIDEO MODE triggered`);
      console.log(`[Agent X] Caption: ${caption}`);
      console.log(`[Agent X] Video script: ${videoScript.length} screens`);
      console.log(`[Agent X] Style: ${videoStyle}`);

      // 2+3. Generate per-screen voiceovers and render — both handled inside generateVideo
      const videoPath = await generateVideo(videoScript, videoStyle);

      videoAsset = { type: "video", path: videoPath };
    } catch (err) {
      console.error(`[Agent X] Video pipeline failed — falling back to text post: ${err.message}`);
    }

    // 4. Post with caption as text, video as attachment (or text-only if video failed)
    const postText = caption ?? "[Agent X] Video render failed.";
    console.log(`[Agent X] Posting to LinkedIn...`);
    const { postId, postUrl } = await postToLinkedIn(postText, null, videoAsset);
    console.log(`[Agent X] Posted! ID: ${postId}`);
    console.log(`[Agent X] URL: ${postUrl}`);

    const newCount = postCount + 1;
    savePostCount(newCount);
    console.log(`[Agent X] Post count saved: ${newCount}`);
    console.log(`[Agent X] Done.\n`);

    return { postId, postUrl, postText };
  }

  // ── NORMAL MODE ───────────────────────────────────────────────────────────
  console.log(`[Agent X] Generating LinkedIn post...`);
  const { postText } = await generateLinkedInPost();
  console.log(`[Agent X] Post: "${postText}"`);

  const short = isShortPost(postText);
  let imageBuffer = null;

  if (!withImage) {
    console.log(`[Agent X] Skipping media — text-only slot`);
  } else if (short) {
    console.log(`[Agent X] Skipping image — short post`);
  } else {
    console.log(`[Agent X] Rendering image...`);
    try {
      imageBuffer = await generateImage(postText);
      if (imageBuffer) {
        console.log(`[Agent X] Image rendered (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
      }
    } catch (err) {
      console.warn(`[Agent X] Image render failed — posting text-only. Error: ${err.message}`);
    }
  }

  console.log(`[Agent X] Posting to LinkedIn...`);
  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[Agent X] Posted! ID: ${postId}`);
  console.log(`[Agent X] URL: ${postUrl}`);

  const newCount = postCount + 1;
  savePostCount(newCount);
  console.log(`[Agent X] Post count saved: ${newCount}`);
  console.log(`[Agent X] Done.\n`);

  return { postId, postUrl, postText };
}

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
