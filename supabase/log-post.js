import supabase from "./client.js";

// Shared post-logging helper. Every successful publish (direct or via the video
// review queue) records a row in `posts`, which drives cadence + learning.
// `variant` is the content-shape A/B tag (Threads provoke vs invite).
// `designVariant` is the separate visual/copy-style tag the optimizer uses.
// Keeping them apart matters: one asks "which shape earns real replies", the
// other asks "which theme performs", and merging them would make both unreadable.
export async function logPost({ postId, postUrl, postText, format, postType, platform = "linkedin", designVariant = null, variant = null }) {
  const hook = (postText ?? "").split(/[.!?\n]/)[0].trim().slice(0, 200);
  const { error } = await supabase.from("posts").insert({
    content: postText,
    platform,
    post_type: postType,
    hook,
    format,
    post_id: postId,
    post_url: postUrl,
    design_variant: designVariant,
    variant,
  });
  if (error) console.warn(`[Agent X] Supabase log failed (${platform}): ${error.message}`);
}
