import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateVideo } from "./agent/generate-video.js";
import supabase from "./supabase/client.js";
import { postReelToInstagram } from "./distributors/instagram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "agent-x-videos";
const STORAGE_KEY = "reels/output-vertical.mp4";

const TEST_SCRIPT = [
  { screen: 1, heading: "Nobody tells you how AI actually works", body: "" },
  { screen: 2, heading: "Most people use prompts like Google searches", body: "Short, vague, no context. You get generic output back. That's on the prompt, not the model." },
  { screen: 3, heading: "The system is the competitive advantage", body: "Chains of agents. Memory. Context windows. Structured outputs. That's where the leverage lives." },
  {
    screen: 4,
    heading: "Build the system. Own the output.",
    body: "One hour of architecture replaces four hours of manual work. Every single week.",
  },
];

const CAPTION = `Nobody tells you how AI actually works.

The prompt isn't the product. The system is.

#AIAutomation #BuildInPublic`;

async function uploadToSupabase(filePath) {
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const fileBuffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(STORAGE_KEY, fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(STORAGE_KEY);
  console.log(`[ReelTest] Uploaded: ${data.publicUrl}`);
  return data.publicUrl;
}

async function main() {
  console.log("[ReelTest] Step 1: Generating HookRevealVertical with ElevenLabs voiceovers...");
  const videoPath = await generateVideo(TEST_SCRIPT, "hook_reveal_vertical");
  const stats = fs.statSync(videoPath);
  console.log(`[ReelTest] Rendered: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  console.log("\n[ReelTest] Step 2: Uploading to Supabase Storage...");
  const videoUrl = await uploadToSupabase(videoPath);

  if (!process.env.INSTAGRAM_ACCESS_TOKEN || !process.env.INSTAGRAM_BUSINESS_ID) {
    console.log("\n[ReelTest] Instagram tokens not set — skipping Reel post.");
    console.log(`[ReelTest] Video URL: ${videoUrl}`);
    return;
  }

  console.log("\n[ReelTest] Step 3: Posting Instagram Reel...");
  const { mediaId, postUrl } = await postReelToInstagram(videoUrl, CAPTION);
  console.log(`[ReelTest] Reel live: ${postUrl}`);
  console.log(`[ReelTest] Media ID: ${mediaId}`);
}

main().catch((err) => {
  console.error(`[ReelTest] Fatal: ${err.message}`);
  process.exit(1);
});
