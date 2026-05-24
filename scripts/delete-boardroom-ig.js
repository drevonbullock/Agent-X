/**
 * One-shot script: delete all boardroom/comic image posts from Instagram + Supabase.
 * Targets: platform="instagram", format="news_reaction", post_type="image"
 * Reels and carousels are intentionally excluded.
 *
 * Usage: node scripts/delete-boardroom-ig.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const IG_API = "https://graph.instagram.com/v22.0";
const TOKEN  = process.env.INSTAGRAM_ACCESS_TOKEN;

async function deleteFromInstagram(mediaId) {
  const res = await fetch(`${IG_API}/${mediaId}?access_token=${TOKEN}`, {
    method: "DELETE",
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  // 1. Fetch all Instagram boardroom/comic image posts from DB
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, post_id, post_url, hook, created_at")
    .eq("platform", "instagram")
    .eq("format", "news_reaction")
    .eq("post_type", "image")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB query failed:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("No boardroom/comic Instagram posts found in DB.");
    return;
  }

  console.log(`Found ${posts.length} boardroom/comic Instagram post(s):\n`);
  posts.forEach((p, i) => {
    console.log(`  [${i + 1}] ID: ${p.post_id ?? "(no id)"} | ${p.post_url ?? "(no url)"}`);
    console.log(`       Hook: ${p.hook ?? "(none)"}`);
    console.log(`       Created: ${p.created_at}\n`);
  });

  const dbIdsToDelete = [];
  const manualDeleteNeeded = [];

  // 2. Attempt Instagram API deletion for each
  for (const post of posts) {
    if (!post.post_id) {
      console.warn(`  [skip] DB row ${post.id} has no post_id — will remove from DB only`);
      dbIdsToDelete.push(post.id);
      continue;
    }

    process.stdout.write(`  Deleting IG media ${post.post_id}... `);
    try {
      const { ok, status, body } = await deleteFromInstagram(post.post_id);
      if (ok || body.includes("true")) {
        console.log(`OK (${status})`);
        dbIdsToDelete.push(post.id);
      } else {
        console.log(`FAILED (${status}): ${body.slice(0, 120)}`);
        manualDeleteNeeded.push(post);
        dbIdsToDelete.push(post.id); // remove from DB regardless
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      manualDeleteNeeded.push(post);
      dbIdsToDelete.push(post.id);
    }
  }

  // 3. Remove all matched rows from Supabase
  if (dbIdsToDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("posts")
      .delete()
      .in("id", dbIdsToDelete);

    if (delErr) {
      console.error(`\nDB delete failed: ${delErr.message}`);
    } else {
      console.log(`\nRemoved ${dbIdsToDelete.length} row(s) from Supabase posts table.`);
    }
  }

  // 4. Report anything needing manual action
  if (manualDeleteNeeded.length > 0) {
    console.log(`\n⚠  ${manualDeleteNeeded.length} post(s) need manual deletion from Instagram app:`);
    manualDeleteNeeded.forEach((p) => {
      console.log(`   ${p.post_url ?? p.post_id}`);
    });
  } else {
    console.log("All posts deleted successfully.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
