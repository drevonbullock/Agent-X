import "dotenv/config";
import supabase from "../supabase/client.js";
import { writeCaption } from "../modules/wick-copy.js";

// Rewrites the caption on every queued Wick post using the CURRENT caption
// formula, without touching the art.
//
// Captions live in wick_posts.caption and the slides are already rendered and
// uploaded, so the caption can be changed any time before publish for the cost
// of a few Claude calls. A batch that was generated under an older formula does
// not need re-rolling; it needs re-captioning.
//
//   node scripts/wick-recaption.js           rewrite every unpublished post
//   node scripts/wick-recaption.js --dry     print what it would write

const DRY = process.argv.includes("--dry");

const { data: posts, error } = await supabase.from("wick_posts")
  .select("id,format,caption,copy,topic_id,status")
  .in("status", ["approved", "pending"])
  .order("created_at", { ascending: true });

if (error) { console.error(error.message); process.exit(1); }
if (!posts?.length) { console.log("Nothing queued."); process.exit(0); }

console.log(`${posts.length} queued post(s)\n`);

for (const p of posts) {
  const caption = await writeCaption({ format: p.format, copy: p.copy });
  console.log("─".repeat(70));
  console.log(`${p.format}  topic ${p.topic_id ?? "?"}  (${p.caption?.length ?? 0} -> ${caption.length} chars)`);
  console.log(caption);
  console.log();
  if (!DRY) {
    const { error: e } = await supabase.from("wick_posts").update({ caption }).eq("id", p.id);
    if (e) console.warn(`  update failed: ${e.message}`);
  }
}

console.log(DRY ? "\nDRY RUN — nothing written." : "\nCaptions updated.");
process.exit(0);
