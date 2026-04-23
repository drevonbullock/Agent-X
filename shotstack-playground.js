import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { generateCinematicVideo } from "./modules/shotstack-enhance.js";

// ─── CLI USAGE ────────────────────────────────────────────────────────────────
//
//  node shotstack-playground.js                         → render default script
//  node shotstack-playground.js "your topic here"       → generate + render from topic
//  node shotstack-playground.js status <renderId>       → poll an existing render ID
//  node shotstack-playground.js raw                     → show raw Shotstack API info
//
// ─────────────────────────────────────────────────────────────────────────────

const [,, cmd, arg] = process.argv;
const isStatus = cmd === "status";
const isRaw    = cmd === "raw";
const topic    = (!isStatus && !isRaw && cmd) ? cmd : null;

function shotstackKey() {
  return process.env.SHOTSTACK_ENV === "production"
    ? process.env.SHOTSTACK_API_KEY_PROD
    : process.env.SHOTSTACK_API_KEY;
}
function shotstackStage() {
  return process.env.SHOTSTACK_ENV === "production" ? "v1" : "stage";
}

// ─── STATUS POLL ─────────────────────────────────────────────────────────────

async function checkRenderStatus(renderId) {
  const url = `https://api.shotstack.io/edit/${shotstackStage()}/render/${renderId}`;
  const res = await fetch(url, {
    headers: { "x-api-key": shotstackKey(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shotstack poll failed (${res.status}): ${await res.text()}`);
  const { response } = await res.json();
  console.log(`\n[Playground] Render: ${renderId}`);
  console.log(`  Status   : ${response.status}`);
  console.log(`  Stage    : ${shotstackStage()}`);
  if (response.url) console.log(`  URL      : ${response.url}`);
  if (response.error) console.log(`  Error    : ${JSON.stringify(response.error)}`);
  return response;
}

// ─── RAW API INFO ─────────────────────────────────────────────────────────────

async function showRawInfo() {
  const stage = shotstackStage();
  const key   = shotstackKey();

  console.log(`\n[Playground] Shotstack Config`);
  console.log(`  SHOTSTACK_ENV : ${process.env.SHOTSTACK_ENV ?? "not set (defaults to sandbox)"}`);
  console.log(`  Stage         : ${stage}`);
  console.log(`  Key (last 8)  : ...${key?.slice(-8) ?? "MISSING"}`);
  console.log(`  Edit endpoint : https://api.shotstack.io/edit/${stage}/render`);

  // List recent renders
  const url = `https://api.shotstack.io/edit/${stage}/render?limit=5`;
  const res = await fetch(url, {
    headers: { "x-api-key": key, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.log(`\n[Playground] Could not fetch recent renders (${res.status}): ${await res.text()}`);
    return;
  }

  const data = await res.json();
  const renders = data.response?.data ?? [];
  console.log(`\n[Playground] Last ${renders.length} renders:`);
  for (const r of renders) {
    console.log(`  ${r.id} | ${r.status.padEnd(12)} | ${r.created}`);
    if (r.url) console.log(`    → ${r.url}`);
  }
}

// ─── TOPIC → SCRIPT ──────────────────────────────────────────────────────────

async function generateScriptFromTopic(topicText) {
  const client = new Anthropic();
  console.log(`[Playground] Generating video script for: "${topicText}"`);

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Write a 4-screen LinkedIn video script for Drevon Bullock — AI automation builder. Direct, no hype, business owner audience.

Topic: ${topicText}

Return ONLY valid JSON:
{
  "caption": "Short LinkedIn caption hook (1-2 sentences, no hashtags)",
  "videoScript": [
    { "screen": 1, "heading": "Pattern interrupt hook, max 8 words", "body": "" },
    { "screen": 2, "heading": "First point, 5 words", "body": "1-2 sentence explanation." },
    { "screen": 3, "heading": "Second point, 5 words", "body": "1-2 sentence explanation." },
    { "screen": 4, "heading": "Third point, 5 words", "body": "Key takeaway for founders." }
  ]
}`,
    }],
  });

  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── DEFAULT TEST SCRIPT ──────────────────────────────────────────────────────

const DEFAULT_SCRIPT = [
  {
    screen: 1,
    heading: "Most automation advice is completely wrong",
    body: "",
  },
  {
    screen: 2,
    heading: "Tools save time. Systems save roles.",
    body: "A tool is reactive. A system anticipates. One saves minutes. The other removes entire job functions.",
  },
  {
    screen: 3,
    heading: "Your bottleneck is architecture, not effort.",
    body: "Working harder on a broken workflow doesn't scale it. Replacing the workflow does.",
  },
  {
    screen: 4,
    heading: "Build once. Run while you sleep.",
    body: "The business owners winning right now have fewer bottlenecks, not bigger teams.",
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("     SHOTSTACK PLAYGROUND — Agent X");
  console.log(`     Mode: ${process.env.SHOTSTACK_ENV ?? "sandbox"}`);
  console.log("═══════════════════════════════════════════════\n");

  // Status check mode
  if (isStatus) {
    if (!arg) { console.error("Usage: node shotstack-playground.js status <renderId>"); process.exit(1); }
    await checkRenderStatus(arg);
    return;
  }

  // Raw info mode
  if (isRaw) {
    await showRawInfo();
    return;
  }

  // Topic → script → render
  let videoScript = DEFAULT_SCRIPT;
  let caption     = "Most automation advice misses the point. Here's what actually works.";

  if (topic) {
    const generated = await generateScriptFromTopic(topic);
    videoScript = generated.videoScript;
    caption     = generated.caption;
  }

  console.log(`[Playground] Hook: "${videoScript[0].heading}"`);
  console.log(`[Playground] Screens: ${videoScript.length}`);
  console.log(`[Playground] Caption: "${caption}"\n`);

  const { videoUrl, renderId, totalDuration } = await generateCinematicVideo(videoScript);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  RESULT");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Render ID : ${renderId}`);
  console.log(`  Duration  : ${totalDuration}s`);
  console.log(`  Video URL : ${videoUrl}`);
  console.log(`  Caption   : ${caption}`);
  console.log("\nTo post manually:");
  console.log(`  Instagram Reel: node -e "import('./distributors/instagram.js').then(m => m.postReelToInstagram('${videoUrl}', 'caption'))"`)
  console.log(`  Threads video : node -e "import('./distributors/threads.js').then(m => m.postVideoToThreads('${videoUrl}', 'caption'))"`)
}

main().catch((err) => {
  console.error(`[Playground] Fatal: ${err.message}`);
  process.exit(1);
});
