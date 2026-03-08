import "dotenv/config";

const API_BASE = "https://api.linkedin.com";

function linkedInHeaders() {
  return {
    Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    "LinkedIn-Version": "202503",
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

async function uploadImageToLinkedIn(imageBuffer, personUrn) {
  // Step 1: Initialize upload — get a signed PUT URL + image URN
  const initRes = await fetch(`${API_BASE}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: linkedInHeaders(),
    body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw Object.assign(new Error(`Image upload init failed (${initRes.status})`), {
      status: initRes.status,
      data: body,
    });
  }

  const { value } = await initRes.json();
  const { uploadUrl, image: imageUrn } = value;

  // Step 2: PUT binary PNG to the pre-signed URL (no Authorization header)
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: imageBuffer,
  });

  if (!putRes.ok) {
    throw new Error(`Image binary upload failed (${putRes.status})`);
  }

  console.log(`[LinkedIn] Image uploaded. URN: ${imageUrn}`);
  return imageUrn;
}

export async function postToLinkedIn(postText, imageBuffer = null) {
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    throw new Error("LINKEDIN_ACCESS_TOKEN is not set. Run: node auth/linkedin-auth.js");
  }
  if (!personUrn) {
    throw new Error("LINKEDIN_PERSON_URN is not set. Run: node auth/linkedin-auth.js");
  }

  let imageUrn = null;
  if (imageBuffer) {
    console.log(`[LinkedIn] Uploading quote card image...`);
    try {
      imageUrn = await uploadImageToLinkedIn(imageBuffer, personUrn);
    } catch (err) {
      console.warn(`[LinkedIn] Image upload failed — posting text-only. Error: ${err.message}`);
    }
  }

  console.log(`[LinkedIn] Creating post...`);
  const postBody = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    visibility: "PUBLIC",
    commentary: postText,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    ...(imageUrn && {
      content: {
        media: { id: imageUrn },
      },
    }),
  };

  let postRes;
  try {
    postRes = await fetch(`${API_BASE}/rest/posts`, {
      method: "POST",
      headers: linkedInHeaders(),
      body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
      const body = await postRes.text();
      throw Object.assign(new Error(`Post creation failed (${postRes.status})`), {
        status: postRes.status,
        data: body,
      });
    }
  } catch (err) {
    console.error(`[LinkedIn] Post creation failed`);
    console.error(`[LinkedIn] Status: ${err.status}`);
    console.error(`[LinkedIn] Error data:`, err.data ?? err.message);
    throw err;
  }

  const postId = postRes.headers.get("x-restli-id");
  const postUrl = `https://www.linkedin.com/feed/update/${postId}/`;
  console.log(`[LinkedIn] Post created. ID: ${postId}`);

  return { postId, postUrl };
}
