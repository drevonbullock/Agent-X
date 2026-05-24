import "dotenv/config";
import supabase from "./supabase/client.js";

// ─── WHITE-LABEL CONFIG ───────────────────────────────────────────────────────
export const AGENT_CONFIG = {
  author:       process.env.BRAND_AUTHOR    ?? "Drevon Bullock",
  title:        process.env.BRAND_TITLE     ?? "AI Consultant • Bullock Consulting Group",
  handle:       process.env.BRAND_HANDLE    ?? "@DrevonBullock",
  niche:        process.env.BRAND_NICHE     ?? "AI automation for small businesses",
  audience:     process.env.BRAND_AUDIENCE  ?? "founders, agency owners, small business operators",
  platforms:    (process.env.BRAND_PLATFORMS ?? "linkedin").split(",").map((p) => p.trim()),
  videoCadence: parseInt(process.env.VIDEO_CADENCE ?? "10", 10),
};

import fs from "fs";
import http from "http";
import Anthropic from "@anthropic-ai/sdk";
import { generateLinkedInPost, generateVideoPost, generateThreadsPost } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { postTextToThreads } from "./distributors/threads.js";
import { generateAndPostCarousel, generateAndPostCarouselToThreads } from "./modules/carousel-generator.js";
import { handleInstagramWebhook } from "./modules/comment-reply.js";
import { pickVariant } from "./analytics/index.js";
import { logPost } from "./supabase/log-post.js";
import { enqueueVideo, processReviewQueue, listPendingReviews, decideReview, renderReviewPageHtml } from "./modules/review-queue.js";
import { startScheduler } from "./scheduler.js";

