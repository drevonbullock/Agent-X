import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// ─── NARRATION FOR EXPLAINERS ────────────────────────────────────────────────
// Dre, 2026-09-04: "add voice overs, make it look like a youtube explainer."
//
// A YouTube explainer is PACED BY ITS NARRATOR, not by a fixed frame count. So
// this renders one line per scene, measures each clip's real duration with
// ffprobe, and writes those durations back into the props — the composition
// then sizes every scene to its own narration instead of guessing. That is the
// difference between a video with audio bolted on and one that is actually cut
// to voice.
//
//   node scripts/wick-voiceover.js wick-video/props-explainer.json

const FFPROBE = process.platform === "darwin" ? "/opt/homebrew/bin/ffprobe" : "/usr/bin/ffprobe";
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const KEY = process.env.ELEVENLABS_API_KEY;
const OUT = path.join(process.cwd(), "wick-video", "public", "vo");

const seconds = (f) =>
  parseFloat(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", f]).toString().trim());

async function say(text, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      // Explainer delivery: high stability so the read is even and calm rather
      // than performed, a little style so it is not flat.
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 140)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return seconds(file);
}

async function main() {
  if (!KEY || !VOICE) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  const propsFile = process.argv[2] ?? "wick-video/props-explainer.json";
  const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
  fs.mkdirSync(OUT, { recursive: true });

  // One line per section. narration falls back to the visible copy so a scene
  // is never silent just because nobody wrote a separate script for it.
  const lines = [
    { key: "title", text: props.narration?.title ?? `${props.title}. ${props.subtitle}` },
    ...props.scenes.map((s, i) => ({ key: `s${i}`, text: props.narration?.scenes?.[i] ?? s.caption })),
    { key: "close", text: props.narration?.close ?? props.closing },
  ];

  const durations = {};
  for (const l of lines) {
    const f = path.join(OUT, `${l.key}.mp3`);
    const d = await say(l.text, f);
    durations[l.key] = d;
    console.log(`[VO] ${l.key.padEnd(6)} ${d.toFixed(1)}s  "${l.text.slice(0, 62)}"`);
  }

  // Scenes are sized to their narration plus a beat of air on each end, so the
  // cut lands after the sentence rather than under it.
  const PAD = 1.1;
  props.timing = {
    title: Math.ceil((durations.title + PAD) * 30),
    scenes: props.scenes.map((_, i) => Math.ceil((durations[`s${i}`] + PAD) * 30)),
    close: Math.ceil((durations.close + PAD) * 30),
  };
  props.hasVoice = true;
  fs.writeFileSync(propsFile, JSON.stringify(props, null, 1));

  const total = Object.values(props.timing).flat().reduce((a, b) => a + b, 0);
  console.log(`\n[VO] ${lines.length} clips, video is now ${(total / 30).toFixed(1)}s, cut to voice`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
