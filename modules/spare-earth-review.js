import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── SPARE EARTH — FINAL-CUT REVIEW ON TELEGRAM ──────────────────────────────
// A finished What-If reel is inserted into `scheduled_reels` as ONE row:
//   platform = 'instagram', status = 'pending_review'   (publish_at is a placeholder)
//
// This module:
//   1. sends that reel to Dre's Telegram chat with Approve / Pull buttons
//   2. on Approve: gives it the next open 10am / 5pm ET slot and sets it to
//      'queued', which is the status spare-earth-queue.js posts from
//   3. on Pull: sets it to 'rejected' and saves Dre's next message as the note
//      that goes into the next build. A delivered video is never rebuilt.
//
// Nothing here publishes. The only thing that publishes is spare-earth-queue.js.
//
// Self-contained on purpose (its own small Telegram helper, no Wick imports), so
// it can be lifted into a Spare Earth repo later without untangling anything.

const TABLE = "scheduled_reels";
const TZ = "America/New_York";
const SLOT_HOURS = [10, 17];                 // 10am and 5pm ET
const LEAD_MS = 30 * 60 * 1000;              // a slot under 30 min away is skipped
const NOTE_WINDOW_MS = 30 * 60 * 1000;       // how long a Pull waits for its note
const FOLLOW_MIN = 30;                       // other platforms post this long after Instagram
const KNOWN_PLATFORMS = ["instagram", "youtube", "tiktok"];

// ─── PURE HELPERS (tested in test/spare-earth-review.test.js) ────────────────

// The wall-clock date and time in New York for an instant.
export function etParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

// The instant a New York wall-clock hour happens on a given New York date.
// Handles daylight saving: 10am ET is 15:00 UTC in winter and 14:00 UTC in summer.
export function slotToUtc(y, m, d, hour) {
  const guess = Date.UTC(y, m - 1, d, hour);
  const p = etParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - guess;   // negative in the US
  return new Date(guess - offset);
}

// The earliest 10am / 5pm ET slot that is at least 30 minutes away and not taken.
export function nextOpenSlot(taken, now = new Date()) {
  const used = new Set((taken ?? []).map((t) => new Date(t).getTime()));
  const today = etParts(now);
  for (let i = 0; i < 120; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    for (const hour of SLOT_HOURS) {
      const slot = slotToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour);
      if (slot.getTime() - now.getTime() < LEAD_MS) continue;
      if (used.has(slot.getTime())) continue;
      return slot;
    }
  }
  throw new Error("no open slot in the next 120 days");
}

// Which platforms an approved reel is queued for. Instagram is always first.
// YouTube and TikTok are added by env only once their posting is proven to work,
// so a reel is never queued for a platform that cannot post it.
export function enabledPlatforms(raw = process.env.SPARE_EARTH_PLATFORMS) {
  const asked = String(raw ?? "").toLowerCase().split(",").map((s) => s.trim());
  return ["instagram", ...KNOWN_PLATFORMS.filter((p) => p !== "instagram" && asked.includes(p))];
}

// "se:approve:12" → { action: "approve", id: 12 }. Anything else → null.
export function parseCallback(data) {
  const m = /^se:(approve|reject):(\d+)$/.exec(String(data ?? ""));
  return m ? { action: m[1], id: parseInt(m[2], 10) } : null;
}

// The text under the video. Plain text only: Telegram's Markdown parser drops a
// whole message on one stray apostrophe.
export function reviewText(row) {
  return `FINAL CUT · #${row.n}\n${row.title}\n\n${row.caption ?? ""}`.slice(0, 4000);
}

export function fmtEt(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date) + " ET";
}

// ─── TELEGRAM ────────────────────────────────────────────────────────────────

function creds() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return { token, chatId, ok: !!(token && chatId) };
}

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

