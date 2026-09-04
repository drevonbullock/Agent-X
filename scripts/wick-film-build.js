import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// ─── BUILD ONE EXPLAINER FILM ────────────────────────────────────────────────
// Dre, 2026-09-04: the pipeline is script → storyboard → illustrations and
// animations → sfx. This runs stages 2 onward from data/explainer-*.json; the
// script and storyboard are authored, not generated, because a 100-second film
// carries one argument and that is worth writing by hand.
//
// STAGES, each independently skippable so the film can be assembled in passes
// as budget allows:
//   --vo      ElevenLabs narration per shot, measured, timing written back
//   --sfx     ElevenLabs sound effects per cue (generated once, reused)
//   --art     Higgsfield illustrations for every still shot   (~2 credits each)
//   --clips   Seedance image-to-video for motion:"video" shots (~32.5 each)
//   --render  Remotion assembly
//
// With no flags it reports the plan and its cost and spends nothing.

const FILM = process.argv[2]?.endsWith(".json") ? process.argv[2] : "data/explainer-paycheck.json";
const has = (f) => process.argv.includes(`--${f}`);
const VIDEO_DIR = path.join(process.cwd(), "wick-video");
const PUB = path.join(VIDEO_DIR, "public");
const FFPROBE = process.platform === "darwin" ? "/opt/homebrew/bin/ffprobe" : "/usr/bin/ffprobe";
const HF = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");

const film = JSON.parse(fs.readFileSync(FILM, "utf8"));
const secs = (f) => parseFloat(execFileSync(FFPROBE,
  ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

// The locked style stack, so film art matches the feed. Same element ID the
// carousel pipeline uses — that is what keeps the character on-model.
const EL = process.env.WICK_ELEMENT_ID || "5e934732-6de4-438a-b3a6-024144603518";
const STYLE =
  "Polished cinematic 3D cartoon. Smooth dimensional shading, soft wax texture, glossy golden " +
  "highlights, warm rim lighting, subtle glow around the flame head, crisp edges, premium " +
  "animated mascot quality, clearly cartoon and not photorealistic. Deep vignette at the frame " +
  "edges. CRITICAL: absolutely no text, no letters, no numbers, no words, no logos, no signage " +
  "and no writing of any kind anywhere in the image. Every screen, paper, sign and display must " +
  "be completely blank.";
const FRAMING =
  " FRAMING: his COMPLETE body, flame head to feet, sits within the MIDDLE of the frame with " +
  "clear empty space along the bottom third, because large text is placed there afterwards. " +
  "Nothing stands between him and the camera.";

async function vo() {
  const KEY = process.env.ELEVENLABS_API_KEY, VOICE = process.env.ELEVENLABS_VOICE_ID;
  if (!KEY || !VOICE) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID required");
  const dir = path.join(PUB, "vo"); fs.mkdirSync(dir, { recursive: true });
  for (const s of film.shots) {
    const f = path.join(dir, `${s.id}.mp3`);
    if (!fs.existsSync(f)) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
        method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text: s.vo, model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.28, use_speaker_boost: true } }),
      });
      if (!r.ok) throw new Error(`TTS ${s.id}: ${r.status}`);
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    }
    // Shot length = narration + a beat of air, so the cut lands after the line.
    s.frames = Math.ceil((secs(f) + 0.85) * 30);
    console.log(`[vo]  ${s.id} ${(s.frames / 30).toFixed(1)}s  ${s.vo.slice(0, 56)}`);
  }
  film.hasVoice = true;
}

// One file per distinct cue, generated once and reused across shots.
async function sfx() {
  const KEY = process.env.ELEVENLABS_API_KEY;
  const dir = path.join(PUB, "sfx"); fs.mkdirSync(dir, { recursive: true });
  const CUES = {
    low_drone: "a low soft cinematic drone swell, dark and quiet, 2 seconds",
    paper:     "soft paper rustle, a few sheets shifting, 1 second",
    whoosh:    "a short clean cinematic whoosh transition, 1 second",
    thud:      "a soft deep impact thud, muted, 1 second",
    tick:      "a small mechanical tick tick tick, three light clicks, 1 second",
    coin:      "a single small coin landing on a hard surface, 1 second",
    drop:      "a soft hollow water drop with a little reverb, 1 second",
    ding:      "a clean soft bell ding, bright and short, 1 second",
    chime:     "a gentle positive two note chime, warm, 2 seconds",
    rise:      "a soft uplifting riser swell, warm and hopeful, 2 seconds",
  };
  for (const [name, prompt] of Object.entries(CUES)) {
    const f = path.join(dir, `${name}.mp3`);
    if (fs.existsSync(f)) continue;
    const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt, duration_seconds: 2 }),
    });
    if (!r.ok) { console.warn(`[sfx] ${name} failed ${r.status} — shot will play dry`); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log(`[sfx] ${name}`);
  }
  film.hasSfx = true;
}

