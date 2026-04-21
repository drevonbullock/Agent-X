import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { generateVideo } from "./agent/generate-video.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import supabase from "./supabase/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    console.warn(`[Reel] Bucket note: ${JSON.stringify(json)}`);
  }
}

async function uploadToSupabase(filePath, key) {
  await ensureBucket();
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

async function generateCarouselScript(topic) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are writing an Instagram Reel script for 9-to-5 employees who want to use AI at work but don't know where to start. Written as Drevon Bullock — direct, confident, no hype.

Topic: ${topic}

Return ONLY valid JSON, no markdown:
{
  "caption": "1-2 sentence Instagram hook. Opens a curiosity gap. Does NOT explain.",
  "videoScript": [
    { "screen": 1, "heading": "Pattern interrupt hook, 6 words max", "body": "" },
    { "screen": 2, "heading": "First point, 5 words max", "body": "", "points": ["Concrete insight, max 12 words.", "How to apply it today, max 12 words."] },
    { "screen": 3, "heading": "Second point, 5 words max", "body": "", "points": ["Second insight, specific and real.", "What changes when you use this."] },
    { "screen": 4, "heading": "Third point, 5 words max", "body": "", "points": ["The biggest unlock of all three.", "Result you get within one week."] }
  ]
}

Rules: no jargon, no code, no filler phrases, business language only.`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

async function main() {
  const topic = process.argv[2] ?? "how to use AI if you work a 9-to-5 job";
  console.log(`\n[Reel] Topic: "${topic}"`);

  const { caption, videoScript } = await generateCarouselScript(topic);
  console.log(`[Reel] Hook: "${videoScript[0].heading}"`);
  console.log(`[Reel] Caption: "${caption}"`);

  const videoPath = await generateVideo(videoScript, "carousel_slide_vertical");

  const storageKey = `reels/reel-${Date.now()}.mp4`;
  console.log(`[Reel] Uploading to Supabase...`);
  const videoUrl = await uploadToSupabase(videoPath, storageKey);
  console.log(`[Reel] URL: ${videoUrl}`);

  console.log(`[Reel] Posting to Instagram...`);
  const { mediaId, postUrl } = await postReelToInstagram(videoUrl, caption);
  console.log(`\n[Reel] Live on Instagram: ${postUrl}`);
}

main().catch((err) => {
  console.error(`[Reel] Fatal: ${err.message}`);
  process.exit(1);
});
