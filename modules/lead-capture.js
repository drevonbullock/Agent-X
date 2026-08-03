import "dotenv/config";
import supabase from "../supabase/client.js";
import { notifyOps } from "./notify.js";

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
// Warm leads and repeat engagers are Agent X business (Threads/LinkedIn/IG), NOT
// Wick's Wisdom content. They go to the OPS channel via notifyOps, which never
// falls back to the Wick chat — that leak is exactly what Dre reported. Set
// AGENT_TELEGRAM_CHAT_ID to receive these; until then they log and stay in
// Supabase + GHL, and the Wick chat stays clean.
async function sendTelegram(text) {
  await notifyOps(text);
}

// ─── GOHIGHLEVEL ──────────────────────────────────────────────────────────────

async function addToGHL({ name, platform, username }) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    console.warn("[LeadCapture] GHL_API_KEY or GHL_LOCATION_ID not set — skipping CRM entry");
    return null;
  }

  let contactId = null;
  try {
    const res = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId,
        firstName: name || username,
        source: `Agent X — ${platform}`,
        tags: ["agent-x-lead", platform, "repeat-engager"],
      }),
    });

    if (!res.ok) {
      console.warn(`[LeadCapture] GHL contact create failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const json = await res.json();
    contactId = json.contact?.id ?? null;
    console.log(`[LeadCapture] GHL contact created: ${contactId}`);
  } catch (err) {
    console.warn(`[LeadCapture] GHL error: ${err.message}`);
    return null;
  }

  // Add to pipeline stage if configured
  if (contactId && process.env.GHL_PIPELINE_ID && process.env.GHL_STAGE_ID) {
    try {
      await fetch("https://rest.gohighlevel.com/v1/opportunities/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipelineId: process.env.GHL_PIPELINE_ID,
          locationId,
          stageId: process.env.GHL_STAGE_ID,
          contactId,
          name: `${name || username} — ${platform} Repeat Engager`,
          status: "open",
        }),
      });
    } catch (err) {
      console.warn(`[LeadCapture] GHL pipeline add failed: ${err.message}`);
    }
  }

  return contactId;
}

// ─── DEDUP ────────────────────────────────────────────────────────────────────
// Stores captured leads in keyword_leads using a synthetic comment_id so we
// never double-alert on the same person.

async function isAlreadyCaptured(platform, commenterName) {
  const syntheticId = `lead:repeat:${platform}:${commenterName}`;
  const { data } = await supabase
    .from("keyword_leads")
    .select("id")
    .eq("comment_id", syntheticId)
    .maybeSingle();
  return !!data;
}

async function markCaptured(platform, commenterName, commentText) {
  const syntheticId = `lead:repeat:${platform}:${commenterName}`;
  await supabase.from("keyword_leads").insert({
    platform,
    comment_id: syntheticId,
    commenter_name: commenterName,
    keyword: "repeat_engager",
    comment_text: commentText,
  }).select().maybeSingle();
}

// ─── NOTIFY ───────────────────────────────────────────────────────────────────

async function captureLead({ platform, commenterName, commentCount, sampleComment }) {
  const already = await isAlreadyCaptured(platform, commenterName);
  if (already) return;

  console.log(`[LeadCapture] New warm lead: ${commenterName} on ${platform} (${commentCount} engagements)`);

  await markCaptured(platform, commenterName, sampleComment ?? "");

  const msg = [
    `🔥 *Warm Lead — Repeat Engager*`,
    ``,
    `*Name:* ${commenterName}`,
    `*Platform:* ${platform}`,
    `*Engagements:* ${commentCount} comments across your posts`,
    ``,
    `They keep showing up. Time to reach out.`,
    sampleComment ? `\n_Last comment: "${sampleComment.slice(0, 120)}"_` : "",
  ].join("\n").trim();

  await sendTelegram(msg);
  await addToGHL({ name: commenterName, platform, username: commenterName });
}

// ─── DETECTION ────────────────────────────────────────────────────────────────
// Reads the comment_replies table and surfaces anyone who has commented on
// 2+ distinct posts. Runs every hour from the scheduler.

export async function checkRepeatEngagers() {
  const { data: rows, error } = await supabase
    .from("comment_replies")
    .select("platform, commenter_name, post_id, comment_text, replied_at")
    .not("commenter_name", "is", null)
    .order("replied_at", { ascending: false });

  if (error) {
    console.warn(`[LeadCapture] Supabase fetch failed: ${error.message}`);
    return;
  }
  if (!rows?.length) return;

  // Group by (platform, commenter_name) and count distinct posts
  const map = {};
  for (const r of rows) {
    const key = `${r.platform}:${r.commenter_name}`;
    map[key] ??= { platform: r.platform, commenterName: r.commenter_name, posts: new Set(), comments: [] };
    if (r.post_id) map[key].posts.add(r.post_id);
    map[key].comments.push(r.comment_text ?? "");
  }

  let found = 0;
  for (const { platform, commenterName, posts, comments } of Object.values(map)) {
    if (posts.size < 2) continue; // must engage on 2+ distinct posts
    found++;
    await captureLead({
      platform,
      commenterName,
      commentCount: posts.size,
      sampleComment: comments[0],
    });
  }

  if (found) console.log(`[LeadCapture] ${found} repeat engager(s) processed`);
}

// CLI: node modules/lead-capture.js
const isMain = process.argv[1]?.endsWith("lead-capture.js");
if (isMain) {
  checkRepeatEngagers()
    .then(() => { console.log("[LeadCapture] Done."); process.exit(0); })
    .catch((err) => { console.error(`[LeadCapture] Fatal: ${err.message}`); process.exit(1); });
}
