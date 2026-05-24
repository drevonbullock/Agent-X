import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import supabase from "../supabase/client.js";
import { logPost } from "../supabase/log-post.js";
import { postToLinkedIn } from "../agent/post-to-linkedin.js";
import { postReelToInstagram } from "../distributors/instagram.js";
import { postVideoToThreads } from "../distributors/threads.js";
import { postVideoToTikTok } from "../distributors/tiktok.js";
import { uploadYouTubeShort } from "../distributors/youtube-shorts.js";

const BUCKET = "agent-x-videos";

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

async function ensureBucket() {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      apikey: process.env.SUPABASE_SECRET_KEY,
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok && !JSON.stringify(j).includes("already exists") && j.message !== "Duplicate") {
    console.warn(`[ReviewQueue] Bucket note: ${JSON.stringify(j)}`);
  }
}

// Re-encode the 4K master to a web-optimized 1080p MP4 (Supabase caps at 50MB).
function compressForUpload(inputPath) {
  const outPath = path.join(os.tmpdir(), `review-${Date.now()}.mp4`);
  const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";
  const cmd = [
    `${ffmpeg} -y`,
    `-i "${inputPath}"`,
    `-vf "scale=1080:1920"`,
    `-c:v libx264 -crf 23 -preset fast`,
    `-c:a aac -b:a 128k`,
    `-movflags +faststart`,
    `"${outPath}"`,
  ].join(" ");
  execSync(cmd, { stdio: "inherit", timeout: 5 * 60 * 1000 });
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`[ReviewQueue] Compressed for upload: ${sizeMB} MB`);
  return outPath;
}

async function downloadToTemp(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const p = path.join(os.tmpdir(), `review-dl-${Date.now()}.mp4`);
  fs.writeFileSync(p, buf);
  return p;
}

// ─── ENQUEUE ─────────────────────────────────────────────────────────────────
// Compress + upload the render, then park it as 'pending'. Nothing publishes
// until a human approves. Returns the queued row (or null on failure).
export async function enqueueVideo({ targets, caption, format = "video", rawPath, meta = {} }) {
  await ensureBucket();
  const compressed = compressForUpload(rawPath);
  const key = `reels/review-${Date.now()}.mp4`;
  const buffer = fs.readFileSync(compressed);
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  } finally {
    try { fs.unlinkSync(compressed); } catch { /* tmp cleanup */ }
  }
  const videoUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

  const { data: row, error } = await supabase
    .from("review_queue")
    .insert({ targets, caption, format, video_url: videoUrl, meta, status: "pending" })
    .select()
    .single();
  if (error) {
    console.warn(`[ReviewQueue] Enqueue failed: ${error.message}`);
    return null;
  }

  console.log(`\n[ReviewQueue] VIDEO PENDING REVIEW — id ${row.id}`);
  console.log(`[ReviewQueue]   targets : ${targets.join(", ")}`);
  console.log(`[ReviewQueue]   caption : ${(caption ?? "").slice(0, 80)}`);
  console.log(`[ReviewQueue]   preview : ${videoUrl}`);
  console.log(`[ReviewQueue]   approve : GET /review  or  node index.js --approve ${row.id}\n`);
  return row;
}

// ─── DECISIONS ───────────────────────────────────────────────────────────────

export async function listPendingReviews() {
  const { data, error } = await supabase
    .from("review_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) { console.warn(`[ReviewQueue] List failed: ${error.message}`); return []; }
  return data ?? [];
}

export async function decideReview(id, action) {
  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabase
    .from("review_queue")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) { console.warn(`[ReviewQueue] Decision failed: ${error.message}`); return false; }
  console.log(`[ReviewQueue] ${id} → ${status}`);
  return true;
}

// ─── PUBLISH APPROVED ITEMS ──────────────────────────────────────────────────

