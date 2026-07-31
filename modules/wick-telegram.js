import "dotenv/config";
import supabase from "../supabase/client.js";
import { decideWick } from "./wicks-wisdom.js";

// ─── WICK'S WISDOM — TELEGRAM ────────────────────────────────────────────────
// AUTO MODE (default): the Sunday batch is queued already approved and publishes
// on schedule. Telegram is a NOTIFICATION with a Pull kill switch per post, not
// a gate. Set WICK_AUTO_PUBLISH=false to restore the Approve/Reject gate.
//
// Uses long-polling (getUpdates) rather than a webhook so it works on any host
// without a public URL. Offset is persisted so restarts don't replay old taps.

const API = (m) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`;
const OFFSET_KEY = "telegram_update_offset";

function creds() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return { token, chatId, ok: !!(token && chatId) };
}

async function tg(method, body) {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

async function getOffset() {
  const { data } = await supabase.from("agent_kv").select("value").eq("key", OFFSET_KEY).maybeSingle();
  return data?.value ? parseInt(data.value, 10) : 0;
}
async function setOffset(v) {
  await supabase.from("agent_kv").upsert({ key: OFFSET_KEY, value: String(v), updated_at: new Date().toISOString() });
}

// ─── SEND THE WEEKLY BATCH FOR APPROVAL ──────────────────────────────────────

export async function sendBatchToTelegram(posts) {
  const { chatId, ok } = creds();
  if (!ok) {
    console.warn("[WickTG] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — batch stays pending at /wick");
    return false;
  }
  if (!posts?.length) return false;

  const auto = process.env.WICK_AUTO_PUBLISH !== "false";
  await tg("sendMessage", {
    chat_id: chatId,
    text: auto
      ? `🕯️ *Wick's Wisdom — weekly batch*\n${posts.length} post${posts.length === 1 ? "" : "s"} queued, publishing automatically at 9am and 12pm.\nTap Pull on anything you do not want to go out.`
      : `🕯️ *Wick's Wisdom — weekly batch*\n${posts.length} post${posts.length === 1 ? "" : "s"} ready for approval.\nNothing publishes until you tap Approve.`,
    parse_mode: "Markdown",
  });

  for (const p of posts) {
    const urls = (p.slide_urls ?? []).slice(0, 10);
    try {
      // Album of slides. Telegram caps media groups at 10, which matches IG.
      if (urls.length > 1) {
        await tg("sendMediaGroup", {
          chat_id: chatId,
          media: urls.map((u, i) => ({
            type: "photo",
            media: u,
            ...(i === 0 ? { caption: `${p.format} · ${p.pillar ?? ""} · ${urls.length} slides` } : {}),
          })),
        });
      } else if (urls.length === 1) {
        await tg("sendPhoto", {
          chat_id: chatId, photo: urls[0],
          caption: `${p.format} · ${p.pillar ?? ""}`,
        });
      }

      // Caption + decision buttons in a separate message so the buttons survive.
      await tg("sendMessage", {
        chat_id: chatId,
        text: `*${p.format}*\n\n${p.caption ?? ""}`,
        parse_mode: "Markdown",
        reply_markup: {
          // Both buttons always show. In auto mode the post is already queued,
          // so Approve is a confirmation rather than a gate, but Dre asked for
          // it: tapping it is how he marks a post as reviewed and good, instead
          // of the only available action being a rejection.
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `wick:approve:${p.id}` },
            { text: auto ? "🚫 Pull this one" : "❌ Reject", callback_data: `wick:reject:${p.id}` },
          ]],
        },
      });
    } catch (err) {
      console.warn(`[WickTG] send failed for ${p.id}: ${err.message}`);
    }
  }
  console.log(`[WickTG] Sent ${posts.length} post(s) to Telegram for approval`);
  return true;
}

// ─── POLL FOR APPROVE / REJECT TAPS ──────────────────────────────────────────

export async function pollTelegramApprovals() {
  const { ok } = creds();
  if (!ok) return;

  let updates;
  try {
    const offset = await getOffset();
    updates = await tg("getUpdates", {
      offset: offset ? offset + 1 : undefined,
      timeout: 0,
      allowed_updates: ["callback_query"],
    });
  } catch (err) {
    console.warn(`[WickTG] getUpdates failed: ${err.message}`);
    return;
  }
  if (!updates?.length) return;

  let maxId = 0;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id);
    const cq = u.callback_query;
    if (!cq?.data?.startsWith("wick:")) continue;

    const [, action, id] = cq.data.split(":");
    try {
      const status = await decideWick(id, action);
      await tg("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: status === "approved" ? "Approved — will publish on its slot" : "Pulled — will not publish",
      });
      // Replace the buttons with the decision so it can't be double-tapped.
      await tg("editMessageReplyMarkup", {
        chat_id: cq.message.chat.id,
        message_id: cq.message.message_id,
        reply_markup: { inline_keyboard: [[{
          text: status === "approved" ? "✅ Approved" : "🚫 Pulled",
          callback_data: "wick:done",
        }]] },
      }).catch(() => {});
      console.log(`[WickTG] ${id} → ${status}`);
    } catch (err) {
      console.warn(`[WickTG] decision failed for ${id}: ${err.message}`);
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Failed, try again" }).catch(() => {});
    }
  }
  if (maxId) await setOffset(maxId);
}

// ─── PUBLISH NOTIFICATION ────────────────────────────────────────────────────

export async function notifyPublished(post, postUrl) {
  const { chatId, ok } = creds();
  if (!ok) return;
  await tg("sendMessage", {
    chat_id: chatId,
    text: `🕯️ Published *${post.format}*\n${postUrl}`,
    parse_mode: "Markdown",
  }).catch(() => {});
}

// CLI: node modules/wick-telegram.js [--poll|--test]
if (process.argv[1]?.endsWith("wick-telegram.js")) {
  const run = async () => {
    if (process.argv.includes("--test")) {
      const { chatId } = creds();
      await tg("sendMessage", { chat_id: chatId, text: "🕯️ Wick's Wisdom connected." });
      console.log("sent");
      return;
    }
    await pollTelegramApprovals();
  };
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
