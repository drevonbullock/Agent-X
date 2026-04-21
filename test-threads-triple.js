import "dotenv/config";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { generateThreadsPost } from "./agent/generate-post.js";
import { postTextToThreads, postVideoToThreads } from "./distributors/threads.js";
import { generateAndPostCarouselToThreads } from "./modules/carousel-generator.js";
import { generateVideo } from "./agent/generate-video.js";
import supabase from "./supabase/client.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BUCKET = "agent-x-videos";

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
    console.warn(`[Upload] Bucket note: ${JSON.stringify(json)}`);
  }
}

async function uploadVideo(filePath) {
  await ensureBucket();
  const key = `reels/threads-test-${Date.now()}.mp4`;
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

async function generateVideoScript(topic) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Write an Instagram/Threads Reel script for: "${topic}"
Target: 9-to-5 employees or founders curious about AI. Drevon Bullock voice — direct, no hype.

Return ONLY valid JSON:
{
  "caption": "Short punchy caption under 400 chars. No hashtags.",
  "videoScript": [
    { "screen": 1, "heading": "Hook, 6 words max", "body": "" },
    { "screen": 2, "heading": "Point one, 5 words", "body": "", "points": ["Insight one, max 12 words.", "How to apply it."] },
    { "screen": 3, "heading": "Point two, 5 words", "body": "", "points": ["Insight two, concrete and specific.", "What changes when you do this."] },
    { "screen": 4, "heading": "Point three, 5 words", "body": "", "points": ["The biggest unlock.", "Result within one week."] }
  ]
}`,
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

async function main() {
  console.log("\n════════════════════════════════════════");
  console.log("  THREADS TRIPLE POST TEST");
  console.log("════════════════════════════════════════\n");

  // ── 1. TEXT POST ─────────────────────────────────────────────────────────────
  console.log("▶ POST 1 — Text");
  try {
    const postText = await generateThreadsPost();
    console.log(`  "${postText.slice(0, 80)}..."`);
    const { postId, postUrl } = await postTextToThreads(postText);
    console.log(`  ✓ Live: ${postUrl}\n`);
  } catch (err) {
    console.error(`  ✗ Text post failed: ${err.message}\n`);
  }

  // ── 2. CAROUSEL POST ─────────────────────────────────────────────────────────
  console.log("▶ POST 2 — Carousel");
  try {
    const { postUrl, slideCount } = await generateAndPostCarouselToThreads(
      "why most small businesses fail at AI implementation"
    );
    console.log(`  ✓ ${slideCount} slides live: ${postUrl}\n`);
  } catch (err) {
    console.error(`  ✗ Carousel post failed: ${err.message}\n`);
  }

  // ── 3. VIDEO POST ─────────────────────────────────────────────────────────────
  console.log("▶ POST 3 — Video");
  try {
    const topic = "how to save 10 hours a week using AI tools at your job";
    const { caption, videoScript } = await generateVideoScript(topic);
    console.log(`  Hook: "${videoScript[0].heading}"`);

    const videoPath = await generateVideo(videoScript, "carousel_slide_vertical");
    const videoUrl = await uploadVideo(videoPath);
    console.log(`  Uploaded: ${videoUrl}`);

    const { postId, postUrl } = await postVideoToThreads(videoUrl, caption);
    console.log(`  ✓ Live: ${postUrl}\n`);
  } catch (err) {
    console.error(`  ✗ Video post failed: ${err.message}\n`);
  }

  console.log("════════════════════════════════════════");
  console.log("  DONE");
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(`[TripleTest] Fatal: ${err.message}`);
  process.exit(1);
});