// ─── STARTUP — RAW FOOTAGE CHECK ─────────────────────────────────────────────
fs.mkdirSync("raw_footage",    { recursive: true });
fs.mkdirSync("video-projects", { recursive: true });
{
  const _rawFiles = fs.readdirSync("raw_footage").filter((f) => /\.(mp4|mov|avi|mkv)$/i.test(f));
  if (_rawFiles.length > 0) {
    console.log(`[Agent X] Raw footage detected — next video post will use PATH A: ${_rawFiles[0]}`);
  } else {
    console.log(`[Agent X] No raw footage — next video post will use PATH B (AI generated)`);
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const IG_REEL_TOPICS = [
  "how to automate your client onboarding",
  "AI tools that replace a $60k/yr hire",
  "how to use AI if you work a 9-to-5",
  "what happens when you automate lead follow-up",
  "the difference between tools and systems",
  "how to build a second brain using AI",
  "AI automations every solo founder needs",
  "stop doing manually what AI can do in seconds",
];

async function generateReelScript(topic) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Write an Instagram Reel script for: "${topic}". Target audience: founders and 9-to-5 employees curious about AI. Drevon Bullock voice — direct, no hype.

Return ONLY valid JSON:
{
  "caption": "Short punchy caption, under 400 chars, no hashtags.",
  "videoScript": [
    { "screen": 1, "heading": "Hook, 6 words max", "body": "" },
    { "screen": 2, "heading": "Point one, 5 words", "body": "", "points": ["Insight one, max 12 words.", "How to apply it."] },
    { "screen": 3, "heading": "Point two, 5 words", "body": "", "points": ["Insight two, specific.", "What changes."] },
    { "screen": 4, "heading": "Point three, 5 words", "body": "", "points": ["Biggest unlock.", "Result within one week."] }
  ]
}`,
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────

async function loadPostCount(platform = null) {
  let query = supabase.from("posts").select("*", { count: "exact", head: true });
  if (platform) query = query.eq("platform", platform);
  const { count, error } = await query;
  if (error) {
    console.warn(`[Agent X] Supabase count failed, defaulting to 0: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

function isShortPost(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length < 6;
}

// Every rendered video is cross-posted to all enabled platforms (LinkedIn,
// Instagram, Threads) plus TikTok/YouTube when configured. Used by all video
// slots so one approved render publishes everywhere.
function videoTargets() {
  const t = [];
  if (AGENT_CONFIG.platforms.includes("linkedin")) t.push("linkedin");
  if (AGENT_CONFIG.platforms.includes("instagram") && process.env.INSTAGRAM_ACCESS_TOKEN) t.push("instagram");
  if (AGENT_CONFIG.platforms.includes("threads")   && process.env.THREADS_ACCESS_TOKEN)   t.push("threads");
  if (AGENT_CONFIG.platforms.includes("tiktok")    && process.env.TIKTOK_ACCESS_TOKEN)     t.push("tiktok");
  if (AGENT_CONFIG.platforms.includes("youtube")   && process.env.YOUTUBE_REFRESH_TOKEN)   t.push("youtube");
  return t;
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────────
// Text + single images only. Video every 10th LinkedIn post. No carousels.

export async function runLinkedIn(withImage = true) {
  if (!AGENT_CONFIG.platforms.includes("linkedin")) return;

  const liCount = await loadPostCount("linkedin");
  const isVideoPost = withImage && (liCount + 1) % AGENT_CONFIG.videoCadence === 0;

  console.log(`\n[LinkedIn] Starting run | post #${liCount + 1} | ${isVideoPost ? "VIDEO" : withImage ? "image" : "text"}`);

  // ── VIDEO MODE — render, then hold for human approval ────────────────────────
  // Video is the one thing that never auto-publishes. We render it, queue it for
  // review (on approval it cross-posts to every enabled platform), and stop. If
  // the render fails we degrade to a normal auto text/image post for this slot.
  if (isVideoPost) {
    try {
      const { caption, videoScript, videoStyle } = await generateVideoPost();
      console.log(`[LinkedIn] Video script: ${videoScript.length} screens | style: ${videoStyle}`);
      const videoPath = await generateVideo(caption, videoScript, videoStyle);

      const row = await enqueueVideo({ targets: videoTargets(), caption, format: "video", rawPath: videoPath, meta: { slot: "linkedin", videoStyle } });
      console.log(`[LinkedIn] Video queued for review${row ? ` (id ${row.id})` : ""}.\n`);
      return { queued: true, reviewId: row?.id ?? null };
    } catch (err) {
      console.error(`[LinkedIn] Video pipeline failed — degrading to a normal post: ${err.message}`);
      // fall through to TEXT / IMAGE MODE below
    }
  }

  // ── TEXT / IMAGE MODE ───────────────────────────────────────────────────────
  // Ask the optimizer which creative variant to run for this slot. Cold start
  // returns the brand default, so output is unchanged until real data accrues.
  let copyStyleId = null;
  let imageVariantId = null;
  if (withImage) imageVariantId = await pickVariant("linkedin", "image").catch(() => null);
  else           copyStyleId    = await pickVariant("linkedin", "text").catch(() => null);

  const { postText, format } = await generateLinkedInPost(copyStyleId);
  console.log(`[LinkedIn] Format: ${format} | "${postText.slice(0, 80)}..."`);

  const short = isShortPost(postText);
  let imageBuffer = null;
  let postType = "text";
  let designVariant = copyStyleId; // text-only slots tag their copy style

  if (!withImage || short) {
    console.log(`[LinkedIn] ${!withImage ? "Text-only slot" : "Short post — skipping image"}`);
  } else {
    try {
      imageBuffer = await generateImage(postText, imageVariantId);
      if (imageBuffer) {
        postType = "image";
        designVariant = imageVariantId;
        console.log(`[LinkedIn] Image rendered (${(imageBuffer.length / 1024).toFixed(0)} KB) | theme: ${imageVariantId}`);
      }
    } catch (err) {
      console.warn(`[LinkedIn] Image render failed — text-only: ${err.message}`);
    }
  }

  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
  console.log(`[LinkedIn] Posted! ID: ${postId} | ${postUrl}`);
  await logPost({ postId, postUrl, postText, format, postType, platform: "linkedin", designVariant });

  console.log(`[LinkedIn] Done.\n`);
  return { postId, postUrl, postText };
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────────
// 10am + 8pm → Reel (video)   |   3pm → Carousel (static)

export async function runInstagramReel() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) return;
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  const topic = IG_REEL_TOPICS[Math.floor(Math.random() * IG_REEL_TOPICS.length)];
  console.log(`\n[Instagram] Reel run | topic: ${topic}`);

  try {
    const { caption, videoScript } = await generateReelScript(topic);
    console.log(`[Instagram] Hook: "${videoScript[0].heading}"`);

    const rawPath = await generateVideo(caption, videoScript, "auto");
    const row = await enqueueVideo({ targets: videoTargets(), caption, format: "reel", rawPath, meta: { slot: "instagram_reel", topic } });
    console.log(`[Instagram] Reel queued for review${row ? ` (id ${row.id})` : ""}.\n`);
    return { queued: true, reviewId: row?.id ?? null };
  } catch (err) {
    console.error(`[Instagram] Reel failed: ${err.message}\n`);
  }
}

export async function runInstagram() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) return;
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  console.log(`\n[Instagram] Carousel run`);
  try {
    const { postUrl, slideCount } = await generateAndPostCarousel(AGENT_CONFIG.niche);
    console.log(`[Instagram] ${slideCount} slides live: ${postUrl}\n`);
    await logPost({ postId: null, postUrl, postText: AGENT_CONFIG.niche, format: "carousel", postType: "image", platform: "instagram" });
    return { postUrl, slideCount };
  } catch (err) {
    console.error(`[Instagram] Carousel failed: ${err.message}\n`);
  }
}

