import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import supabase from "../supabase/client.js";
import { generateGeminiImage } from "../images/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BG_IMAGE_PATH = path.resolve(__dirname, "../remotion-videos/public/dre_vertical_v3.png");

const HOLD_AFTER_AUDIO = 1.5;
const MIN_DURATION = 20;
const MAX_DURATION = 25;
const FPS = 25;

const FONT_LINK = "<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap\" rel=\"stylesheet\">";
const BASE_CSS  = "* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }";

// ─── Shotstack API ────────────────────────────────────────────────────────────

function shotstackStage() {
  return process.env.SHOTSTACK_ENV === "production" ? "v1" : "stage";
}

function shotstackKey() {
  return process.env.SHOTSTACK_ENV === "production"
    ? process.env.SHOTSTACK_API_KEY_PROD
    : process.env.SHOTSTACK_API_KEY;
}

function shotstackHeaders() {
  return { "Content-Type": "application/json", "x-api-key": shotstackKey() };
}

async function submitRender(blueprint) {
  const url = `https://api.shotstack.io/edit/${shotstackStage()}/render`;
  const res = await fetch(url, {
    method: "POST",
    headers: shotstackHeaders(),
    body: JSON.stringify(blueprint),
  });
  if (!res.ok) throw new Error(`Shotstack submit failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const renderId = data.response?.id;
  if (!renderId) throw new Error(`Shotstack returned no render ID: ${JSON.stringify(data)}`);
  console.log(`[Shotstack] Render queued: ${renderId}`);
  return renderId;
}

async function pollRender(renderId, maxAttempts = 48) {
  const url = `https://api.shotstack.io/edit/${shotstackStage()}/render/${renderId}`;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(url, { headers: shotstackHeaders() });
    if (!res.ok) continue;
    const { response } = await res.json();
    const status = response?.status;
    const videoUrl = response?.url;
    console.log(`[Shotstack] Status: ${status} (attempt ${i + 1})`);
    if (status === "done" && videoUrl) return videoUrl;
    if (status === "failed") throw new Error(`Shotstack render failed: ${JSON.stringify(response?.error)}`);
  }
  throw new Error("Shotstack render timed out after 4 minutes");
}

// ─── Supabase upload ──────────────────────────────────────────────────────────

async function ensureBucket(bucket) {
  await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      apikey: process.env.SUPABASE_SECRET_KEY,
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  }).catch(() => {});
}