// Telegram only fetches a video by URL up to 20 MB. A bigger final cut falls
// back to the cover image plus a link, so the review always arrives.
async function sendCut(chatId, row) {
  const head = `#${row.n} · ${row.title}`.slice(0, 1000);
  try {
    await tg("sendVideo", { chat_id: chatId, video: row.video_url, caption: head, supports_streaming: true });
    return "video";
  } catch (err) {
    console.warn(`[SpareEarthReview] #${row.n} video send failed (${err.message}), sending a link instead`);
  }
  const withLink = `${head}\n\nWatch: ${row.video_url}`.slice(0, 1000);
  if (row.cover_url) {
    try {
      await tg("sendPhoto", { chat_id: chatId, photo: row.cover_url, caption: withLink });
      return "cover";
    } catch (err) {
      console.warn(`[SpareEarthReview] #${row.n} cover send failed (${err.message})`);
    }
  }
  await tg("sendMessage", { chat_id: chatId, text: withLink });
  return "link";
}

// ─── 1. DELIVER PENDING REVIEWS ──────────────────────────────────────────────
// Called by the scheduler every 2 minutes. Each row is claimed first
// (telegram_sent_at null → now), so two ticks can never send the same reel twice.
// A failed send releases the claim and the next tick tries again.
export async function sendPendingReviews({ now = new Date() } = {}) {
  const { chatId, ok } = creds();
  if (!ok) { console.warn("[SpareEarthReview] Telegram not configured, reviews stay pending"); return 0; }

  const { data: rows, error } = await supabase.from(TABLE).select("*")
    .eq("platform", "instagram").eq("status", "pending_review").is("telegram_sent_at", null)
    .order("created_at").limit(3);
  if (error) throw new Error(`review read failed: ${error.message}`);

  let sent = 0;
  for (const row of rows ?? []) {
    const { data: claimed, error: cErr } = await supabase.from(TABLE)
      .update({ telegram_sent_at: now.toISOString() })
      .eq("id", row.id).is("telegram_sent_at", null).select("id");
    if (cErr) { console.warn(`[SpareEarthReview] claim failed for #${row.n}: ${cErr.message}`); continue; }
    if (!claimed?.length) continue;

    try {
      const how = await sendCut(chatId, row);
      await tg("sendMessage", {
        chat_id: chatId,
        text: reviewText(row),
        reply_markup: { inline_keyboard: [[
          { text: "✅ Approve", callback_data: `se:approve:${row.id}` },
          { text: "🚫 Pull", callback_data: `se:reject:${row.id}` },
        ]] },
      });
      console.log(`[SpareEarthReview] #${row.n} sent for review (${how})`);
      sent++;
    } catch (err) {
      console.error(`[SpareEarthReview] #${row.n} could not be sent: ${err.message}`);
      await supabase.from(TABLE).update({ telegram_sent_at: null }).eq("id", row.id);
    }
  }
  return sent;
}

