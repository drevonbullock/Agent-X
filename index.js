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
};

import fs from "fs";
import http from "http";
import { generateLinkedInPost, generateVideoPost, generateThreadsPost, generateSeedComment } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { generateVideo } from "./agent/generate-video.js";
import { postToLinkedIn, postCommentToLinkedIn } from "./agent/post-to-linkedin.js";
import { postTextToThreads } from "./distributors/threads.js";
import { generateAndPostCarousel, generateAndPostCarouselToThreads, CAROUSEL_TOPICS } from "./modules/carousel-generator.js";
import { handleInstagramWebhook } from "./modules/comment-reply.js";
import { pickVariant } from "./analytics/index.js";
import { logPost } from "./supabase/log-post.js";
import { enqueueVideo, processReviewQueue, listPendingReviews, decideReview, renderReviewPageHtml } from "./modules/review-queue.js";
import { listPendingWick, decideWick, renderWickPageHtml } from "./modules/wicks-wisdom.js";
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
  // Instagram is Wick's Wisdom now (2026-07-30) — Agent X videos never go there.
  if (AGENT_CONFIG.platforms.includes("threads")   && process.env.THREADS_ACCESS_TOKEN)   t.push("threads");
  if (AGENT_CONFIG.platforms.includes("tiktok")    && process.env.TIKTOK_ACCESS_TOKEN)     t.push("tiktok");
  if (AGENT_CONFIG.platforms.includes("youtube")   && process.env.YOUTUBE_REFRESH_TOKEN)   t.push("youtube");
  return t;
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────────
// Text + single images only. No carousels, no video (video is its own daily job).

export async function runLinkedIn(withImage = true) {
  if (!AGENT_CONFIG.platforms.includes("linkedin")) return;

  const liCount = await loadPostCount("linkedin");
  console.log(`\n[LinkedIn] Starting run | post #${liCount + 1} | ${withImage ? "image" : "text"}`);

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

  // First-comment seed — kickstarts the thread. Requires LinkedIn's gated
  // Community Management API (socialActions); off until LINKEDIN_COMMENT_API=true.
  if (process.env.LINKEDIN_COMMENT_API === "true") {
    try {
      const seed = await generateSeedComment(postText);
      await postCommentToLinkedIn(postId, seed);
      console.log(`[LinkedIn] Seed comment posted.`);
    } catch (err) {
      console.warn(`[LinkedIn] Seed comment failed: ${err.message}`);
    }
  }

  console.log(`[LinkedIn] Done.\n`);
  return { postId, postUrl, postText };
}

// ─── VIDEO (unified, all platforms) ──────────────────────────────────────────
// One video cadence for the whole system. Renders a single clip, queues it for
// review, and on approval cross-posts to every enabled platform (LinkedIn,
// Instagram, Threads) plus TikTok/YouTube. This is the ONLY place video renders.

export async function runVideo() {
  const targets = videoTargets();
  if (!targets.length) {
    console.log("[Video] Skipped — no enabled video platforms");
    return;
  }

  console.log(`\n[Video] Daily video run | targets: ${targets.join(", ")}`);
  try {
    const { caption, videoScript, videoStyle } = await generateVideoPost();
    console.log(`[Video] Script: ${videoScript.length} screens | style: ${videoStyle}`);

    const rawPath = await generateVideo(caption, videoScript, videoStyle);
    const row = await enqueueVideo({ targets, caption, format: "video", rawPath, meta: { slot: "daily_video", videoStyle } });
    console.log(`[Video] Queued for review${row ? ` (id ${row.id})` : ""}.\n`);
    return { queued: true, reviewId: row?.id ?? null };
  } catch (err) {
    console.error(`[Video] Pipeline failed: ${err.message}\n`);
  }
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────────
// 10am → news image   |   3pm → Carousel (static). Video handled by runVideo().

export async function runInstagram() {
  if (!AGENT_CONFIG.platforms.includes("instagram")) {
    console.log(`[Instagram] Skipped — 'instagram' not in BRAND_PLATFORMS (current: ${process.env.BRAND_PLATFORMS ?? "not set"}). Add instagram to Railway BRAND_PLATFORMS env var.`);
    return;
  }
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log("[Instagram] Skipped — INSTAGRAM_ACCESS_TOKEN not set");
    return;
  }

  const carouselTopic = CAROUSEL_TOPICS[Math.floor(Math.random() * CAROUSEL_TOPICS.length)];
  console.log(`\n[Instagram] Carousel run | topic: "${carouselTopic}"`);
  try {
    const { postUrl, slideCount } = await generateAndPostCarousel(carouselTopic);
    console.log(`[Instagram] ${slideCount} slides live: ${postUrl}\n`);
    await logPost({ postId: null, postUrl, postText: carouselTopic, format: "carousel", postType: "image", platform: "instagram" });
    return { postUrl, slideCount };
  } catch (err) {
    console.error(`[Instagram] Carousel failed: ${err.message}\n`);
  }
}

// ─── THREADS ──────────────────────────────────────────────────────────────────
// Carousel every 3rd post. Text fills the rest. Video handled by runVideo().

export async function runThreads() {
  if (!AGENT_CONFIG.platforms.includes("threads")) {
    console.log(`[Threads] Skipped — 'threads' not in BRAND_PLATFORMS (current: ${process.env.BRAND_PLATFORMS ?? "not set"})`);
    return;
  }
  if (!process.env.THREADS_ACCESS_TOKEN) {
    console.log("[Threads] Skipped — THREADS_ACCESS_TOKEN not set");
    return;
  }

  const threadsCount   = await loadPostCount("threads");
  // Threads is text + news only now (Dre, 2026-07-24). Carousels live on
  // Instagram. Carousel code below is kept for manual use but never scheduled.
  const isCarouselSlot = false;

  console.log(`\n[Threads] Starting run | post #${threadsCount + 1} | ${isCarouselSlot ? "carousel" : "text"}`);

  // ── CAROUSEL MODE ───────────────────────────────────────────────────────────
  if (isCarouselSlot) {
    try {
      const carouselTopic = CAROUSEL_TOPICS[Math.floor(Math.random() * CAROUSEL_TOPICS.length)];
      const { postUrl, slideCount } = await generateAndPostCarouselToThreads(carouselTopic);
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

      // Wick's Wisdom queue. The imports for this existed but the route was
      // never wired, so there was no way to see what was queued short of opening
      // Supabase. Posts publish automatically (WICK_AUTO_PUBLISH), so this is a
      // preview plus a per-post pull switch, not an approval gate.
      if (req.method === "GET" && (url.pathname === "/wick" || url.pathname === "/wick/decide")) {
        const expected = REVIEW_TOKEN();
        if (!expected) { res.writeHead(503); res.end("Set REVIEW_TOKEN to enable the Wick queue."); return; }
        if (url.searchParams.get("token") !== expected) { res.writeHead(403); res.end("Forbidden"); return; }

        if (url.pathname === "/wick") {
          const queued = await listPendingWick();
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(renderWickPageHtml(queued));
          return;
        }

        const id = url.searchParams.get("id");
        const action = url.searchParams.get("action");
        if (!id || !["approve", "reject"].includes(action)) { res.writeHead(400); res.end("Bad request"); return; }
        await decideWick(id, action);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<p style="font-family:system-ui">${action === "approve" ? "Approved — will publish on its next slot." : "Pulled — will not publish."} <a href="/wick?token=${encodeURIComponent(expected)}">Back to queue</a></p>`);
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
