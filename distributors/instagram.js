import "dotenv/config";
import fs from "fs";

// Meta Graph API — Instagram Business Content Publishing
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
const API_BASE = "https://graph.facebook.com/v22.0";

function igHeaders() {
  return {
    Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function getBusinessId() {
  const id = process.env.INSTAGRAM_BUSINESS_ID;
  if (!id) throw new Error("INSTAGRAM_BUSINESS_ID not set in .env");
  return id;
}

// ─── POST IMAGE ───────────────────────────────────────────────────────────────
// imageUrl: publicly accessible URL (Instagram requires a URL, not binary upload)

export async function postImageToInstagram(imageUrl, caption) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not set in .env");
  const businessId = getBusinessId();

  // Step 1: Create media container
  const containerRes = await fetch(`${API_BASE}/${businessId}/media`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption.slice(0, 2200),
      media_type: "IMAGE",
    }),
  });

  if (!containerRes.ok) {
    const body = await containerRes.text();
    throw new Error(`Instagram media container failed (${containerRes.status}): ${body}`);
  }

  const { id: containerId } = await containerRes.json();
  console.log(`[Instagram] Container created: ${containerId}`);

  // Step 2: Publish
  const publishRes = await fetch(`${API_BASE}/${businessId}/media_publish`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify({ creation_id: containerId }),
  });

  if (!publishRes.ok) {
    const body = await publishRes.text();
    throw new Error(`Instagram publish failed (${publishRes.status}): ${body}`);
  }

  const { id: mediaId } = await publishRes.json();
  const postUrl = `https://www.instagram.com/p/${mediaId}/`;
  console.log(`[Instagram] Published! ID: ${mediaId}`);
  return { mediaId, postUrl };
}

// ─── POST REEL ────────────────────────────────────────────────────────────────
// videoUrl: publicly accessible URL to mp4

export async function postReelToInstagram(videoUrl, caption, coverUrl = null) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not set in .env");
  const businessId = getBusinessId();

  // Step 1: Create reel container
  const body = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: caption.slice(0, 2200),
    share_to_feed: true,
  };
  if (coverUrl) body.cover_url = coverUrl;

  const containerRes = await fetch(`${API_BASE}/${businessId}/media`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify(body),
  });

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram reel container failed (${containerRes.status}): ${err}`);
  }

  const { id: containerId } = await containerRes.json();
  console.log(`[Instagram] Reel container created: ${containerId}`);

  // Step 2: Wait for processing then publish
  await waitForReelProcessing(containerId);

  const publishRes = await fetch(`${API_BASE}/${businessId}/media_publish`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify({ creation_id: containerId }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram reel publish failed (${publishRes.status}): ${err}`);
  }

  const { id: mediaId } = await publishRes.json();
  const postUrl = `https://www.instagram.com/reel/${mediaId}/`;
  console.log(`[Instagram] Reel published! ID: ${mediaId}`);
  return { mediaId, postUrl };
}

// ─── WAIT FOR REEL PROCESSING ─────────────────────────────────────────────────

async function waitForReelProcessing(containerId, maxAttempts = 20) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 15000)); // 15s between polls

    const res = await fetch(
      `${API_BASE}/${containerId}?fields=status_code,status&access_token=${token}`
    );
    if (!res.ok) continue;

    const { status_code } = await res.json();
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`Instagram reel processing failed`);
    console.log(`[Instagram] Reel processing: ${status_code} (attempt ${i + 1})`);
  }
  throw new Error("Instagram reel processing timed out");
}
