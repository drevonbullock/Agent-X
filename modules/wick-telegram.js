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

// One post, delivered the moment it exists. This is the unit that matters:
// a batch runs for hours, so waiting for the whole run to finish meant finished
// posts sat invisible in the database while Dre had nothing to look at.
// `force` is for a deliberate resend, e.g. after a caption is rewritten or a
// slide is rebuilt. Everything else is deduplicated: several callers can try to
// deliver the same post (the build's own push, a watcher, a manual sweep) and
// only the first one lands. Without this the chat filled with the same post
// three times over.
export async function sendPostToTelegram(p, { force = false } = {}) {
  const { chatId, ok } = creds();
  if (!ok) {
    console.warn("[WickTG] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — post stays at /wick");
    return false;
  }

  if (!force && p.telegram_sent_at) {
    console.log(`[WickTG] ${p.id} already sent ${new Date(p.telegram_sent_at).toISOString()} — skipping`);
    return false;
  }
  // Claim the send BEFORE doing it. Two callers racing would otherwise both read
  // a null timestamp and both deliver.
  if (!force) {
    const { data: claimed } = await supabase.from("wick_posts")
      .update({ telegram_sent_at: new Date().toISOString(), telegram_send_count: (p.telegram_send_count ?? 0) + 1 })
      .eq("id", p.id).is("telegram_sent_at", null).select("id").maybeSingle();
    if (!claimed) {
      console.log(`[WickTG] ${p.id} claimed by another sender — skipping`);
      return false;
    }
  } else {
    await supabase.from("wick_posts").update({
      telegram_sent_at: new Date().toISOString(),
      telegram_send_count: (p.telegram_send_count ?? 0) + 1,
    }).eq("id", p.id);
  }

  const auto = process.env.WICK_AUTO_PUBLISH !== "false";
  const urls = (p.slide_urls ?? []).slice(0, 10);
  try {
    if (urls.length > 1) {
      await tg("sendMediaGroup", {
        chat_id: chatId,
        media: urls.map((u, i) => ({
          type: "photo", media: u,
          ...(i === 0 ? { caption: `${p.format} · ${p.pillar ?? ""} · ${urls.length} slides` } : {}),
        })),
      });
    } else if (urls.length === 1) {
      await tg("sendPhoto", { chat_id: chatId, photo: urls[0], caption: `${p.format} · ${p.pillar ?? ""}` });
    }
    await tg("sendMessage", {
      chat_id: chatId,
      text: `${p.format}\n\n${p.caption ?? ""}`,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `wick:approve:${p.id}` },
          { text: auto ? "🚫 Pull this one" : "❌ Reject", callback_data: `wick:reject:${p.id}` },
        ]],
      },
    });
    return true;
  } catch (err) {
    console.warn(`[WickTG] send failed for ${p.id}: ${err.message}`);
    // Release the claim so a later attempt can retry rather than the post being
    // marked delivered when nothing arrived.
    await supabase.from("wick_posts").update({ telegram_sent_at: null }).eq("id", p.id);
    return false;
  }
}

export async function sendBatchToTelegram(posts, { force = false } = {}) {
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
      ? `🕯️ *Wick's Wisdom*\n${posts.length} post${posts.length === 1 ? "" : "s"} queued, publishing automatically at 9am and 12pm.\nTap Pull on anything you do not want to go out.`
      : `🕯️ *Wick's Wisdom*\n${posts.length} post${posts.length === 1 ? "" : "s"} ready for approval.\nNothing publishes until you tap Approve.`,
    parse_mode: "Markdown",
  });

  let sent = 0, skipped = 0;
  for (const p of posts) (await sendPostToTelegram(p, { force })) ? sent++ : skipped++;
  console.log(`[WickTG] Sent ${sent} post(s)${skipped ? `, skipped ${skipped} already delivered` : ""}`);
  return true;
}

