import "dotenv/config";
import fs from "fs";

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

async function uploadVideoToLinkedIn(videoPath, personUrn) {
  const fileBuffer = fs.readFileSync(videoPath);
  const fileSizeBytes = fileBuffer.length;

  // Step 1: Initialize upload
  const initRes = await fetch(`${API_BASE}/rest/videos?action=initializeUpload`, {
    method: "POST",
    headers: linkedInHeaders(),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: personUrn,
        fileSizeBytes,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw Object.assign(new Error(`Video upload init failed (${initRes.status})`), {
      status: initRes.status,
      data: body,
    });
  }

  const { value } = await initRes.json();
  const { uploadInstructions, video: videoUrn, uploadToken } = value;

  // Step 2: PUT each chunk to its signed URL (no Authorization header)
  const uploadedPartIds = [];
  for (const instruction of uploadInstructions) {
    const { uploadUrl, firstByte, lastByte } = instruction;
    const chunk = fileBuffer.slice(firstByte, lastByte + 1);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });

    if (!putRes.ok) {
      throw new Error(`Video chunk upload failed (${putRes.status}) for bytes ${firstByte}-${lastByte}`);
    }

    // Grab ETag from response (needed for finalize)
    const etag = putRes.headers.get("etag") || putRes.headers.get("ETag") || `part-${uploadedPartIds.length + 1}`;
    uploadedPartIds.push(etag);
  }

  // Step 3: Finalize upload
  const finalizeRes = await fetch(`${API_BASE}/rest/videos?action=finalizeUpload`, {
    method: "POST",
    headers: linkedInHeaders(),
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken,
        uploadedPartIds,
      },
    }),
  });

  if (!finalizeRes.ok) {
    const body = await finalizeRes.text();
    throw Object.assign(new Error(`Video finalize failed (${finalizeRes.status})`), {
      status: finalizeRes.status,
      data: body,
    });
  }

  console.log(`[LinkedIn] Video uploaded. URN: ${videoUrn}`);
  return videoUrn;
}

// videoAsset: { type: 'video', path: 'generated_imgs/output.mp4' } or null
export async function postToLinkedIn(postText, imageBuffer = null, videoAsset = null) {
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    throw new Error("LINKEDIN_ACCESS_TOKEN is not set. Run: node auth/linkedin-auth.js");
  }
  if (!personUrn) {
    throw new Error("LINKEDIN_PERSON_URN is not set. Run: node auth/linkedin-auth.js");
  }

  let imageUrn = null;
  let videoUrn = null;

  if (videoAsset && videoAsset.type === "video") {
    console.log(`[LinkedIn] Uploading video...`);
    try {
      videoUrn = await uploadVideoToLinkedIn(videoAsset.path, personUrn);
    } catch (err) {
      console.warn(`[LinkedIn] Video upload failed — falling back to text-only. Error: ${err.message}`);
    }
  } else if (imageBuffer) {
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
    ...((videoUrn || imageUrn) && {
      content: {
        media: { id: videoUrn || imageUrn },
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
