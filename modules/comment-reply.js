import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { getLinkedInComments, postCommentToLinkedIn } from "../agent/post-to-linkedin.js";

const client = new Anthropic();

const THREADS_API = "https://graph.threads.net/v1.0";
const CTA_KEYWORDS = ["AUTOMATE", "CLAUDE", "MAKE", "AGENTS", "TOOLS"];

const REPLY_SYSTEM = `You are Dre'von Bullock — AI automation builder in New York.
Someone commented on your social post. Write a reply.

Rules:
- Max 2 sentences. Never more.
- Direct. Adds real value or moves the conversation forward.
- Never say "great question", "thanks for commenting", or anything sycophantic.
- No em dashes. No filler. Sound like a real person texting back.
- If they asked a question: answer it specifically or point them somewhere useful.
- If they left a compliment: acknowledge briefly and add one insight.
- If they disagree: engage the idea, not the person.`;

// ─── CLAUDE REPLY GENERATION ──────────────────────────────────────────────────

export async function generateReply(commentText, postContext = "") {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    system: REPLY_SYSTEM,
    messages: [{
      role: "user",
      content: `Post context: "${postContext.slice(0, 200)}"\nComment: "${commentText}"`,
    }],
  });
  return msg.content[0].text.trim();
}

// ─── DEDUP CHECK ──────────────────────────────────────────────────────────────

async function hasReplied(commentId) {
  const { data } = await supabase
    .from("comment_replies")
    .select("id")
    .eq("comment_id", commentId)
    .maybeSingle();
  return !!data;
}

// ─── LOG REPLY ────────────────────────────────────────────────────────────────

async function logReply({ platform, commentId, postId, commenterName, commentText, replyText }) {
  await supabase.from("comment_replies").insert({
    platform,
    comment_id: commentId,
    post_id: postId,
    commenter_name: commenterName,
    comment_text: commentText,
    reply_text: replyText,
  });
}

// ─── KEYWORD LEAD LOG ─────────────────────────────────────────────────────────

async function logKeywordLead({ platform, commentId, postId, commenterName, commenterId, keyword, commentText }) {
  try {
    const { error } = await supabase.from("keyword_leads").insert({
      platform,
      comment_id: commentId,
      post_id: postId,
      commenter_name: commenterName,
      commenter_id: commenterId,
      keyword,
      comment_text: commentText,
    });
    if (error && !error.message.includes("duplicate")) {
      console.warn(`[CommentReply] keyword_leads insert failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[CommentReply] keyword_leads insert failed: ${err.message}`);
  }
}

function detectKeyword(text) {
  const upper = text.toUpperCase();
  return CTA_KEYWORDS.find((kw) => upper.includes(kw)) ?? null;
}

// ─── INSTAGRAM WEBHOOK HANDLER ────────────────────────────────────────────────
// Called by the HTTP server in index.js when a POST arrives at /webhook/instagram.

export async function handleInstagramWebhook(body) {
  const entries = body?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      if (change.field !== "comments") continue;
      const { id: commentId, text, from, media_id: postId } = change.value ?? {};
      if (!commentId || !text) continue;

      if (await hasReplied(commentId)) continue;

      const keyword = detectKeyword(text);
      if (keyword) {
        console.log(`[CommentReply] IG keyword "${keyword}" from ${from?.username ?? "?"}`);
        await logKeywordLead({
          platform: "instagram",
          commentId,
          postId,
          commenterName: from?.username,
          commenterId: from?.id,
          keyword,
          commentText: text,
        });
      }

      try {
        const reply = await generateReply(text);
        await postInstagramReply(commentId, reply);
        await logReply({
          platform: "instagram",
          commentId,
          postId,
          commenterName: from?.username,
          commentText: text,
          replyText: reply,
        });
        console.log(`[CommentReply] IG replied to ${commentId}: "${reply.slice(0, 60)}..."`);
      } catch (err) {
        console.error(`[CommentReply] IG reply failed (${commentId}): ${err.message}`);
      }
    }
  }
}

