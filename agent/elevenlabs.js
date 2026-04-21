import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PUBLIC_DIR = path.resolve("remotion-videos/public");
const FPS = 30;

// Breathing room after voiceover finishes before cutting to next slide.
const HOLD_AFTER_AUDIO = 0.8;

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

// Returns { buffer, wordTimestamps: [{word, startTime}] }
async function callElevenLabs(text, apiKey, voiceId) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  const buffer = Buffer.from(json.audio_base64, "base64");

  // Parse character-level alignment into word timestamps
  const wordTimestamps = [];
  const chars  = json.alignment?.characters ?? [];
  const starts = json.alignment?.character_start_times_seconds ?? [];
  let wordChars = [];
  let wordStart = null;

  for (let i = 0; i < chars.length; i++) {
    if (/\w/.test(chars[i])) {
      if (wordStart === null) wordStart = starts[i];
      wordChars.push(chars[i]);
    } else if (wordChars.length > 0) {
      wordTimestamps.push({ word: wordChars.join("").toLowerCase(), startTime: wordStart });
      wordChars = [];
      wordStart = null;
    }
  }
  if (wordChars.length > 0) {
    wordTimestamps.push({ word: wordChars.join("").toLowerCase(), startTime: wordStart });
  }

  return { buffer, wordTimestamps };
}

const NUMBER_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// Build the exact text the voice reads for a given screen.
// For list_countdown style, teaching screens are prefixed with the spoken countdown number.
// countdownNumber: the number displayed on screen (e.g. 3, 2, 1) — only passed for list_countdown.
function buildScreenText(screen, countdownNumber) {
  const h = screen.heading.replace(/[.!?]+$/, "").trim();
  const b = screen.points
    ? screen.points.filter(Boolean).join(" ")
    : (screen.body ? screen.body.trim() : "");

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

    const { buffer, wordTimestamps } = await callElevenLabs(text, apiKey, voiceId);
    fs.writeFileSync(outputPath, buffer);

    const audioDuration = getAudioDuration(outputPath, text);
    const bodyText = screen.points ? screen.points.join(' ') : (screen.body || '');
    const displayWords = ((screen.heading || '') + ' ' + bodyText).trim().split(/\s+/).filter(Boolean).length;
    const readFloor = displayWords / 3;
    const minFloor = screen.screen === 1 ? 2.5 : 3.5;
    const durationSeconds = Math.round(Math.max(audioDuration + HOLD_AFTER_AUDIO, readFloor, minFloor) * 10) / 10;

    console.log(`[Agent X] Screen ${screen.screen} audio: ${outputFile} (${audioDuration.toFixed(1)}s audio → ${durationSeconds.toFixed(1)}s screen)`);
    return { path: `public/${outputFile}`, durationSeconds, wordTimestamps };
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
        wordTimestamps: result.wordTimestamps ?? [],
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
