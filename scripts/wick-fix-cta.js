import "dotenv/config";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import {
  generateScene, download, tmpDir, lessonScenePrompt, compositeCta,
} from "../modules/wick-render.js";

// Rebuilds the CTA slide on every queued post so it asks for a SHARE instead of
// promising a resource.
//
// Posts batched before the CTA change render "Comment LEDGER and I'll send you
// <resource>" for resources that were never written and have no delivery path.
// That is a promise the account cannot keep, so it gets replaced rather than
// published.
//
// Only the last slide is touched. The scene art is reused from the batch temp
// dir when it survived; macOS clears /var/folders aggressively, so a missing one
// is regenerated. Re-upload uses the SAME storage path with upsert, so the
// public URL is unchanged and slide_urls needs no edit.
//
//   node scripts/wick-fix-cta.js          fix every queued post
//   node scripts/wick-fix-cta.js --dry    report only

const DRY = process.argv.includes("--dry");
const client = new Anthropic();
const BUCKET = "agent-x-images";

// Who should this post be forwarded to? Derived from the copy already written.
async function writeSendTo(copy, format) {
  const gist = copy.pairs
    ? copy.pairs.map((p) => `"${p.top_label}" / "${p.bottom_label}"`).join("; ")
    : copy.roles ? copy.roles.map((r) => r.label).join(", ")
    : `${copy.cover_headline}: ${(copy.items ?? []).map((i) => i.title).join(", ")}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `A ${format} carousel. Its slides say: ${gist}
The rule it reveals: ${copy.hidden_rule ?? copy.closing_line ?? ""}

Write ONLY the second half of this sentence: "Send this to ___."

It must name a RECOGNIZABLE SITUATION, not a personality trait. The reader should
immediately picture one specific person in their life.

Good: the friend who got a raise and still feels broke
Bad: someone who needs to hear this

Max 12 words. No quotes, no trailing period, no em dashes. Output the phrase only.`,
    }],
  });
  return msg.content[0].text.trim()
    .replace(/^["']|["'.]+$/g, "")
    .replace(/\s*[—–]\s*/g, ", ");
}

const { data: posts, error } = await supabase.from("wick_posts")
  .select("id,batch_id,slot_index,format,copy,slide_urls,topic_id,status")
  .in("status", ["approved", "pending"])
  .order("created_at", { ascending: true });

if (error) { console.error(error.message); process.exit(1); }
if (!posts?.length) { console.log("Nothing queued."); process.exit(0); }

console.log(`${posts.length} queued post(s)\n`);
let regenerated = 0;

for (const p of posts) {
  const copy = p.copy ?? {};
  const urls = p.slide_urls ?? [];
  if (!urls.length) { console.warn(`${p.id}: no slides, skipping`); continue; }

  const sendTo = copy.send_to ?? await writeSendTo(copy, p.format);
  console.log(`${p.format.padEnd(8)} topic ${String(p.topic_id ?? "?").padEnd(3)} -> "Send this to ${sendTo}."`);
  if (DRY) continue;

  // The CTA is always the last slide. Its scene is cta.png, or recap.png for LESSON.
  const dir = tmpDir(p.batch_id, p.slot_index);
  let scenePath = [path.join(dir, "cta.png"), path.join(dir, "recap.png")].find((f) => fs.existsSync(f));

  if (!scenePath) {
    const prompt = lessonScenePrompt(copy.cta_scene ?? "stands in a quiet apartment at night beside a kitchen counter, a phone face down on the counter, a mug and a set of keys beside it", copy.cta_expression ?? "resolved and clear eyed");
    const { url } = generateScene(prompt, "4:5");
    scenePath = await download(url, path.join(dir, "cta.png"));
    regenerated++;
    console.log(`  (scene art was gone, regenerated)`);
  }

  const buf = await compositeCta({
    scenePath,
    closingLine: copy.closing_line ?? "",
    sendTo,
  });

  // Same path + upsert => same public URL, so slide_urls stays valid.
  const storagePath = new URL(urls[urls.length - 1]).pathname
    .replace(`/storage/v1/object/public/${BUCKET}/`, "");
  const { error: upErr } = await supabase.storage.from(BUCKET)
    .upload(storagePath, buf, { contentType: "image/jpeg", upsert: true });
  if (upErr) { console.warn(`  upload failed: ${upErr.message}`); continue; }

  await supabase.from("wick_posts")
    .update({ copy: { ...copy, send_to: sendTo } })
    .eq("id", p.id);
  console.log(`  rebuilt ${storagePath}`);
}

console.log(DRY ? "\nDRY RUN — nothing written." : `\nDone. ${regenerated} scene(s) regenerated.`);
process.exit(0);