async function postInstagramReply(commentId, replyText) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not set");
  const res = await fetch(`https://graph.instagram.com/v22.0/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: replyText, access_token: token }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`IG reply API failed (${res.status}): ${err}`);
  }
}

// ─── THREADS REPLY POLLER ─────────────────────────────────────────────────────
// Polls recent posts every 15 min, then fetches incoming replies per post.
// Uses /{postId}/replies (incoming) NOT /{userId}/replies (outgoing — that
// endpoint returns the account's own posts and caused a self-reply loop).

export async function pollThreadsReplies() {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;
  const ownUsername = process.env.THREADS_USERNAME ?? "drevonbullock.ai";
  if (!token || !userId) return;

  console.log(`[CommentReply] Polling Threads incoming replies...`);

  // Step 1: fetch recent posts
  let posts;
  try {
    const res = await fetch(
      `${THREADS_API}/${userId}/threads?fields=id,text,timestamp&limit=10&access_token=${token}`
    );
    if (!res.ok) throw new Error(`Threads threads API failed (${res.status})`);
    const data = await res.json();
    posts = data.data ?? [];
  } catch (err) {
    console.error(`[CommentReply] Threads poll failed: ${err.message}`);
    return;
  }

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  let processed = 0;

  // Step 2: for each post, fetch replies on that post (incoming comments)
  for (const post of posts) {
    let replies;
    try {
      const res = await fetch(
        `${THREADS_API}/${post.id}/replies?fields=id,text,username,timestamp&limit=25&access_token=${token}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      replies = data.data ?? [];
    } catch {
      continue;
    }

    for (const reply of replies) {
      const { id: commentId, text, username } = reply;
      if (!commentId || !text) continue;

      // skip our own replies to avoid self-reply loop
      if (username === ownUsername) continue;

      // skip old replies
      if (reply.timestamp && new Date(reply.timestamp).getTime() < cutoff) continue;

      if (await hasReplied(commentId)) continue;

      const keyword = detectKeyword(text);
      if (keyword) {
        console.log(`[CommentReply] Threads keyword "${keyword}" from @${username ?? "?"}`);
        await logKeywordLead({
          platform: "threads",
          commentId,
          postId: post.id,
          commenterName: username,
          commenterId: null,
          keyword,
          commentText: text,
        });
      }

      try {
        const replyText = await generateReply(text, post.text ?? "");
        await postThreadsReply(userId, token, commentId, replyText);
        await logReply({
          platform: "threads",
          commentId,
          postId: post.id,
          commenterName: username,
          commentText: text,
          replyText,
        });
        console.log(`[CommentReply] Threads replied to ${commentId}: "${replyText.slice(0, 60)}..."`);
        processed++;
      } catch (err) {
        console.error(`[CommentReply] Threads reply failed (${commentId}): ${err.message}`);
      }
    }
  }

  if (processed > 0) console.log(`[CommentReply] Threads: ${processed} replies sent`);
}

async function postThreadsReply(userId, token, replyToId, text) {
  // Step 1: Create reply container
  const url = new URL(`${THREADS_API}/${userId}/threads`);
  url.searchParams.set("media_type", "TEXT");
  url.searchParams.set("text", text.slice(0, 500));
  url.searchParams.set("reply_to_id", replyToId);
  url.searchParams.set("access_token", token);

  const createRes = await fetch(url.toString(), { method: "POST" });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Threads reply container failed (${createRes.status}): ${body}`);
  }
  const { id: containerId } = await createRes.json();

  // Step 2: Publish
  const pubUrl = new URL(`${THREADS_API}/${userId}/threads_publish`);
  pubUrl.searchParams.set("creation_id", containerId);
  pubUrl.searchParams.set("access_token", token);

  const pubRes = await fetch(pubUrl.toString(), { method: "POST" });
  if (!pubRes.ok) {
    const body = await pubRes.text();
    throw new Error(`Threads reply publish failed (${pubRes.status}): ${body}`);
  }
}

// ─── LINKEDIN COMMENT AUTO-REPLY ──────────────────────────────────────────────
// LinkedIn's #1 ranking signal is the AUTHOR replying to comments, fast. Polls
// our LinkedIn posts from the last 24h and replies to any new comment. Deduped
// via comment_replies, same as Threads. Also captures CTA-keyword leads.

export async function pollLinkedInComments() {
  // LinkedIn's comment API (socialActions) needs the gated Community Management
  // API product — w_member_social does NOT grant it (confirmed 403 ACCESS_DENIED
  // 2026-07-29). Stays off until LINKEDIN_COMMENT_API=true (i.e. access granted).
  if (process.env.LINKEDIN_COMMENT_API !== "true") return;
  if (!process.env.LINKEDIN_ACCESS_TOKEN) return;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("post_id, content")
    .eq("platform", "linkedin")
    .gte("created_at", since)
    .not("post_id", "is", null);
  if (error || !posts?.length) return;

  let replied = 0;
  for (const p of posts) {
    let comments;
    try { comments = await getLinkedInComments(p.post_id); }
    catch { continue; } // post may be too new or comments disabled
    for (const c of comments) {
      if (c.actor === personUrn) continue;      // skip our own comments/seed
      if (await hasReplied(c.id)) continue;

      const kw = detectKeyword(c.text);
      if (kw) {
        await logKeywordLead({
          platform: "linkedin", commentId: c.id, postId: p.post_id,
          commenterName: c.actor, commenterId: c.actor, keyword: kw, commentText: c.text,
        });
      }
      try {
        const reply = await generateReply(c.text, p.content ?? "");
        await postCommentToLinkedIn(p.post_id, reply, c.id);
        await logReply({
          platform: "linkedin", commentId: c.id, postId: p.post_id,
          commenterName: c.actor, commentText: c.text, replyText: reply,
        });
        replied++;
      } catch (err) {
        console.warn(`[LinkedInReply] reply failed: ${err.message}`);
      }
    }
  }
  if (replied) console.log(`[LinkedInReply] replied to ${replied} comment(s)`);
}
