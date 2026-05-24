import supabase from "./client.js";

// Shared post-logging helper. Every successful publish (direct or via the video
// review queue) records a row in `posts`, which drives cadence + learning.
export async function logPost({ postId, postUrl, postText, format, postType, platform = "linkedin", designVariant = null }) {
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
  });
  if (error) console.warn(`[Agent X] Supabase log failed (${platform}): ${error.message}`);
}
