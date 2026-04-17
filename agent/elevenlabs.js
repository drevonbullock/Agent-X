import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PUBLIC_DIR = path.resolve("remotion-videos/public");
const FPS = 30;

// Extra seconds held on screen AFTER the voiceover finishes before cutting to next slide.
const HOLD_AFTER_AUDIO = 1.2;

// Get actual duration of an MP3 file using macOS afinfo.
// Falls back to word-count estimate if afinfo fails.
function getAudioDuration(filePath, fallbackText) {
  try {
    const output = execSync(`/usr/bin/afinfo "${filePath}"`, {
      encoding: "utf8",
      timeout: 10000,
    });
    const match = output.match(/estimated duration:\s*([\d.]+)/);
    if (match) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds) && seconds > 0) return Math.round(seconds * 10) / 10;
    }
  } catch { /* fall through */ }

  // Fallback: conservative estimate — 2.2 words/sec + 1.0s buffer
  const words = fallbackText.trim().split(/\s+/).length;
  return Math.round((words / 2.2 + 1.0) * 10) / 10;
}

async function callElevenLabs(text, apiKey, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${errBody}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

const NUMBER_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// Build the exact text the voice reads for a given screen.
// For list_countdown style, teaching screens are prefixed with the spoken countdown number.
// countdownNumber: the number displayed on screen (e.g. 3, 2, 1) — only passed for list_countdown.
function buildScreenText(screen, countdownNumber) {
  const h = screen.heading.replace(/[.!?]+$/, "").trim();
  const b = screen.body ? screen.body.trim() : "";

  if (screen.screen === 1) {
    // Hook screen: heading only, punchy, one sentence
    return `${h}.`;
  }

  // list_countdown teaching screens: "Three. Heading. Body."
  if (countdownNumber != null) {
    const word = NUMBER_WORDS[countdownNumber - 1] ?? String(countdownNumber);
    return b ? `${word}. ${h}. ${b}` : `${word}. ${h}.`;
  }

  // All other styles: "Heading. Body sentence."
  return b ? `${h}. ${b}` : `${h}.`;
}

// ─── SINGLE SCREEN ───────────────────────────────────────────────────────────
// Generates a single MP3 for one screen.
// countdownNumber: pass the displayed countdown integer for list_countdown screens (e.g. 3, 2, 1).
// Returns { path: 'public/voice_1.mp3', durationSeconds: 6.2 } or null on failure.
export async function generateVoiceoverForScreen(screen, countdownNumber) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.warn("[ElevenLabs] Credentials not set — skipping voiceover");
    return null;
  }

  const text = buildScreenText(screen, countdownNumber);
  const outputFile = `voice_${screen.screen}.mp3`;
  const outputPath = path.join(PUBLIC_DIR, outputFile);

  try {
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    const buffer = await callElevenLabs(text, apiKey, voiceId);
    fs.writeFileSync(outputPath, buffer);

    // Read actual audio duration, then add hold time so the slide doesn't cut mid-sentence.
    const audioDuration = getAudioDuration(outputPath, text);
    // Hook screen: short punch — cap hold at 0.4s after audio. Teaching screens: full 1.2s hold.
    const hold = screen.screen === 1 ? 0.4 : HOLD_AFTER_AUDIO;
    const durationSeconds = Math.round((audioDuration + hold) * 10) / 10;

    console.log(`[Agent X] Screen ${screen.screen} audio: ${outputFile} (${audioDuration.toFixed(1)}s audio + ${hold}s hold = ${durationSeconds.toFixed(1)}s)`);
    return { path: `public/${outputFile}`, durationSeconds };
  } catch (err) {
    console.error(`[ElevenLabs] Screen ${screen.screen} failed: ${err.message}`);
    return null;
  }
}

// ─── FULL SCRIPT ─────────────────────────────────────────────────────────────
// Generates one MP3 per screen in the video script.
// videoStyle: pass "list_countdown" to prefix each teaching screen with its spoken number.
// Returns array: [{ screen: 1, path: 'public/voice_1.mp3', durationSeconds: 2.5, hasAudio: true }, ...]
export async function generateAllVoiceovers(videoScript, videoStyle) {
  const results = [];
  const isCountdown = videoStyle === "list_countdown";
  // Teaching screens = all screens after the hook (screen index > 0)
  const teachingScreens = videoScript.slice(1);
  const teachingCount = teachingScreens.length;

  for (const screen of videoScript) {
    // Determine countdown number for this screen (null for hook or non-countdown styles)
    let countdownNumber = null;
    if (isCountdown && screen.screen !== 1) {
      const teachingIndex = teachingScreens.findIndex((s) => s.screen === screen.screen);
      countdownNumber = teachingCount - teachingIndex; // 3 → 2 → 1
    }

    const result = await generateVoiceoverForScreen(screen, countdownNumber);

    if (result) {
      results.push({
        screen: screen.screen,
        path: result.path,
        durationSeconds: result.durationSeconds,
        hasAudio: true,
      });
    } else {
      // Fallback: no audio, default duration
      const fallback = screen.screen === 1 ? 2.5 : 6.0;
      results.push({
        screen: screen.screen,
        path: null,
        durationSeconds: fallback,
        hasAudio: false,
      });
    }
  }

  return results;
}

// Kept for backward compatibility — not used in per-screen flow
export async function generateVoiceover() {
  console.warn("[ElevenLabs] generateVoiceover() is deprecated — use generateAllVoiceovers()");
  return null;
}
