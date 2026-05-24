import "dotenv/config";
import { writeFileSync } from "fs";
import supabase from "./supabase/client.js";
import { generateImageForInstagram } from "./agent/generate-image.js";
import { postImageToInstagram } from "./distributors/instagram.js";

// ─── Test post content ─────────────────────────────────────────────────────
// Change MODE below to switch which image type gets tested:
//   boardroom | cheatsheet | quote

const MODE = process.argv[2] || "boardroom";

const POSTS = {
  boardroom: {
    text: `Most business owners spend 4 hours a day manually following up with leads.
They write the same emails. They forget callbacks. They lose deals to response time.
I automated my entire follow-up sequence in one afternoon. It runs while I sleep.
The businesses winning right now aren't bigger. They just have fewer bottlenecks.`,
    caption: `Most owners spend 4 hours a day on follow-ups. I automated mine in an afternoon.

The businesses winning right now aren't bigger. They just have fewer bottlenecks.

#AIAutomation #BCG`,
  },
  cheatsheet: {
    text: `MCP vs RAG — two AI tools every business owner should understand.
MCP connects your AI to live systems so it can take actions: book appointments, send emails, update your CRM.
RAG gives your AI a knowledge base to search and answer questions from.
Most businesses need both. Confuse them and your chatbot stays dumb.`,
    caption: `MCP vs RAG — two AI tools every business owner should understand.

Confuse them and your chatbot stays dumb.

#AIAutomation #BCG`,
  },
  quote: {
    text: `The businesses winning right now aren't bigger. They just have fewer bottlenecks.`,
    caption: `The businesses winning right now aren't bigger. They just have fewer bottlenecks.

#BCG #AIAutomation`,
  },
};

const { text, caption } = POSTS[MODE] ?? POSTS.boardroom;

async function uploadToSupabase(buffer) {
  const key = `test-posts/ig-${MODE}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from("agent-x-images")
    .upload(key, buffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data } = supabase.storage.from("agent-x-images").getPublicUrl(key);
  return data.publicUrl;
}

(async () => {
  console.log(`\n[Test] Mode: ${MODE.toUpperCase()} — generating 9:16 image...`);

  const buf = await generateImageForInstagram(text);
  if (!buf) { console.error("[Test] Image generation returned null"); process.exit(1); }

  const localFile = `test_ig_${MODE}.png`;
  writeFileSync(localFile, buf);
  console.log(`[Test] Saved locally → ${localFile}`);

  console.log("[Test] Uploading to Supabase...");
  const imageUrl = await uploadToSupabase(buf);
  console.log(`[Test] Public URL: ${imageUrl}`);

  console.log("[Test] Posting to Instagram...");
  const { mediaId, postUrl } = await postImageToInstagram(imageUrl, caption);

  console.log(`\n✓ Posted! ID: ${mediaId}`);
  console.log(`✓ URL: ${postUrl}\n`);
})().catch((err) => {
  console.error("[Test] FAILED:", err.message);
  process.exit(1);
});
