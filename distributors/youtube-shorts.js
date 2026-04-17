import "dotenv/config";
import fs from "fs";

// YouTube Data API v3 — video upload for Shorts
// Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
const API_BASE = "https://www.googleapis.com/upload/youtube/v3";
const API_V3 = "https://www.googleapis.com/youtube/v3";

// ─── OAUTH TOKEN REFRESH ──────────────────────────────────────────────────────

async function getAccessToken() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN must be set in .env");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube token refresh failed (${res.status}): ${err}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

// ─── UPLOAD SHORT ─────────────────────────────────────────────────────────────
// videoPath: local path to mp4 (9:16 format, under 60s for Shorts)
// title: video title (max 100 chars)
// description: video description (max 5000 chars)
// tags: string[] of tags

export async function uploadYouTubeShort(videoPath, title, description, tags = []) {
  const accessToken = await getAccessToken();
  const fileBuffer = fs.readFileSync(videoPath);
  const fileSizeBytes = fileBuffer.length;

  // Step 1: Initialize resumable upload
  const initRes = await fetch(
    `${API_BASE}/video?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(fileSizeBytes),
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: ["#Shorts", ...tags].slice(0, 500),
          categoryId: "28", // Science & Technology
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return upload URL");

  // Step 2: Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSizeBytes),
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok && uploadRes.status !== 201) {
    const err = await uploadRes.text();
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${err}`);
  }

  const data = await uploadRes.json();
  const videoId = data.id;
  const videoUrl = `https://www.youtube.com/shorts/${videoId}`;

  console.log(`[YouTube] Short uploaded! ID: ${videoId}`);
  console.log(`[YouTube] URL: ${videoUrl}`);

  return { videoId, videoUrl };
}

// ─── GET CHANNEL INFO ─────────────────────────────────────────────────────────

export async function getChannelInfo() {
  const accessToken = await getAccessToken();

  const res = await fetch(`${API_V3}/channels?part=snippet,statistics&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`YouTube channel info failed (${res.status})`);
  const { items } = await res.json();
  return items?.[0] ?? null;
}
