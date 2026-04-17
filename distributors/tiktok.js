import "dotenv/config";
import fs from "fs";

// TikTok Content Posting API v2
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
const API_BASE = "https://open.tiktokapis.com/v2";

function tiktokHeaders() {
  return {
    Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
    "Content-Type": "application/json; charset=UTF-8",
  };
}

// ─── CREATOR INFO ─────────────────────────────────────────────────────────────

export async function getCreatorInfo() {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error("TIKTOK_ACCESS_TOKEN not set in .env");

  const res = await fetch(`${API_BASE}/post/publish/creator_info/query/`, {
    method: "POST",
    headers: tiktokHeaders(),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikTok creator info failed (${res.status}): ${body}`);
  }

  const { data } = await res.json();
  return data;
}

// ─── POST VIDEO (DIRECT POST) ─────────────────────────────────────────────────
// videoPath: local path to mp4 file
// caption: post caption (max 2200 chars, 5 hashtags)

export async function postVideoToTikTok(videoPath, caption) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error("TIKTOK_ACCESS_TOKEN not set in .env");

  const fileBuffer = fs.readFileSync(videoPath);
  const fileSizeBytes = fileBuffer.length;

  // Step 1: Initialize direct post upload
  const initRes = await fetch(`${API_BASE}/post/publish/video/init/`, {
    method: "POST",
    headers: tiktokHeaders(),
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fileSizeBytes,
        chunk_size: fileSizeBytes,
        total_chunk_count: 1,
      },
    }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`TikTok init failed (${initRes.status}): ${body}`);
  }

  const initData = await initRes.json();
  const { publish_id, upload_url } = initData.data;

  // Step 2: Upload video binary
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${fileSizeBytes - 1}/${fileSizeBytes}`,
      "Content-Length": String(fileSizeBytes),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`TikTok video upload failed (${uploadRes.status})`);
  }

  console.log(`[TikTok] Video uploaded. Publish ID: ${publish_id}`);
  return { publish_id };
}

// ─── CHECK POST STATUS ────────────────────────────────────────────────────────

export async function checkPostStatus(publishId) {
  const res = await fetch(`${API_BASE}/post/publish/status/fetch/`, {
    method: "POST",
    headers: tiktokHeaders(),
    body: JSON.stringify({ publish_id: publishId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikTok status check failed (${res.status}): ${body}`);
  }

  const { data } = await res.json();
  return data; // { status, publicaly_available_post_id, ... }
}
