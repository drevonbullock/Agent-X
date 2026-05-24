/**
 * Full pipeline test: 3 Instagram posts + 1 video
 * Topic: OpenAI's lawsuit with Elon Musk
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

fs.mkdirSync("generated_imgs", { recursive: true });

// ─── SHARED TOPIC ─────────────────────────────────────────────────────────────
const POST_TEXT = `OpenAI just dismissed Elon Musk's breach of contract lawsuit. The judge threw out his core claim that OpenAI betrayed its non-profit mission by going commercial. Elon left the board in 2018. Sam Altman stayed and built a $157 billion company. Who was right?`;

// ─── TEST 1: BOARDROOM — Instagram Vertical ───────────────────────────────────
async function testBoardroom() {
  console.log("\n[Test 1] Boardroom (Instagram vertical)...");
  const { renderVerticalBoardroom } = await import("./images/render-boardroom.js");

  const script = {
    title: "The Boardroom",
    episode: "The Elon Trial",
    panels: [
      {
        panel: 1,
        character: "NOISE",
        dialogue: "OpenAI BETRAYED its mission!",
        action: "Elon waves 500 pages of lawsuit at the judge"
      },
      {
        panel: 2,
        character: "SIGNAL",
        dialogue: "You left the board in 2018 tho.",
        action: "Sam sips coffee, doesn't look up"
      },
      {
        panel: 3,
        character: "NOISE",
        dialogue: "THE JUDGE DISMISSED WHAT?!",
        action: "Papers explode everywhere. Tie fully undone."
      },
      {
        panel: 4,
        character: "SIGNAL",
        dialogue: "Told you.",
        action: null
      },
      {
        panel: 5,
        character: "NOISE",
        dialogue: "I'll refile. I'll always refile!!",
        action: "Sweat drops. Papers on fire."
      },
    ],
  };

  const buf = await renderVerticalBoardroom(script);
  const outPath = "generated_imgs/test-ig-boardroom.png";
  fs.writeFileSync(outPath, buf);
  console.log(`[Test 1] ✓ Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

// ─── TEST 2: CHEATSHEET — Instagram Vertical ──────────────────────────────────
async function testCheatsheet() {
  console.log("\n[Test 2] Cheatsheet (Instagram vertical)...");
  const { renderVerticalCheatsheet } = await import("./images/render-cheatsheet.js");
  const { generateGeminiImage }      = await import("./images/gemini.js");

  const content = {
    title: "OpenAI vs Elon",
    subtitle: "The $157B lawsuit explained",
    sections: [
      {
        heading: "Elon's Claims",
        color: "#ef4444",
        points: [
          "OpenAI abandoned its non-profit mission",
          "Microsoft deal was a betrayal of founders",
          "Altman violated the original agreement",
          "Asked the court to block IPO plans",
        ],
      },
      {
        heading: "OpenAI's Response",
        color: "#00B4D8",
        points: [
          "Elon left the board voluntarily in 2018",
          "He knew about the commercial pivot",
          "He wanted majority control — refused",
          "Judge dismissed the breach of contract claim",
        ],
      },
      {
        heading: "What It Means",
        color: "#FF6B00",
        points: [
          "OpenAI's IPO path is clearer now",
          "Elon refiled — battle continues",
          "AI governance is now a legal battlefield",
          "Founders who leave lose their say",
        ],
      },
    ],
    footer: "@DrevonBullock · Bullock Consulting Group",
  };

  // Generate Nano Banana background
  let bgBase64 = null;
  try {
    const bgPrompt = `Dark abstract editorial background for a legal AI business infographic. Deep navy black (#080E1C). Subtle glowing orange geometric circuit patterns, faint courthouse column silhouettes, soft dramatic light beams. No text, no faces, no logos. Premium legal-tech editorial feel. Tall vertical portrait format.`;
    const bgBuf = await generateGeminiImage(bgPrompt);
    bgBase64 = bgBuf.toString("base64");
    console.log(`[Test 2] Nano Banana background generated`);
  } catch (err) {
    console.warn(`[Test 2] Gemini bg skipped: ${err.message}`);
  }

  const buf = await renderVerticalCheatsheet(content, bgBase64);
  const outPath = "generated_imgs/test-ig-cheatsheet.png";
  fs.writeFileSync(outPath, buf);
  console.log(`[Test 2] ✓ Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

// ─── TEST 3: NEWS SCREENSHOT — Instagram ──────────────────────────────────────
async function testNewsScreenshot() {
  console.log("\n[Test 3] News screenshot (Instagram)...");
  const { fetchNewsUrl }       = await import("./agent/fetch-news-url.js");
  const { renderNewsScreenshot } = await import("./images/render-news-screenshot.js");

  const url = await fetchNewsUrl("OpenAI Elon Musk lawsuit dismissed judge ruling 2024 2025");
  if (!url) {
    console.warn("[Test 3] No news URL found — skipping");
    return null;
  }
  console.log(`[Test 3] Found URL: ${url}`);

  const buf = await renderNewsScreenshot(url);
  const outPath = "generated_imgs/test-ig-news.png";
  fs.writeFileSync(outPath, buf);
  console.log(`[Test 3] ✓ Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

// ─── TEST 4: VIDEO — Hyperframes (list_countdown) ─────────────────────────────
async function testVideo() {
  console.log("\n[Test 4] Video (Hyperframes list_countdown)...");
  const { generateHyperframesVideo } = await import("./agent/generate-hyperframes-video.js");

  const videoScript = [
    {
      screen: 1,
      heading: "Elon Musk is suing OpenAI",
      body: "",
    },
    {
      screen: 2,
      heading: "What Elon claims",
      body: "OpenAI ditched its nonprofit mission for Microsoft money. He says that's a betrayal of what they founded together.",
      points: [
        "Abandoned non-profit mission for Microsoft deal",
        "Sam Altman violated their original agreement",
      ],
    },
    {
      screen: 3,
      heading: "What the judge said",
      body: "The core breach of contract claim got dismissed. Elon left the board in 2018. You can't sue from the outside for decisions made inside.",
      points: [
        "Breach of contract claim dismissed",
        "Elon left the board voluntarily in 2018",
      ],
    },
    {
      screen: 4,
      heading: "The real lesson",
      body: "If you leave a company early, you lose your voice in how it evolves. Sam stayed. Sam built a $157 billion company.",
      points: [
        "Founders who leave lose their say",
        "OpenAI IPO path is now clearer",
      ],
    },
  ];

  const videoPath = await generateHyperframesVideo(videoScript, "list_countdown");
  console.log(`[Test 4] ✓ Video ready: ${videoPath}`);
  return videoPath;
}

// ─── RUN ALL ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Agent X Test: OpenAI vs Elon Musk ===\n");
  const results = {};

  try { results.boardroom = await testBoardroom(); }
  catch (e) { console.error(`[Test 1] FAILED: ${e.message}`); }

  try { results.cheatsheet = await testCheatsheet(); }
  catch (e) { console.error(`[Test 2] FAILED: ${e.message}`); }

  try { results.news = await testNewsScreenshot(); }
  catch (e) { console.error(`[Test 3] FAILED: ${e.message}`); }

  try { results.video = await testVideo(); }
  catch (e) { console.error(`[Test 4] FAILED: ${e.stack ?? e.message}`); }

  console.log("\n=== RESULTS ===");
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key}: ${val ?? "FAILED"}`);
  }
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
