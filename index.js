import "dotenv/config";
import { generateLinkedInPost, CONTENT_TYPES } from "./agent/generate-post.js";
import { generateImage } from "./agent/generate-image.js";
import { postToLinkedIn } from "./agent/post-to-linkedin.js";
import { startScheduler } from "./scheduler.js";

const CONTENT_TYPE_LIST = Object.values(CONTENT_TYPES);

function pickContentType() {
  return CONTENT_TYPE_LIST[Math.floor(Math.random() * CONTENT_TYPE_LIST.length)];
}

export async function runAgent() {
  const contentType = pickContentType();
  console.log(`\n[Agent X] Starting run`);
  console.log(`[Agent X] Content type: ${contentType}`);

  console.log(`[Agent X] Generating LinkedIn post...`);
  const postText = await generateLinkedInPost(contentType);
  console.log(`[Agent X] Post: "${postText}"`);

  console.log(`[Agent X] Rendering quote card...`);
  let imageBuffer = null;
  try {
    imageBuffer = await generateImage(postText);
    console.log(`[Agent X] Quote card rendered (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.warn(`[Agent X] Quote card render failed — posting text-only. Error: ${err.message}`);
  }

  console.log(`[Agent X] Posting to LinkedIn...`);
  const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer);
  console.log(`[Agent X] Posted! ID: ${postId}`);
  console.log(`[Agent X] URL: ${postUrl}`);
  console.log(`[Agent X] Done.\n`);

  return { postId, postUrl, postText, contentType };
}

async function main() {
  if (process.argv.includes("--test")) {
    await runAgent();
  } else {
    startScheduler();
    console.log("[Agent X] Scheduler started. Waiting for next run...");
  }
}

main().catch((err) => {
  console.error(`[Agent X] Fatal error:`, err.message);
  process.exit(1);
});