// Retained for the old call shape used by scripts.
async function _legacyBatchBody(posts, chatId, auto) {
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
      allowed_updates: ["callback_query", "message"],
    });
  } catch (err) {
    console.warn(`[WickTG] getUpdates failed: ${err.message}`);
    return;
  }
  if (!updates?.length) return;

  const owner = String(creds().chatId);
  let maxId = 0;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id);

    // ── Slash commands, so the whole system is runnable from a phone ───────
    // The bot username is public. Only the configured chat may drive it,
    // otherwise a stranger could pause publishing or burn image credits.
    if (u.message?.text) {
      const from = String(u.message.chat.id);
      if (from !== owner) {
        console.warn(`[WickTG] ignoring command from unauthorised chat ${from}`);
        continue;
      }
      try {
        const { runCommand } = await import("./wick-commands.js");
        const reply = await runCommand(u.message.text);
        if (reply) await tg("sendMessage", { chat_id: from, text: reply, parse_mode: "Markdown" });
      } catch (err) {
        console.warn(`[WickTG] command failed: ${err.message}`);
        await tg("sendMessage", { chat_id: from, text: `Failed: ${err.message}` }).catch(() => {});
      }
      continue;
    }

    const cq = u.callback_query;
    if (!cq?.data?.startsWith("wick:") && !cq?.data?.startsWith("reel:")) continue;

    const [kind, action, id] = cq.data.split(":");
    try {
      const status = kind === "reel"
        ? await (async () => {
            const s = action === "approve" ? "approved" : "rejected";
            const { error } = await supabase.from("wick_reels").update({ status: s }).eq("id", id);
            if (error) throw new Error(error.message);
            return s;
          })()
        : await decideWick(id, action);

      // A callback query expires after about 60 seconds, and this poller runs on
      // an interval, so answering it usually fails. That is cosmetic and MUST NOT
      // abort the rest: previously the throw skipped the button update, so a tap
      // silently changed the database while the UI never moved and the log
      // claimed the decision had failed when it had actually succeeded.
      await tg("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: status === "approved" ? "Approved" : "Pulled",
      }).catch(() => {});

      // This is the feedback that actually matters, and it never expires.
      await tg("editMessageReplyMarkup", {
        chat_id: cq.message.chat.id,
        message_id: cq.message.message_id,
        reply_markup: { inline_keyboard: [[{
          text: status === "approved" ? "✅ Approved" : "🚫 Pulled",
          callback_data: "wick:done",
        }]] },
      }).catch((e) => console.warn(`[WickTG] could not update buttons for ${id}: ${e.message}`));

      console.log(`[WickTG] ${id} → ${status}`);
    } catch (err) {
      console.warn(`[WickTG] decision failed for ${id}: ${err.message}`);
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

// Sent once a batch finishes. Each post was already delivered as it was built,
// so this only closes the loop with a count and the publish cadence.
export async function notifyBatchDone(posts) {
  const { chatId, ok } = creds();
  if (!ok || !posts?.length) return;
  const byFormat = posts.reduce((m, p) => ({ ...m, [p.format]: (m[p.format] ?? 0) + 1 }), {});
  const mix = Object.entries(byFormat).map(([f, n]) => `${n} ${f}`).join(", ");
  const days = Math.ceil(posts.length / 2);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `🕯️ *Batch complete*\n${posts.length} posts (${mix})\nThat is ~${days} day${days === 1 ? "" : "s"} at 2/day.\n\nSend /queue any time to see what is waiting.`,
    parse_mode: "Markdown",
  }).catch(() => {});
}