// ─── 2 + 3. APPROVE / PULL ───────────────────────────────────────────────────
// Returns { status, text }. status is "approved", "rejected" or "stale".
export async function decideReview(action, id, { now = new Date() } = {}) {
  const { data: row, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`review lookup failed: ${error.message}`);
  if (!row) return { status: "stale", text: "That reel is no longer in the queue." };
  if (row.status !== "pending_review") {
    return { status: "stale", text: `#${row.n} was already decided (${row.status}).` };
  }

  if (action === "reject") {
    const { data: done, error: rErr } = await supabase.from(TABLE)
      .update({ status: "rejected", reviewed_at: now.toISOString() })
      .eq("id", id).eq("status", "pending_review").select("id");
    if (rErr) throw new Error(`pull failed: ${rErr.message}`);
    if (!done?.length) return { status: "stale", text: `#${row.n} was already decided.` };
    return {
      status: "rejected",
      text: `Pulled #${row.n}. It will not post.\n\nReply with what was wrong and it goes into the next build.`,
    };
  }

  // Approve: the next slot no other Instagram reel already holds.
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: held, error: hErr } = await supabase.from(TABLE).select("publish_at")
    .eq("platform", "instagram").in("status", ["queued", "posting", "posted"]).gte("publish_at", since);
  if (hErr) throw new Error(`slot read failed: ${hErr.message}`);
  const slot = nextOpenSlot((held ?? []).map((r) => r.publish_at), now);

  // Conditional on pending_review, so a double tap approves once.
  const { data: done, error: aErr } = await supabase.from(TABLE)
    .update({ status: "queued", publish_at: slot.toISOString(), reviewed_at: now.toISOString(), error: null })
    .eq("id", id).eq("status", "pending_review").select("id");
  if (aErr) throw new Error(`approve failed: ${aErr.message}`);
  if (!done?.length) return { status: "stale", text: `#${row.n} was already decided.` };

  // The same reel for every other enabled platform, half an hour behind Instagram.
  const others = enabledPlatforms().filter((p) => p !== "instagram");
  if (others.length) {
    const follow = new Date(slot.getTime() + FOLLOW_MIN * 60 * 1000).toISOString();
    const { error: sErr } = await supabase.from(TABLE).upsert(
      others.map((platform) => ({
        n: row.n, title: row.title, platform, video_url: row.video_url, cover_url: row.cover_url,
        caption: row.caption, publish_at: follow, status: "queued",
      })),
      { onConflict: "platform,n", ignoreDuplicates: true },
    );
    if (sErr) {
      console.error(`[SpareEarthReview] #${row.n} approved for Instagram but ${others.join(" + ")} rows failed: ${sErr.message}`);
      return {
        status: "approved",
        text: `Approved #${row.n}. Instagram posts ${fmtEt(slot)}.\n\n⚠️ Could not queue ${others.join(" + ")}: ${sErr.message}`,
      };
    }
  }
  const where = ["Instagram", ...others.map((p) => (p === "youtube" ? "YouTube" : "TikTok"))].join(", ");
  return { status: "approved", text: `Approved #${row.n}. Posts ${fmtEt(slot)} (${where}).` };
}

// A button tap from the Telegram poller. Never throws: a tap must not break the poll.
export async function handleReviewTap(cq) {
  const parsed = parseCallback(cq?.data);
  if (!parsed) return;                          // "se:done:0" on an already-decided message
  const chatId = cq.message?.chat?.id;
  let result;
  try {
    result = await decideReview(parsed.action, parsed.id);
  } catch (err) {
    console.error(`[SpareEarthReview] decision failed for ${parsed.id}: ${err.message}`);
    result = { status: "error", text: `That did not go through: ${err.message}` };
  }
  // The callback answer expires after about a minute, so it often fails. Cosmetic.
  await tg("answerCallbackQuery", { callback_query_id: cq.id }).catch(() => {});
  if (result.status === "approved" || result.status === "rejected") {
    await tg("editMessageReplyMarkup", {
      chat_id: chatId, message_id: cq.message.message_id,
      reply_markup: { inline_keyboard: [[{
        text: result.status === "approved" ? "✅ Approved" : "🚫 Pulled", callback_data: "se:done:0",
      }]] },
    }).catch((e) => console.warn(`[SpareEarthReview] could not update buttons: ${e.message}`));
  }
  await tg("sendMessage", { chat_id: chatId, text: result.text })
    .catch((e) => console.warn(`[SpareEarthReview] could not confirm: ${e.message}`));
  console.log(`[SpareEarthReview] ${parsed.id} → ${result.status}`);
}

// A plain message right after a Pull is the note for the next build. Returns the
// reply to send, or null when the message is not a note (a slash command, or no
// reel was pulled in the last 30 minutes) so the caller carries on as before.
export async function captureRejectNote(text, { now = new Date() } = {}) {
  const note = String(text ?? "").trim();
  if (!note || note.startsWith("/")) return null;
  const since = new Date(now.getTime() - NOTE_WINDOW_MS).toISOString();
  const { data: rows, error } = await supabase.from(TABLE).select("id,n")
    .eq("status", "rejected").is("review_note", null).gte("reviewed_at", since)
    .order("reviewed_at", { ascending: false }).limit(1);
  if (error) { console.warn(`[SpareEarthReview] note lookup failed: ${error.message}`); return null; }
  const row = rows?.[0];
  if (!row) return null;
  const { error: uErr } = await supabase.from(TABLE).update({ review_note: note.slice(0, 1000) }).eq("id", row.id);
  if (uErr) return `Could not save that note for #${row.n}: ${uErr.message}`;
  return `Noted for #${row.n}. It goes into the next build.`;
}
