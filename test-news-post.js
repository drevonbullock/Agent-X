import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import { generateAndPostCarouselToThreads } from "./modules/carousel-generator.js";
import supabase from "./supabase/client.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const IG_BUCKET = "agent-x-videos";

const NEWS_TOPIC = "Anthropic removing Claude Code from the Claude.ai Pro plan — developers now need Max plan ($100/mo) to access it";

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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
    console.warn(`[Bucket] note: ${JSON.stringify(j)}`);
  }
}

async function logPost({ postId, postUrl, postText, format, postType, platform }) {
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
  if (error) console.warn(`[Supabase] log failed (${platform}): ${error.message}`);
}

// ─── INSTAGRAM REEL ───────────────────────────────────────────────────────────

async function postInstagramReel() {
  console.log("\n[Instagram] Generating reel script about Claude Code news...");

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Write an Instagram Reel script about this news: "${NEWS_TOPIC}"

Target audience: founders and 9-to-5 employees curious about AI. Voice: Drevon Bullock — direct, no hype, real takes.
The hook must make clear this affects developers and indie builders who rely on Claude Code.
Explain what changed, why it matters, and what to do about it.

Return ONLY valid JSON:
{
  "caption": "Short punchy caption, under 400 chars, no hashtags.",
  "videoScript": [
    { "screen": 1, "heading": "Hook, 6 words max", "body": "" },
    { "screen": 2, "heading": "What changed, 5 words", "body": "", "points": ["The actual change. Specific.", "Who it affects and how."] },
    { "screen": 3, "heading": "Why this matters, 5 words", "body": "", "points": ["Cost implication. Specific number.", "What builders now have to decide."] },
    { "screen": 4, "heading": "The real move, 5 words", "body": "", "points": ["What smart builders are doing.", "One action to take right now."] }
  ]
}`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const { caption, videoScript } = JSON.parse(raw);
  console.log(`[Instagram] Hook: "${videoScript[0].heading}"`);

  const rawPath = await generateVideo(videoScript, "auto");
  const videoPath = compressForUpload(rawPath);

  await ensureIgBucket();
  const key = `reels/ig-news-${Date.now()}.mp4`;
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
  console.log(`[Instagram] Reel live: ${postUrl}`);
  await logPost({ postId: mediaId, postUrl, postText: caption, format: "reel", postType: "video", platform: "instagram" });
  return postUrl;
}

// ─── LINKEDIN IMAGE ───────────────────────────────────────────────────────────

async function postLinkedInImage() {
  console.log("\n[LinkedIn] Generating post about Claude Code news...");

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Write a LinkedIn post reacting to this news: "${NEWS_TOPIC}"

You are Drevon Bullock — AI automation builder. Voice rules:
- Conversational, like texting a smart friend
- Raw and direct. If something is frustrating or surprising, say it exactly that way
- No filler phrases, no hype openers
- Do not sound like AI wrote this
- No em dashes or en dashes
- Write for founders and operators, not developers
- 150-300 words
- End with a clear take or question that makes the reader think about their own AI setup
- Max 2 hashtags

Do not include quotes around the post. Just the post text.`,
    }],
  });

  const postText = msg.content[0].text.trim();
  console.log(`[LinkedIn] Post generated (${postText.length} chars). Generating image...`);

  let imageBuffer = null;
  try {
    imageBuffer = await generateImage(postText);
    if (imageBuffer) console.log(`[LinkedIn] Image ready (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.warn(`[LinkedIn] Image failed, posting text only: ${err.message}`);
  }

  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[LinkedIn] Live: ${postUrl}`);
  await logPost({ postId, postUrl, postText, format: "news_take", postType: imageBuffer ? "image" : "text", platform: "linkedin" });
  return postUrl;
}

// ─── THREADS CAROUSEL ─────────────────────────────────────────────────────────

async function postThreadsCarousel() {
  console.log("\n[Threads] Generating carousel about Claude Code news...");
  const { postUrl, slideCount } = await generateAndPostCarouselToThreads(NEWS_TOPIC);
  console.log(`[Threads] ${slideCount} slides live: ${postUrl}`);
  return postUrl;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const target = process.argv[2]; // "ig" | "li" | "threads" | undefined (runs all)

(async () => {
  const results = {};

  try {
    if (!target || target === "ig") {
      results.instagram = await postInstagramReel();
    }
  } catch (err) {
    console.error(`[Instagram] FAILED: ${err.message}`);
  }

  try {
    if (!target || target === "li") {
      results.linkedin = await postLinkedInImage();
    }
  } catch (err) {
    console.error(`[LinkedIn] FAILED: ${err.message}`);
  }

  try {
    if (!target || target === "threads") {
      results.threads = await postThreadsCarousel();
    }
  } catch (err) {
    console.error(`[Threads] FAILED: ${err.message}`);
  }

  console.log("\n─── Results ───");
  for (const [platform, url] of Object.entries(results)) {
    console.log(`${platform}: ${url ?? "failed"}`);
  }
})();
