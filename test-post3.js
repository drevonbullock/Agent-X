import "dotenv/config";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { generateVideo } from "./agent/generate-video.js";
import { postVideoToThreads } from "./distributors/threads.js";
import supabase from "./supabase/client.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BUCKET = "agent-x-videos";

async function ensureBucket() {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, apikey: process.env.SUPABASE_SECRET_KEY },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const j = await res.json();
  if (!res.ok && !JSON.stringify(j).includes("already exists") && j.message !== "Duplicate") console.warn("Bucket:", j);
}

console.log("▶ POST 3 — Video");
const msg = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", max_tokens: 1024,
  messages: [{ role: "user", content: `Write a Threads Reel script for: "how to save 10 hours a week using AI at work". Return ONLY valid JSON: {"caption":"short punchy caption under 400 chars, no hashtags","videoScript":[{"screen":1,"heading":"hook 6 words max","body":""},{"screen":2,"heading":"point one 5 words","body":"","points":["insight one max 12 words","how to apply it"]},{"screen":3,"heading":"point two 5 words","body":"","points":["insight two concrete","result you get"]},{"screen":4,"heading":"point three 5 words","body":"","points":["biggest unlock","outcome within one week"]}]}` }],
});
const { caption, videoScript } = JSON.parse(msg.content[0].text.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"").trim());
console.log(`  Hook: "${videoScript[0].heading}"`);

const videoPath = await generateVideo(videoScript, "carousel_slide_vertical");
await ensureBucket();
const key = `reels/threads-video-${Date.now()}.mp4`;
const buffer = fs.readFileSync(videoPath);
const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, { contentType: "video/mp4", upsert: true });
if (error) throw new Error(`Upload failed: ${error.message}`);
const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
console.log(`  Uploaded: ${data.publicUrl}`);
const { postId, postUrl } = await postVideoToThreads(data.publicUrl, caption);
console.log(`  ✓ Live: ${postUrl}`);