async function uploadToSupabase(buffer, storageKey, mimeType, bucket = "agent-x-images") {
  await ensureBucket(bucket);
  const { error } = await supabase.storage.from(bucket).upload(storageKey, buffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw new Error(`Supabase upload failed (${storageKey}): ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);
  return data.publicUrl;
}

// ─── ElevenLabs voiceover ────────────────────────────────────────────────────

function getAudioDuration(filePath) {
  try {
    const out = execSync(`/usr/bin/afinfo "${filePath}"`, { encoding: "utf8", timeout: 10000 });
    const match = out.match(/estimated duration:\s*([\d.]+)/);
    if (match) return parseFloat(match[1]);
  } catch { /* fallthrough */ }
  return 20;
}

async function callElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set");

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs failed (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

function buildVoiceText(headline, subtext, keyPoints, cta) {
  return [
    headline + ".",
    subtext ? subtext + "." : "",
    ...keyPoints.map((p, i) => `${["First", "Second", "Third"][i] ?? "Next"}. ${p}.`),
    cta + ".",
  ].filter(Boolean).join(" ");
}

// ─── Gemini B-roll ────────────────────────────────────────────────────────────

function brollPrompts(videoScript) {
  const topic = videoScript[0].heading;
  const points = videoScript.slice(1).map((s) => s.heading);
  return [
    `Cinematic dark futuristic scene representing: "${topic}". Moody blue and orange neon, no text, no people, ultra-sharp. Vertical 9:16 composition.`,
    `Abstract cinematic visualization: "${points[0] ?? topic}". Dark background, cyan and orange glow, dramatic depth of field. Vertical 9:16.`,
    `Dark atmospheric concept art: "${points[1] ?? topic}". Futuristic, professional, dramatic lighting, no text. Vertical 9:16 composition.`,
  ];
}

// ─── Blueprint builder ────────────────────────────────────────────────────────

// Small canvas HTML clip — each text track has its own canvas sized to the content.
// Shotstack's slideUp transition animates the canvas into position from below the frame.
function htmlClip({ html, css, canvasW, canvasH, start, length, offsetY, position = "center", transitionIn, transitionOut }) {
  const clip = {
    asset: {
      type: "html",
      html: `${FONT_LINK}${html}`,
      css: `${BASE_CSS} ${css}`,
      width: canvasW,
      height: canvasH,
    },
    start,
    length,
    position,
    offset: { x: 0, y: offsetY ?? 0 },
  };
  const transition = {};
  if (transitionIn) transition.in = transitionIn;
  if (transitionOut) transition.out = transitionOut;
  if (Object.keys(transition).length) clip.transition = transition;
  return clip;
}

// Offset.y calculation: moves clip center UP from video center (960px).
// offset = (960 - targetCenterPx) / 1920
function yOffset(targetCenterPx) {
  return Math.round(((960 - targetCenterPx) / 1920) * 1000) / 1000;
}

function buildBlueprint({ headline, subtext, keyPoints, cta, voiceoverUrl, brollUrls, bgUrl, totalDuration }) {
  const subtextWords = subtext ? subtext.trim().split(/\s+/).length : 0;
  const subtextHold = Math.max(subtextWords / 3, 3);

  return {
    timeline: {
      background: "#1c2433",
      tracks: [

        // ── Track 1: Signature background — slow zoom, full duration ─────────
        {
          clips: [{
            asset: { type: "image", src: bgUrl },
            start: 0,
            length: totalDuration,
            effect: "zoomIn",
            fit: "crop",
            position: "center",
          }],
        },

        // ── Track 2: B-roll images — slide in from different directions ──────
        {
          clips: [
            {
              asset: { type: "image", src: brollUrls[0] },
              start: 0, length: 7,
              effect: "zoomIn", fit: "crop", position: "center",
              opacity: 0.70,
              transition: { in: "slideDown", out: "fade" },
            },
            {
              asset: { type: "image", src: brollUrls[1] },
              start: 7, length: 7,
              effect: "zoomIn", fit: "crop", position: "center",
              opacity: 0.70,
              transition: { in: "slideRight", out: "fade" },
            },
            {
              asset: { type: "image", src: brollUrls[2] },
              start: 14, length: Math.max(totalDuration - 14, 4),
              effect: "zoomIn", fit: "crop", position: "center",
              opacity: 0.70,
              transition: { in: "slideLeft" },
            },
          ],
        },

        // ── Track 3: Voiceover — full duration, fade out at end ──────────────
        {
          clips: [{
            asset: { type: "audio", src: voiceoverUrl, volume: 1.0, effect: "fadeOut" },
            start: 0,
            length: totalDuration,
          }],
        },

        // ── Track 4: Background music — low volume, fade out ─────────────────
        {
          clips: [{
            asset: {
              type: "audio",
              src: "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/freepd/fireworks.mp3",
              volume: 0.12,
              effect: "fadeOut",
            },
            start: 0,
            length: totalDuration,
          }],
        },

        // ── Track 5: Headline — slides up at 0.5s, holds 4s ─────────────────
        {
          clips: [htmlClip({
            html: `<p class="h">${headline}</p>`,
            css: `.h { font-size: 68px; font-weight: 800; color: #ffffff; text-align: center; line-height: 1.2; padding: 0 40px; }`,
            canvasW: 1000, canvasH: 220,
            start: 0.5, length: 4,
            offsetY: yOffset(450),    // upper third ~400-500px from top
            transitionIn: "slideUp", transitionOut: "fade",
          })],
        },

        // ── Track 6: Accent line — slides up at 1.2s, stays for 8s ──────────
        {
          clips: [htmlClip({
            html: `<div class="line"></div>`,
            css: `.line { width: 120px; height: 3px; background: #00D2FF; border-radius: 2px; margin: 0 auto; }`,
            canvasW: 200, canvasH: 12,
            start: 1.2, length: 8,
            offsetY: yOffset(620),    // just below headline
            transitionIn: "slideUp", transitionOut: "fade",
          })],
        },

        // ── Track 7: Subtext — slides up at 2s, holds for reading time ───────
        {
          clips: subtext ? [htmlClip({
            html: `<p class="sub">${subtext}</p>`,
            css: `.sub { font-size: 32px; font-weight: 400; color: #B4C8DA; text-align: center; line-height: 1.5; padding: 0 60px; }`,
            canvasW: 960, canvasH: 180,
            start: 2, length: Math.round(subtextHold * 10) / 10,
            offsetY: yOffset(760),    // below accent line
            transitionIn: "slideUp", transitionOut: "fade",
          })] : [],
        },

        // ── Track 8: Key points — slide up one by one every 4s ───────────────
        {
          clips: keyPoints.slice(0, 3).map((point, i) => htmlClip({
            html: `<div class="card"><p>${point}</p></div>`,
            css: `.card { border-left: 4px solid #00D2FF; background: rgba(0,0,0,0.5); padding: 18px 22px; border-radius: 0 8px 8px 0; } p { font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.4; }`,
            canvasW: 920, canvasH: 110,
            start: 5 + i * 4,
            length: 4,
            offsetY: yOffset(900 + i * 160),   // stacked vertically: 900, 1060, 1220px
            transitionIn: "slideUp", transitionOut: "fade",
          })),
        },

        // ── Track 9: CTA — slides up at 18s ──────────────────────────────────
        {
          clips: [htmlClip({
            html: `<p class="cta">${cta}</p>`,
            css: `.cta { font-size: 34px; font-weight: 800; color: #00D2FF; text-align: center; line-height: 1.4; padding: 0 60px; }`,
            canvasW: 900, canvasH: 130,
            start: 18,
            length: Math.max(totalDuration - 18, 2),
            offsetY: yOffset(1640),   // near bottom ~85% from top
            transitionIn: "slideUp",
          })],
        },

        // ── Track 10: Watermark — full duration, no transition ────────────────
        {
          clips: [htmlClip({
            html: `<p class="wm">DRE'VON BULLOCK</p>`,
            css: `.wm { font-size: 18px; font-weight: 700; letter-spacing: 0.2em; color: rgba(180,200,218,0.4); text-transform: uppercase; }`,
            canvasW: 380, canvasH: 40,
            start: 0,
            length: totalDuration,
            position: "bottomLeft",
            offsetY: 0.04,
          })],
        },

      ],
    },
    output: {
      format: "mp4",
      size: { width: 1080, height: 1920 },
      fps: FPS,
    },
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateCinematicVideo(videoScript) {
  console.log("[Shotstack] ─── Cinematic video pipeline starting ───");

  const headline = videoScript[0].heading;
  const subtext  = videoScript[0].body || "";
  const keyPoints = videoScript.slice(1).map((s) =>
    s.body ? `${s.heading}. ${s.body}` : s.heading
  );
  const cta = "Comment AUTOMATE below for my free AI systems guide";

  // 1. Generate + upload voiceover
  console.log("[Shotstack] Step 1: Generating ElevenLabs voiceover...");
  const voiceText = buildVoiceText(headline, subtext, keyPoints, cta);
  const voiceBuffer = await callElevenLabs(voiceText);

  const tmpPath = path.join("/tmp", `shotstack-voice-${Date.now()}.mp3`);
  fs.writeFileSync(tmpPath, voiceBuffer);
  const audioDuration = getAudioDuration(tmpPath);
  fs.unlinkSync(tmpPath);

  const totalDuration = Math.round(
    Math.min(Math.max(audioDuration + HOLD_AFTER_AUDIO, MIN_DURATION), MAX_DURATION) * 10
  ) / 10;
  console.log(`[Shotstack] Audio: ${audioDuration.toFixed(1)}s → video locked to ${totalDuration}s`);

  const voiceKey = `shotstack/voice-${Date.now()}.mp3`;
  const voiceUrl = await uploadToSupabase(voiceBuffer, voiceKey, "audio/mpeg", "agent-x-videos");
  console.log(`[Shotstack] Voiceover uploaded: ${voiceUrl}`);

  // 2. Upload background image
  console.log("[Shotstack] Step 2: Uploading background image...");
  const bgBuffer = fs.readFileSync(BG_IMAGE_PATH);
  const bgUrl = await uploadToSupabase(bgBuffer, "shotstack/dre_vertical_v3.png", "image/png");
  console.log(`[Shotstack] Background ready: ${bgUrl}`);

  // 3. Generate + upload 3 Gemini B-roll images
  console.log("[Shotstack] Step 3: Generating 3 Gemini B-roll images...");
  const prompts = brollPrompts(videoScript);
  const brollUrls = [];
  for (let i = 0; i < 3; i++) {
    console.log(`[Shotstack] B-roll ${i + 1}/3: ${prompts[i].slice(0, 60)}...`);
    const imgBuffer = await generateGeminiImage(prompts[i]);
    const imgKey = `shotstack/broll-${Date.now()}-${i}.jpg`;
    const imgUrl = await uploadToSupabase(imgBuffer, imgKey, "image/jpeg");
    brollUrls.push(imgUrl);
    console.log(`[Shotstack] B-roll ${i + 1} ready: ${imgUrl}`);
  }

  // 4. Build blueprint + submit render
  console.log("[Shotstack] Step 4: Building blueprint and submitting render...");
  const blueprint = buildBlueprint({ headline, subtext, keyPoints, cta, voiceoverUrl: voiceUrl, brollUrls, bgUrl, totalDuration });
  const renderId = await submitRender(blueprint);

  // 5. Poll until done
  console.log("[Shotstack] Step 5: Polling render (5s intervals, max 4 min)...");
  const videoUrl = await pollRender(renderId);
  console.log(`[Shotstack] ✓ Render complete: ${videoUrl}`);

  return { videoUrl, renderId, totalDuration, voiceUrl, brollUrls };
}