// ─── THREADS ──────────────────────────────────────────────────────────────────
// Video every 5th post. Carousel every 3rd (non-video). Text fills the rest.

export async function runThreads() {
  if (!AGENT_CONFIG.platforms.includes("threads")) return;
  if (!process.env.THREADS_ACCESS_TOKEN) {
    console.log("[Threads] Skipped — THREADS_ACCESS_TOKEN not set");
    return;
  }

  const threadsCount  = await loadPostCount("threads");
  const isVideoSlot   = (threadsCount + 1) % 5 === 0;
  const isCarouselSlot = !isVideoSlot && (threadsCount + 1) % 3 === 0;

  console.log(`\n[Threads] Starting run | post #${threadsCount + 1} | ${isVideoSlot ? "video" : isCarouselSlot ? "carousel" : "text"}`);

  // ── VIDEO MODE — render + queue for review (fans out to all platforms) ───────
  if (isVideoSlot) {
    try {
      const { caption, videoScript } = await generateVideoPost();
      console.log(`[Threads] Video hook: "${videoScript[0].heading}"`);

      const rawPath = await generateVideo(caption, videoScript, "auto");
      const row = await enqueueVideo({ targets: videoTargets(), caption, format: "video", rawPath, meta: { slot: "threads" } });
      console.log(`[Threads] Video queued for review${row ? ` (id ${row.id})` : ""}.\n`);
      return { queued: true, reviewId: row?.id ?? null };
    } catch (err) {
      console.error(`[Threads] Video failed, falling back to text: ${err.message}`);
      // fall through to text post
    }
  }

  // ── CAROUSEL MODE ───────────────────────────────────────────────────────────
  if (isCarouselSlot) {
    try {
      const { postUrl, slideCount } = await generateAndPostCarouselToThreads(AGENT_CONFIG.niche);
      console.log(`[Threads] Carousel done. ${slideCount} slides: ${postUrl}\n`);
      return { postUrl, slideCount };
    } catch (err) {
      console.warn(`[Threads] Carousel failed, falling back to text: ${err.message}`);
      // fall through to text post
    }
  }

  // ── TEXT MODE ────────────────────────────────────────────────────────────────
  try {
    const postText = await generateThreadsPost();
    const { postId, postUrl } = await postTextToThreads(postText);
    await logPost({ postId, postUrl, postText, format: "threads_native", postType: "text", platform: "threads" });
    console.log(`[Threads] Text posted: ${postUrl}\n`);
    return { postId, postUrl };
  } catch (err) {
    console.error(`[Threads] Text post failed: ${err.message}\n`);
  }
}

