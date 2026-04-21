import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "./supabase/client.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import { postVideoToThreads } from "./distributors/threads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_PATH = path.join(__dirname, "remotion-videos", "output-vertical.mp4");
const BUCKET = "agent-x-videos";
const STORAGE_KEY = "reels/output-vertical.mp4";

const CAPTION = `I automated my entire content system so it runs while I sleep.

Here's what Agent X does every day:
- Generates content tailored to my audience
- Posts to LinkedIn, Instagram, and Threads
- Monitors what performs and improves week over week

AI automation isn't magic. It's architecture.

#AIAutomation #BuildInPublic`;

async function ensureBucket() {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      apikey: process.env.SUPABASE_SECRET_KEY,
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const json = await res.json();
  if (!res.ok && !json.error?.includes("already exists") && json.message !== "Duplicate") {
    console.warn(`[VideoTest] Bucket create note (${res.status}): ${JSON.stringify(json)}`);
  } else {
    console.log(`[VideoTest] Bucket ready: ${BUCKET}`);
  }
}

async function uploadToSupabase(filePath, storageKey) {
  await ensureBucket();
  console.log(`[VideoTest] Reading ${filePath} ...`);
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  console.log(`[VideoTest] Uploaded. Public URL: ${data.publicUrl}`);
  return data.publicUrl;
}

async function main() {
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`[VideoTest] File not found: ${VIDEO_PATH}`);
    console.error("[VideoTest] Run: cd remotion-videos && npx remotion render --compositionId=HookRevealVertical --output=output-vertical.mp4");
    process.exit(1);
  }

  const stats = fs.statSync(VIDEO_PATH);
  console.log(`[VideoTest] Video: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

  // 1. Upload to Supabase Storage
  const videoUrl = await uploadToSupabase(VIDEO_PATH, STORAGE_KEY);

  const results = {};

  // 2. Instagram Reel
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID) {
    try {
      console.log("\n[VideoTest] Posting Instagram Reel...");
      const { mediaId, postUrl } = await postReelToInstagram(videoUrl, CAPTION);
      results.instagram = { mediaId, postUrl };
      console.log(`[VideoTest] Instagram Reel live: ${postUrl}`);
    } catch (err) {
      console.error(`[VideoTest] Instagram Reel failed: ${err.message}`);
      results.instagram = { error: err.message };
    }
  } else {
    console.log("[VideoTest] Instagram skipped — tokens not set");
    results.instagram = { skipped: true };
  }

  // 3. Threads video
  if (process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID) {
    try {
      console.log("\n[VideoTest] Posting Threads video...");
      const { postId, postUrl } = await postVideoToThreads(videoUrl, CAPTION);
      results.threads = { postId, postUrl };
      console.log(`[VideoTest] Threads video live: ${postUrl}`);
    } catch (err) {
      console.error(`[VideoTest] Threads video failed: ${err.message}`);
      results.threads = { error: err.message };
    }
  } else {
    console.log("[VideoTest] Threads skipped — tokens not set");
    results.threads = { skipped: true };
  }

  console.log("\n[VideoTest] Results:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(`[VideoTest] Fatal: ${err.message}`);
  process.exit(1);
});
