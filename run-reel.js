import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { generateVideo } from "./agent/generate-video.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import supabase from "./supabase/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MUSIC_DIR = path.join(__dirname, "music");

const MOOD_KEYWORDS = {
  tense:        ["job", "fired", "replaced", "layoff", "laid off", "unemployment", "threat", "danger", "warning", "risk", "lose", "loss", "crisis", "recession", "cut", "displaced"],
  dark:         ["fear", "problem", "failed", "broken", "collapse", "worry", "struggle", "decline", "fail", "scam", "toxic"],
  motivational: ["success", "win", "achieve", "grow", "opportunity", "future", "inspire", "build", "launch", "goal", "transform", "level up"],
  corporate:    ["business", "professional", "work", "productivity", "office", "strategy", "revenue", "sales", "roi", "profit"],
  lofi_calm:    ["tips", "how-to", "learn", "guide", "study", "tutorial", "calm", "simple", "easy", "sleep", "focus"],
};

function ffmpegBin() { return process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg"; }
function ffprobeBin() { return process.platform === "linux" ? "/usr/bin/ffprobe" : "/opt/homebrew/bin/ffprobe"; }

function selectMusicTrack(topic, caption) {
  const text = `${topic} ${caption}`.toLowerCase();
  const scores = Object.fromEntries(
    Object.entries(MOOD_KEYWORDS).map(([mood, kws]) => [mood, kws.filter(kw => text.includes(kw)).length])
  );
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const trackPath = path.join(MUSIC_DIR, `${best}.mp3`);
  console.log(`[Music] Mood detected: ${best} → ${best}.mp3`);
  return trackPath;
}

function mixMusicIntoVideo(videoPath, musicPath) {
  const durationRaw = execSync(
    `${ffprobeBin()} -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
    { encoding: "utf8" }
  ).trim();
  const duration = parseFloat(durationRaw);
  const fadeStart = Math.max(0, duration - 2.5);

  const filter = `[1:a]volume=0.45,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeStart}:d=2.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:normalize=0[a]`;
  const outPath = videoPath.replace(".mp4", "-music.mp4");

  execSync(
    `${ffmpegBin()} -y -i "${videoPath}" -i "${musicPath}" -filter_complex "${filter}" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k "${outPath}"`,
    { stdio: "inherit", timeout: 120000 }
  );
  console.log(`[Music] Mixed → ${path.basename(outPath)}`);
  return outPath;
}
const TOPAZ_FFMPEG = "/Applications/Topaz Video AI.app/Contents/MacOS/ffmpeg";
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

function topazUpscale(inputPath) {
  if (!fs.existsSync(TOPAZ_FFMPEG)) {
    console.warn("[Topaz] Topaz Video AI not found — skipping upscale");
    return inputPath;
  }
  const outPath = inputPath.replace(".mp4", "-topaz.mp4");
  console.log("[Topaz] Upscaling with Proteus (enhance + sharpen)...");
  try {
    execSync(
      `"${TOPAZ_FFMPEG}" -y -i "${inputPath}" -vf "tvai_up=model=ahq-12:scale=1:noise=0.2:details=0.3:blur=0.1:compression=0.3" -c:v h264_videotoolbox -b:v 16M -c:a copy "${outPath}"`,
      { stdio: "inherit", timeout: 10 * 60 * 1000 }
    );
    console.log(`[Topaz] Done → ${path.basename(outPath)}`);
    return outPath;
  } catch (err) {
    console.warn(`[Topaz] Upscale failed: ${err.message.slice(0, 120)} — using original`);
    return inputPath;
  }
}

async function main() {
  const topic = process.argv[2] ?? "how to use AI if you work a 9-to-5 job";
  console.log(`\n[Reel] Topic: "${topic}"`);

  const { caption, videoScript } = await generateCarouselScript(topic);
  console.log(`[Reel] Hook: "${videoScript[0].heading}"`);
  console.log(`[Reel] Caption: "${caption}"`);

  const videoPath = await generateVideo(null, videoScript, "carousel_slide_vertical");

  const musicPath = selectMusicTrack(topic, caption);
  const withMusicPath = mixMusicIntoVideo(videoPath, musicPath);

  const finalVideoPath = topazUpscale(withMusicPath);

  const storageKey = `reels/reel-${Date.now()}.mp4`;
  console.log(`[Reel] Uploading to Supabase...`);
  const videoUrl = await uploadToSupabase(finalVideoPath, storageKey);
  console.log(`[Reel] URL: ${videoUrl}`);

  console.log(`[Reel] Posting to Instagram...`);
  const { mediaId, postUrl } = await postReelToInstagram(videoUrl, caption);
  console.log(`\n[Reel] Live on Instagram: ${postUrl}`);
}

main().catch((err) => {
  console.error(`[Reel] Fatal: ${err.message}`);
  process.exit(1);
});