// ─── VIDEO DISTRIBUTION (TikTok / YouTube) ───────────────────────────────────

// ─── ENTRY ────────────────────────────────────────────────────────────────────

const REVIEW_TOKEN = () => process.env.REVIEW_TOKEN || process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || null;

async function main() {
  const args = process.argv;

  // ── Video review CLI ────────────────────────────────────────────────────────
  if (args.includes("--review")) {
    const pending = await listPendingReviews();
    if (!pending.length) console.log("[ReviewQueue] No pending videos.");
    for (const r of pending) console.log(`${r.id} | ${(r.targets ?? []).join(",")} | ${(r.caption ?? "").slice(0, 60)} | ${r.video_url}`);
    process.exit(0);
  }
  const approveIdx = args.indexOf("--approve");
  if (approveIdx !== -1) {
    await decideReview(args[approveIdx + 1], "approve");
    await processReviewQueue();
    process.exit(0);
  }
  const rejectIdx = args.indexOf("--reject");
  if (rejectIdx !== -1) {
    await decideReview(args[rejectIdx + 1], "reject");
    process.exit(0);
  }
  if (args.includes("--process-reviews")) {
    await processReviewQueue();
    process.exit(0);
  }

  if (args.includes("--test")) {
    // Test LinkedIn (9am slot = withImage true)
    await runLinkedIn(true);
  } else if (args.includes("--test-instagram")) {
    await runInstagram();
  } else if (args.includes("--test-threads")) {
    await runThreads();
  } else {
    startScheduler();

    // Instagram webhook — GET = hub verification, POST = comment events
    const PORT = parseInt(process.env.PORT ?? "3000", 10);
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost`);

      if (req.method === "GET" && url.pathname === "/webhook/instagram") {
        const mode      = url.searchParams.get("hub.mode");
        const token     = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(challenge);
        } else {
          res.writeHead(403);
          res.end("Forbidden");
        }
        return;
      }

      if (req.method === "POST" && url.pathname === "/webhook/instagram") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            await handleInstagramWebhook(parsed);
          } catch (err) {
            console.error(`[Webhook] IG parse/handle failed: ${err.message}`);
          }
          res.writeHead(200);
          res.end("OK");
        });
        return;
      }

      // ── Video review: approval dashboard + decision links ──────────────────────
      if (req.method === "GET" && (url.pathname === "/review" || url.pathname === "/review/decide")) {
        const expected = REVIEW_TOKEN();
        if (!expected) { res.writeHead(503); res.end("Set REVIEW_TOKEN to enable video review."); return; }
        if (url.searchParams.get("token") !== expected) { res.writeHead(403); res.end("Forbidden"); return; }

        if (url.pathname === "/review") {
          const pending = await listPendingReviews();
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(renderReviewPageHtml(pending, expected));
          return;
        }

        const id = url.searchParams.get("id");
        const action = url.searchParams.get("action");
        if (!id || !["approve", "reject"].includes(action)) { res.writeHead(400); res.end("Bad request"); return; }
        await decideReview(id, action);
        if (action === "approve") processReviewQueue().catch((e) => console.warn(`[ReviewQueue] post-approve publish failed: ${e.message}`));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<p style="font-family:system-ui">${action === "approve" ? "Approved — publishing now." : "Rejected."} <a href="/review?token=${encodeURIComponent(expected)}">Back to queue</a></p>`);
        return;
      }

      res.writeHead(200);
      res.end("Agent X");
    });

    server.listen(PORT, () => {
      console.log(`[Agent X] Webhook server on port ${PORT}`);
    });

    console.log("[Agent X] Scheduler started. Waiting for next run...");
  }
}

main().catch((err) => {
  console.error(`[Agent X] Fatal error:`, err.message);
  process.exit(1);
});
