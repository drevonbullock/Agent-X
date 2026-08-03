import "dotenv/config";

// ─── TELEGRAM CHANNEL SEPARATION ─────────────────────────────────────────────
// Two completely separate Telegram destinations, because the accounts must never
// bleed into each other (Dre, 2026-08-01: warm-lead alerts were showing up in the
// Wick's Wisdom chat).
//
//   WICK CHANNEL  (TELEGRAM_CHAT_ID)        — Wick's Wisdom content ONLY: post
//                                             and reel approvals. Nothing else.
//   OPS CHANNEL   (AGENT_TELEGRAM_CHAT_ID)  — everything Agent X: warm leads,
//                                             repeat engagers, Threads/LinkedIn
//                                             business, system alerts.
//
// THE GUARDRAIL: notifyOps NEVER falls back to the Wick chat. If the ops channel
// is not configured, the alert is logged and dropped rather than leaking into
// Wick. That is deliberate: a missing config must fail closed, not spill into the
// wrong account. Wick senders live in wick-telegram.js and read TELEGRAM_CHAT_ID
// directly; they must never import this module and ops code must never read
// TELEGRAM_CHAT_ID.

const TG = (m, token) => `https://api.telegram.org/bot${token}/${m}`;

// Agent X business alerts (leads, engagement, health). Goes to the OPS channel
// only. Set AGENT_TELEGRAM_CHAT_ID to a DIFFERENT chat/group than the Wick bot's
// TELEGRAM_CHAT_ID. If unset, this logs and returns without sending anywhere.
export async function notifyOps(text) {
  const token = process.env.AGENT_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.AGENT_TELEGRAM_CHAT_ID;

  if (!chatId) {
    // Fail CLOSED. Never send Agent X business to the Wick content channel.
    console.log(`[notifyOps] AGENT_TELEGRAM_CHAT_ID not set — alert kept out of the Wick chat. Message:\n${text}`);
    return false;
  }
  // Extra belt-and-braces: if someone points the ops channel at the Wick chat by
  // mistake, refuse rather than pollute it.
  if (chatId === process.env.TELEGRAM_CHAT_ID) {
    console.warn("[notifyOps] AGENT_TELEGRAM_CHAT_ID equals the Wick chat — refusing to send. Use a separate chat.");
    return false;
  }

  try {
    const res = await fetch(TG("sendMessage", token), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) console.warn(`[notifyOps] Telegram failed: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`[notifyOps] send error: ${err.message}`);
    return false;
  }
}
