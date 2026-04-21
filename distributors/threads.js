import "dotenv/config";

// Meta Threads API v1.0
// Docs: https://developers.facebook.com/docs/threads
const API_BASE = "https://graph.threads.net/v1.0";
const MAX_TEXT_CHARS = 500;

function getCredentials() {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;
  if (!token) throw new Error("THREADS_ACCESS_TOKEN not set in .env");
  if (!userId) throw new Error("THREADS_USER_ID not set in .env");
  return { token, userId };
}

// ─── CREATE CONTAINER ─────────────────────────────────────────────────────────

async function createContainer(userId, token, params) {
  const url = new URL(`${API_BASE}/${userId}/threads`);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads container failed (${res.status}): ${body}`);
  }

  const { id } = await res.json();
  return id;
}

// ─── PUBLISH CONTAINER ────────────────────────────────────────────────────────

async function publishContainer(userId, token, containerId) {
  const url = new URL(`${API_BASE}/${userId}/threads_publish`);
  url.searchParams.set("creation_id", containerId);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads publish failed (${res.status}): ${body}`);
  }

  const { id } = await res.json();
  return id;
}

// ─── POST TEXT ────────────────────────────────────────────────────────────────

export async function postTextToThreads(text) {
  const { token, userId } = getCredentials();
  const trimmed = text.slice(0, MAX_TEXT_CHARS);

  const containerId = await createContainer(userId, token, {
    media_type: "TEXT",
    text: trimmed,
  });

  console.log(`[Threads] Container created: ${containerId}`);

  const postId = await publishContainer(userId, token, containerId);
  const postUrl = `https://www.threads.net/@${process.env.THREADS_USERNAME ?? "drevonbullock.ai"}/post/${postId}`;

  console.log(`[Threads] Published! ID: ${postId}`);
  return { postId, postUrl };
}

// ─── POST IMAGE ───────────────────────────────────────────────────────────────
// imageUrl must be a publicly accessible URL (same requirement as Instagram)

export async function postImageToThreads(imageUrl, text) {
  const { token, userId } = getCredentials();
  const trimmed = text.slice(0, MAX_TEXT_CHARS);

  const containerId = await createContainer(userId, token, {
    media_type: "IMAGE",
    image_url: imageUrl,
    text: trimmed,
  });

  console.log(`[Threads] Image container created: ${containerId}`);

  const postId = await publishContainer(userId, token, containerId);
  const postUrl = `https://www.threads.net/@${process.env.THREADS_USERNAME ?? "drevonbullock.ai"}/post/${postId}`;

  console.log(`[Threads] Image published! ID: ${postId}`);
  return { postId, postUrl };
}

// ─── POST VIDEO ───────────────────────────────────────────────────────────────
// videoUrl must be a publicly accessible URL to an mp4

export async function postVideoToThreads(videoUrl, text) {
  const { token, userId } = getCredentials();
  const trimmed = text.slice(0, MAX_TEXT_CHARS);

  const containerId = await createContainer(userId, token, {
    media_type: "VIDEO",
    video_url: videoUrl,
    text: trimmed,
  });

  console.log(`[Threads] Video container created: ${containerId}`);

  // Video requires processing time before publish
  await waitForProcessing(containerId, token);

  const postId = await publishContainer(userId, token, containerId);
  const postUrl = `https://www.threads.net/@${process.env.THREADS_USERNAME ?? "drevonbullock.ai"}/post/${postId}`;

  console.log(`[Threads] Video published! ID: ${postId}`);
  return { postId, postUrl };
}

// ─── POST CAROUSEL ────────────────────────────────────────────────────────────
// imageUrls: array of publicly accessible image URLs (2–10)

export async function postCarouselToThreads(imageUrls, caption) {
  const { token, userId } = getCredentials();
  const trimmed = caption.slice(0, MAX_TEXT_CHARS);

  // Step 1: Create a child container for each image
  const childIds = [];
  for (const imageUrl of imageUrls) {
    const id = await createContainer(userId, token, {
      media_type: "IMAGE",
      image_url: imageUrl,
      is_carousel_item: "true",
    });
    childIds.push(id);
    console.log(`[Threads] Carousel child created: ${id}`);
  }

  // Step 2: Create carousel container
  const containerId = await createContainer(userId, token, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    text: trimmed,
  });
  console.log(`[Threads] Carousel container created: ${containerId}`);

  // Step 3: Publish
  const postId = await publishContainer(userId, token, containerId);
  const postUrl = `https://www.threads.net/@${process.env.THREADS_USERNAME ?? "drevonbullock.ai"}/post/${postId}`;
  console.log(`[Threads] Carousel published! ID: ${postId} | ${imageUrls.length} slides`);
  return { postId, postUrl };
}

// ─── PROCESSING POLL ─────────────────────────────────────────────────────────

async function waitForProcessing(containerId, token, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000)); // 10s between polls

    const res = await fetch(
      `${API_BASE}/${containerId}?fields=status,error_message&access_token=${token}`
    );
    if (!res.ok) continue;

    const { status, error_message } = await res.json();
    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error(`Threads video processing failed: ${error_message}`);
    console.log(`[Threads] Video processing: ${status} (attempt ${i + 1})`);
  }
  throw new Error("Threads video processing timed out");
}
