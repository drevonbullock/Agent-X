import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateVideo } from "./agent/generate-video.js";
import supabase from "./supabase/client.js";
import { postReelToInstagram } from "./distributors/instagram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "agent-x-videos";
const STORAGE_KEY = "reels/carousel-output.mp4";

const TEST_SCRIPT = [
  { screen: 1, heading: "3 AI systems every solo founder needs", body: "Most people use tools. Here's what separates builders from scrollers." },
  {
    screen: 2,
    heading: "Lead capture on autopilot",
    points: [
      "Chatbot qualifies inbound leads and books calls automatically.",
      "Your CRM updates itself. Zero manual input required.",
    ],
    visuals: [{ at: 2.2, imageFile: "nb_visual_2.jpg", side: "right" }],
  },
  {
    screen: 3,
    heading: "Content repurposed automatically",
    points: [
      "One long-form piece becomes 10 posts, 3 shorts, and a newsletter.",
      "Runs every week without a single prompt from you.",
    ],
    visuals: [{ at: 3.0, imageFile: "nb_visual_3.jpg", side: "left" }],
  },
  {
    screen: 4,
    heading: "Follow-up that never forgets",
    points: [
      "Automated sequences that nurture leads for 90 days straight.",
      "No copy-paste. No reminders. Just results on autopilot.",
    ],
    visuals: [{ at: 2.5, imageFile: "nb_visual_4.jpg", side: "right" }],
  },
];

const CAPTION = `3 AI systems every solo founder needs.

Stop buying tools. Start building systems.

#AIAutomation #SoloFounder #BuildInPublic`;

async function uploadToSupabase(filePath) {
  // Ensure bucket exists
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
  console.log(`[CarouselTest] Uploaded: ${data.publicUrl}`);
  return data.publicUrl;
}

async function main() {
  console.log("[CarouselTest] Step 1: Rendering CarouselSlideVertical...");
  const videoPath = await generateVideo(TEST_SCRIPT, "carousel_slide_vertical");
  const stats = fs.statSync(videoPath);
  console.log(`[CarouselTest] Rendered: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  console.log("\n[CarouselTest] Step 2: Uploading to Supabase Storage...");
  const videoUrl = await uploadToSupabase(videoPath);

  if (!process.env.INSTAGRAM_ACCESS_TOKEN || !process.env.INSTAGRAM_BUSINESS_ID) {
    console.log("\n[CarouselTest] Instagram tokens not set — skipping Reel post.");
    console.log(`[CarouselTest] Video URL: ${videoUrl}`);
    return;
  }

  console.log("\n[CarouselTest] Step 3: Posting Instagram Reel...");
  const { mediaId, postUrl } = await postReelToInstagram(videoUrl, CAPTION);
  console.log(`[CarouselTest] Reel live: ${postUrl}`);
  console.log(`[CarouselTest] Media ID: ${mediaId}`);
}

main().catch((err) => {
  console.error(`[CarouselTest] Fatal: ${err.message}`);
  process.exit(1);
});
