import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const client = new Anthropic();


const CLIP_SELECTOR_SYSTEM = `You are a short-form video editor.
Given a YouTube video transcript, identify the 8 most clip-worthy moments.
Each clip should be: surprising, educational, emotionally resonant, or controversial.
Every clip must be able to stand alone — no context needed from the surrounding video.

Return a JSON array of exactly 8 objects. Each must have:
  start_time (string, "MM:SS"),
  end_time (string, "MM:SS"),
  hook (string — the opening line that makes someone stop scrolling, max 10 words),
  clip_text (string — the verbatim transcript text for this clip),
  why_it_works (string — one sentence explaining the clip's appeal)

Return ONLY valid JSON. No markdown fences, no explanation.`;

const CAPTION_SYSTEM = `You are writing short-form social captions as Dre'von Bullock.
Given a video clip transcript, write a caption for TikTok/Reels/Shorts.
Voice: direct, confident, conversational. Not a LinkedIn thought leader.
Max 150 characters. Include 2-3 relevant hashtags.
Return only the caption text, nothing else.`;

// ─── TRANSCRIPT FETCH ────────────────────────────────────────────────────────
// Uses OpenAI Whisper via the audio download route.
// For YouTube, we use yt-dlp to extract audio, then Whisper to transcribe.

async function downloadAudio(youtubeUrl, outputPath) {
  const { execSync } = await import("child_process");
  try {
    execSync(`yt-dlp -x --audio-format mp3 -o "${outputPath}" "${youtubeUrl}"`, {
      stdio: "pipe",
      timeout: 120000,
    });
  } catch (err) {
    throw new Error(`yt-dlp failed: ${err.message}`);
  }
}

async function transcribeWithWhisper(audioPath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set in .env");

  const formData = new FormData();
  const audioBlob = new Blob([fs.readFileSync(audioPath)], { type: "audio/mpeg" });
  formData.append("file", audioBlob, path.basename(audioPath));
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.text ?? "";
}

// ─── CLIP SELECTION ──────────────────────────────────────────────────────────

async function selectClips(transcript) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: CLIP_SELECTOR_SYSTEM,
    messages: [{ role: "user", content: `Full transcript:\n\n${transcript}` }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── FFMPEG VIDEO CUTTING ────────────────────────────────────────────────────

function cutClipWithFfmpeg(sourceVideoPath, startTime, endTime, outputLabel) {
  const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";
  const toSeconds = (t) => {
    const [m, s] = t.split(":").map(Number);
    return m * 60 + s;
  };
  const start = toSeconds(startTime);
  const end   = toSeconds(endTime);

  fs.mkdirSync("generated_imgs", { recursive: true });
  const outPath = path.resolve(`generated_imgs/yt-clip-${outputLabel}-${Date.now()}.mp4`);

  execSync(
    `${ffmpeg} -y -ss ${start} -to ${end} -i "${sourceVideoPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -crf 22 -preset fast -c:a aac "${outPath}"`,
    { stdio: "pipe", timeout: 120000 }
  );

  console.log(`[YouTubeCutter] Clip saved: ${outPath}`);
  return outPath;
}

// ─── CAPTION GENERATION ──────────────────────────────────────────────────────

async function generateCaption(clip) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: CAPTION_SYSTEM,
    messages: [{ role: "user", content: `Clip text: "${clip.clip_text.slice(0, 400)}"` }],
  });
  return msg.content[0].text.trim();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export async function processYouTubeVideo(youtubeUrl) {
  const { execSync: exec } = await import("child_process");
  console.log(`[YouTubeCutter] Processing: ${youtubeUrl}`);

  // 1. Download audio for transcription
  const tmpAudio = `/tmp/agentx-yt-${Date.now()}.mp3`;
  console.log(`[YouTubeCutter] Downloading audio...`);
  await downloadAudio(youtubeUrl, tmpAudio);

  // 2. Transcribe
  console.log(`[YouTubeCutter] Transcribing with Whisper...`);
  const transcript = await transcribeWithWhisper(tmpAudio);
  console.log(`[YouTubeCutter] Transcript: ${transcript.length} characters`);
  try { fs.unlinkSync(tmpAudio); } catch { /* ignore */ }

  // 3. Select 8 clips via Claude
  console.log(`[YouTubeCutter] Selecting 8 clip moments...`);
  const clips = await selectClips(transcript);
  console.log(`[YouTubeCutter] Selected ${clips.length} clips`);

  // 4. Download full video for local ffmpeg cutting
  const tmpVideo = `/tmp/agentx-yt-vid-${Date.now()}.mp4`;
  console.log(`[YouTubeCutter] Downloading video for local cutting...`);
  try {
    exec(`yt-dlp -f "best[ext=mp4]" -o "${tmpVideo}" "${youtubeUrl}"`, {
      stdio: "pipe",
      timeout: 300000,
    });
  } catch (err) {
    console.warn(`[YouTubeCutter] Video download failed: ${err.message}. Clips will be skipped.`);
  }

  // 5. Generate captions + cut clips with ffmpeg
  const results = [];
  for (const clip of clips) {
    const caption = await generateCaption(clip).catch(() => clip.hook);
    let clipPath = null;

    if (fs.existsSync(tmpVideo)) {
      try {
        clipPath = cutClipWithFfmpeg(tmpVideo, clip.start_time, clip.end_time, `clip-${results.length + 1}`);
        console.log(`[YouTubeCutter] Clip ${results.length + 1} cut: ${clip.start_time}–${clip.end_time}`);
      } catch (err) {
        console.error(`[YouTubeCutter] ffmpeg cut failed for clip ${results.length + 1}: ${err.message}`);
      }
    }

    results.push({
      clip_number: results.length + 1,
      start_time: clip.start_time,
      end_time: clip.end_time,
      hook: clip.hook,
      caption,
      why_it_works: clip.why_it_works,
      clip_path: clipPath,
    });
  }

  try { fs.unlinkSync(tmpVideo); } catch { /* ignore */ }

  const output = {
    processed_at: new Date().toISOString(),
    source_url: youtubeUrl,
    transcript_length: transcript.length,
    clips: results,
  };

  const outPath = `generated_imgs/youtube-clips-${Date.now()}.json`;
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[YouTubeCutter] Done. ${results.length} clips cut → ${outPath}`);
  return output;
}

// CLI: node modules/youtube-cutter.js https://youtube.com/watch?v=...
const isMain = process.argv[1]?.endsWith("youtube-cutter.js");
if (isMain) {
  const url = process.argv[2];
  if (!url) { console.error("Usage: node modules/youtube-cutter.js <youtube-url>"); process.exit(1); }
  processYouTubeVideo(url).catch((err) => { console.error(`[YouTubeCutter] Fatal: ${err.message}`); process.exit(1); });
}