// A reel is a cover plus its thumbnail, sent as a pair so the thumbnail can be
// judged against the cover it belongs to. Same dedup rule as posts: claimed
// before delivery so several callers cannot double-send.
export async function sendReelToTelegram(r, { force = false } = {}) {
  const { chatId, ok } = creds();
  if (!ok) {
    console.warn("[WickTG] Telegram not configured — reel stays queued");
    return false;
  }
  if (!force && r.telegram_sent_at) {
    console.log(`[WickTG] reel ${r.id} already sent — skipping`);
    return false;
  }
  if (!force) {
    const { data: claimed } = await supabase.from("wick_reels")
      .update({ telegram_sent_at: new Date().toISOString(), telegram_send_count: (r.telegram_send_count ?? 0) + 1 })
      .eq("id", r.id).is("telegram_sent_at", null).select("id").maybeSingle();
    if (!claimed) { console.log(`[WickTG] reel ${r.id} claimed elsewhere — skipping`); return false; }
  } else {
    await supabase.from("wick_reels").update({
      telegram_sent_at: new Date().toISOString(),
      telegram_send_count: (r.telegram_send_count ?? 0) + 1,
    }).eq("id", r.id);
  }

  const media = [r.cover_url, r.thumb_url].filter(Boolean);
  try {
    if (media.length > 1) {
      await tg("sendMediaGroup", {
        chat_id: chatId,
        media: media.map((u, i) => ({
          type: "photo", media: u,
          ...(i === 0 ? { caption: `REEL · ${r.layout.toUpperCase()}${r.suited ? " · suit" : ""} · cover + thumbnail` } : {}),
        })),
      });
    } else if (media.length === 1) {
      await tg("sendPhoto", { chat_id: chatId, photo: media[0], caption: `REEL · ${r.layout.toUpperCase()}` });
    }
    await tg("sendMessage", {
      chat_id: chatId,
      text: `REEL · ${r.layout.toUpperCase()}\n\n${r.caption ?? ""}`,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `reel:approve:${r.id}` },
          { text: "🚫 Pull this one", callback_data: `reel:reject:${r.id}` },
        ]],
      },
    });
    return true;
  } catch (err) {
    console.warn(`[WickTG] reel send failed for ${r.id}: ${err.message}`);
    await supabase.from("wick_reels").update({ telegram_sent_at: null }).eq("id", r.id);
    return false;
  }
}

// ─── ALERTS — the system must say when it did NOT do something ───────────────
// 2026-08-09: Dre found the queue empty and had to come ask why. Both weekly
// batches guard on hfAvailable() and return {skipped:true} after a single
// console.log. The Higgsfield CLI does not exist on Railway, so on the host
// that actually runs the cron that guard is ALWAYS true: every Sunday both
// batches no-opped, nothing was queued, the queue drained, and nobody was told.
//
// A silent skip on the one job that feeds the whole account is the bug. Content
// generation still needs Dre's Mac, but never again without him being told.
export async function alertWick(text) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn(`[WickAlert] Telegram not configured. Message:\n${text}`);
    return false;
  }
  // No parse_mode: Telegram's Markdown parser drops the whole message on a
  // stray apostrophe, which is exactly how a caption once vanished silently.
  try {
    await tg("sendMessage", { chat_id: chatId, text });
    return true;
  } catch (err) {
    console.warn(`[WickAlert] send failed: ${err.message}`);
    return false;
  }
}

// Runs daily. Tells Dre BEFORE the queue is empty, not after.
export async function checkWickQueueDepth() {
  const { count } = await supabase.from("wick_posts")
    .select("*", { count: "exact", head: true }).in("status", ["approved", "pending"]);
  const queued = count ?? 0;
  const days = Math.floor(queued / 2);          // 2 posts/day

  if (queued === 0) {
    await alertWick("🚨 WICK QUEUE IS EMPTY\n\nNothing will publish today. A batch has to be built on your Mac:\n\nnode -e \"import('./modules/wicks-wisdom.js').then(m=>m.runWeeklyBatch())\"\n\nRailway cannot build batches: the Higgsfield CLI only runs on your machine.");
  } else if (days <= 2) {
    await alertWick(`⚠️ WICK QUEUE LOW\n\n${queued} post(s) left, about ${days} day(s) at 2/day.\nBuild the next batch on your Mac before it runs out.`);
  }
  console.log(`[Wick] queue depth: ${queued} post(s), ~${days} day(s)`);
  return { queued, days };
}