// Illustrations. Element-locked so the character cannot drift.
async function art() {
  const dir = path.join(PUB, "art"); fs.mkdirSync(dir, { recursive: true });
  for (const s of film.shots) {
    if (!s.art || s.motion === "diagram") continue;
    const out = path.join(dir, `${s.id}.jpg`);
    if (fs.existsSync(out)) { s.asset = `art/${s.id}.jpg`; continue; }
    const prompt = `<<<${EL}>>> ${s.art} ${STYLE}${FRAMING}`;
    console.log(`[art] ${s.id} generating…`);
    const raw = execFileSync(HF, ["generate", "create", process.env.WICK_IMAGE_MODEL || "nano_banana_pro",
      "--prompt", prompt, "--aspect_ratio", "9:16", "--resolution", "2k",
      "--wait", "--wait-timeout", "12m", "--json"],
      { timeout: 15 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 }).toString();
    const j = JSON.parse(raw); const job = Array.isArray(j) ? j[0] : j;
    const url = job.result_url ?? job.min_result_url;
    if (!url) { console.warn(`[art] ${s.id} returned no url — placeholder stays`); continue; }
    const res = await fetch(url);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    s.asset = `art/${s.id}.jpg`;
    console.log(`[art] ${s.id} ✓`);
  }
}

// Motion shots: image-to-video off the shot's OWN illustration, so the clip
// animates an approved frame rather than inventing the character again.
async function clips() {
  const dir = path.join(PUB, "clips"); fs.mkdirSync(dir, { recursive: true });
  for (const s of film.shots.filter((x) => x.motion === "video")) {
    const out = path.join(dir, `${s.id}.mp4`);
    if (fs.existsSync(out)) { s.asset = `clips/${s.id}.mp4`; continue; }
    const still = path.join(PUB, "art", `${s.id}.jpg`);
    if (!fs.existsSync(still)) { console.warn(`[clip] ${s.id} needs its illustration first — run --art`); continue; }
    console.log(`[clip] ${s.id} — 32.5 credits`);
    // NOTE: the CLI path is used so this matches the rest of the pipeline's auth.
    const raw = execFileSync(HF, ["generate", "create", "seedance_2_5",
      "--prompt", "Very subtle motion only. The character stays exactly as he is with no change to his design. Gentle flame flicker and a slow camera push. No text anywhere.",
      "--image", still, "--aspect_ratio", "9:16", "--duration", "5",
      "--wait", "--wait-timeout", "15m", "--json"],
      { timeout: 20 * 60 * 1000, maxBuffer: 40 * 1024 * 1024 }).toString();
    const j = JSON.parse(raw); const job = Array.isArray(j) ? j[0] : j;
    const url = job.result_url ?? job.min_result_url;
    if (!url) { console.warn(`[clip] ${s.id} no url — falls back to its still`); continue; }
    const res = await fetch(url);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    s.asset = `clips/${s.id}.mp4`;
  }
}

function plan() {
  const stills = film.shots.filter((s) => s.art && s.motion !== "diagram" && !s.asset).length;
  const vids = film.shots.filter((s) => s.motion === "video" && !String(s.asset ?? "").endsWith(".mp4")).length;
  const secsTotal = film.shots.reduce((a, s) => a + (s.frames ?? 105), 0) / 30;
  console.log(`\n  ${film.title}`);
  console.log(`  ${film.shots.length} shots, ~${secsTotal.toFixed(0)}s, ${film.chapters.length} chapters`);
  console.log(`  illustrations to generate : ${stills}  (~${stills * 2} credits)`);
  console.log(`  animated shots to generate: ${vids}  (~${vids * 32.5} credits)`);
  console.log(`  TOTAL HIGGSFIELD          : ~${stills * 2 + vids * 32.5} credits`);
  console.log(`  voice + sfx               : ElevenLabs, well under $1`);
  console.log(`  assembly                  : free\n`);
  console.log(`  stages: --vo --sfx --art --clips --render (combine freely)\n`);
}

async function main() {
  if (has("vo")) await vo();
  if (has("sfx")) await sfx();
  if (has("art")) await art();
  if (has("clips")) await clips();

  const propsFile = path.join(VIDEO_DIR, "props-film.json");
  fs.writeFileSync(propsFile, JSON.stringify(film, null, 1));
  fs.writeFileSync(FILM, JSON.stringify(film, null, 1));

  if (has("render")) {
    const out = path.join(VIDEO_DIR, "out", `film-${film.id}.mp4`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    console.log(`\n[render] → ${out}`);
    execFileSync("npx", ["remotion", "render", "src/index.ts", "ExplainerFilm", out,
      "--props", propsFile, "--codec=h264", "--log=error"],
      { cwd: VIDEO_DIR, stdio: "inherit", timeout: 30 * 60 * 1000 });
    console.log(`[render] done: ${Math.round(fs.statSync(out).size / 1024)}KB`);
  }
  plan();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