async function publishTarget(target, row, localPath) {
  switch (target) {
    case "linkedin": {
      const { postId, postUrl } = await postToLinkedIn(row.caption, null, { type: "video", path: localPath });
      await logPost({ postId, postUrl, postText: row.caption, format: row.format ?? "video", postType: "video", platform: "linkedin" });
      return postUrl;
    }
    case "instagram": {
      const { mediaId, postUrl } = await postReelToInstagram(row.video_url, row.caption);
      await logPost({ postId: mediaId, postUrl, postText: row.caption, format: "reel", postType: "video", platform: "instagram" });
      return postUrl;
    }
    case "threads": {
      const { postId, postUrl } = await postVideoToThreads(row.video_url, row.caption);
      await logPost({ postId, postUrl, postText: row.caption, format: "video", postType: "video", platform: "threads" });
      return postUrl;
    }
    case "tiktok": {
      if (!process.env.TIKTOK_ACCESS_TOKEN) return null;
      const { publish_id } = await postVideoToTikTok(localPath, row.caption);
      await logPost({ postId: publish_id, postUrl: null, postText: row.caption, format: "video", postType: "video", platform: "tiktok" });
      return publish_id;
    }
    case "youtube": {
      if (!process.env.YOUTUBE_REFRESH_TOKEN) return null;
      const title = (row.caption ?? "").split(/[.!?\n]/)[0].trim().slice(0, 100);
      const { videoId, videoUrl } = await uploadYouTubeShort(localPath, title, row.caption);
      await logPost({ postId: videoId, postUrl: videoUrl, postText: row.caption, format: "video", postType: "video", platform: "youtube" });
      return videoUrl;
    }
    default:
      console.warn(`[ReviewQueue] Unknown target: ${target}`);
      return null;
  }
}

// Publishes every approved-but-unposted item to all of its targets, then marks
// it 'posted'. Per-target failures are logged and skipped — one platform error
// never blocks the others. Safe to call repeatedly (idempotent on status).
export async function processReviewQueue() {
  const { data: rows, error } = await supabase
    .from("review_queue")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) { console.warn(`[ReviewQueue] Fetch approved failed: ${error.message}`); return; }
  if (!rows?.length) return;

  console.log(`[ReviewQueue] Publishing ${rows.length} approved video(s)`);
  for (const row of rows) {
    const targets = Array.isArray(row.targets) ? row.targets : [];
    const needsFile = targets.some((t) => ["linkedin", "tiktok", "youtube"].includes(t));
    let localPath = null;
    try {
      if (needsFile) localPath = await downloadToTemp(row.video_url);
      for (const target of targets) {
        try {
          const url = await publishTarget(target, row, localPath);
          console.log(`[ReviewQueue] Posted ${target}: ${url ?? "(no url)"}`);
        } catch (err) {
          console.warn(`[ReviewQueue] ${target} failed for ${row.id}: ${err.message}`);
        }
      }
    } finally {
      if (localPath) try { fs.unlinkSync(localPath); } catch { /* tmp cleanup */ }
    }
    await supabase
      .from("review_queue")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", row.id);
  }
}

// ─── HTML APPROVAL PAGE (served by the webhook server) ───────────────────────

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderReviewPageHtml(pending, token) {
  const t = encodeURIComponent(token);
  const items = pending.map((r) => `
    <div style="border:1px solid #2a3a4a;border-radius:10px;padding:16px;margin:12px 0;background:#0d1626;">
      <div style="color:#8aa;font-size:13px;margin-bottom:8px;">${esc(r.targets?.join(", "))} · ${esc(r.created_at)}</div>
      <video src="${esc(r.video_url)}" controls style="max-width:320px;border-radius:8px;display:block;margin-bottom:10px;"></video>
      <div style="color:#dde;margin-bottom:12px;">${esc(r.caption)}</div>
      <a href="/review/decide?id=${esc(r.id)}&action=approve&token=${t}" style="background:#22c55e;color:#041;padding:8px 18px;border-radius:6px;text-decoration:none;font-weight:700;margin-right:8px;">Approve</a>
      <a href="/review/decide?id=${esc(r.id)}&action=reject&token=${t}" style="background:#3a2330;color:#f88;padding:8px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Reject</a>
    </div>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Agent X — Video Review</title></head>
<body style="font-family:system-ui,sans-serif;background:#060c18;color:#fff;max-width:720px;margin:0 auto;padding:24px;">
<h1 style="font-size:22px;">Videos pending review (${pending.length})</h1>
${pending.length ? items : '<p style="color:#8aa;">Nothing pending. Approved videos publish within ~10 minutes.</p>'}
</body></html>`;
}
