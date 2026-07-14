 import "dotenv/config";
import fs from "fs";

// Instagram Graph API — Content Publishing
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
const API_BASE = "https://graph.instagram.com/v22.0";

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

// ─── CONTAINER STATUS POLL ────────────────────────────────────────────────────

async function waitForContainer(containerId, maxAttempts = 10) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `${API_BASE}/${containerId}?fields=status_code&access_token=${token}`
    );
    if (!res.ok) continue;
    const { status_code } = await res.json();
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`Instagram container processing failed`);
    console.log(`[Instagram] Container status: ${status_code} (attempt ${i + 1})`);
  }
  // Attempt publish anyway after max wait — some containers skip status reporting
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

  // Step 2: Wait for container to be ready
  await waitForContainer(containerId);

  // Step 3: Publish
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

// ─── POST CAROUSEL ────────────────────────────────────────────────────────────
// imageUrls: array of publicly accessible image URLs (2–10 items)

export async function postCarouselToInstagram(imageUrls, caption) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not set in .env");
  const businessId = getBusinessId();

  // Step 1: Create a child container per item.
  // Items are image URL strings (back-compat) or { type: "video"|"image", url }.
  const childIds = [];
  for (const item of imageUrls) {
    const isVideo = typeof item === "object" && item.type === "video";
    const url = typeof item === "string" ? item : item.url;
    const res = await fetch(`${API_BASE}/${businessId}/media`, {
      method: "POST",
      headers: igHeaders(),
      body: JSON.stringify(
        isVideo
          ? { media_type: "VIDEO", video_url: url, is_carousel_item: true }
          : { image_url: url, is_carousel_item: true }
      ),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram carousel child failed (${res.status}): ${body}`);
    }
    const { id } = await res.json();
    await waitForContainer(id, isVideo ? 40 : 10); // video children transcode slowly
    childIds.push(id);
    console.log(`[Instagram] Carousel child ready: ${id}${isVideo ? " (video)" : ""}`);
  }

  // Step 2: Create the carousel container
  const containerRes = await fetch(`${API_BASE}/${businessId}/media`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: caption.slice(0, 2200),
    }),
  });
  if (!containerRes.ok) {
    const body = await containerRes.text();
    throw new Error(`Instagram carousel container failed (${containerRes.status}): ${body}`);
  }
  const { id: containerId } = await containerRes.json();
  console.log(`[Instagram] Carousel container created: ${containerId}`);

  await waitForContainer(containerId, 15);

  // Step 3: Publish
  const publishRes = await fetch(`${API_BASE}/${businessId}/media_publish`, {
    method: "POST",
    headers: igHeaders(),
    body: JSON.stringify({ creation_id: containerId }),
  });
  if (!publishRes.ok) {
    const body = await publishRes.text();
    throw new Error(`Instagram carousel publish failed (${publishRes.status}): ${body}`);
  }

  const { id: mediaId } = await publishRes.json();
  const postUrl = `https://www.instagram.com/p/${mediaId}/`;
  console.log(`[Instagram] Carousel published! ID: ${mediaId} | ${imageUrls.length} slides`);
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
