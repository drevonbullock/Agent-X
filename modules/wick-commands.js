import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── WICK'S WISDOM — TELEGRAM COMMAND HANDLERS ───────────────────────────────
// Lets Dre run the whole system from his phone. Every handler returns a string
// that gets sent straight back as the reply.
//
// AUTHORISATION: the poller only ever dispatches commands from TELEGRAM_CHAT_ID.
// The bot username is public, so anyone can find it and type /batch; without
// that check a stranger could drain the Higgsfield credit balance or publish.
//
// HOST LIMITS: the poller normally runs on Railway, which has no Higgsfield CLI.
// Anything that generates art says so plainly rather than failing silently.

const fmtNum = (n) => (n ?? 0).toLocaleString("en-US");

export const HELP = `🕯️ *Wick's Wisdom*

/queue — what is waiting to publish
/next — what goes out next and when
/report — format scoreboard (shares per like)
/sync — pull live Instagram metrics, then report
/preview — re-send everything queued to this chat
/recaption — rewrite every queued caption
/fixcta — rebuild CTA slides to the share ask
/topics — episode registry progress
/status — tokens, queue depth, credits
/pause — stop all publishing
/resume — start publishing again
/threads — which Threads variant is winning
/linkedin — which LinkedIn variant is winning
/help — this list

Generating a new batch needs the Higgsfield CLI, which only runs on Dre's Mac.`;

// ─── READ-ONLY ───────────────────────────────────────────────────────────────

export async function cmdQueue() {
  const { data } = await supabase.from("wick_posts")
    .select("format,topic_id,status,slide_urls,created_at")
    .in("status", ["approved", "pending"])
    .order("created_at", { ascending: true });
  if (!data?.length) return "Queue is empty. Nothing will publish.";

  const lines = data.map((p, i) =>
    `${i + 1}. *${p.format}* · ep ${p.topic_id ?? "?"} · ${(p.slide_urls ?? []).length} slides${p.status === "pending" ? " _(pending)_" : ""}`);
  const days = Math.ceil(data.length / 2);
  return `📋 *${data.length} queued* (~${days} day${days === 1 ? "" : "s"} at 2/day)\n\n${lines.join("\n")}`;
}

export async function cmdNext() {
  const { data } = await supabase.from("wick_posts")
    .select("format,topic_id,caption").eq("status", "approved")
    .order("created_at", { ascending: true }).limit(1);
  if (!data?.length) return "Nothing approved. Next slot will publish nothing.";

  const p = data[0];
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours();
  const slot = h < 9 ? "9:00am today" : h < 12 ? "12:00pm today" : "9:00am tomorrow";
  const first = String(p.caption ?? "").split("\n").find((l) => l.trim()) ?? "";
  return `⏭ Next up at *${slot}* ET\n\n*${p.format}* · ep ${p.topic_id ?? "?"}\n\n_${first}_`;
}

export async function cmdReport() {
  const { data } = await supabase.from("wick_posts")
    .select("format,likes,comments,shares,saves").eq("status", "posted");
  if (!data?.length) return "Nothing published yet. The scoreboard fills in after the first posts go out.";

  const byFormat = new Map();
  for (const p of data) {
    const f = byFormat.get(p.format) ?? { n: 0, likes: 0, shares: 0, saves: 0, comments: 0 };
    f.n++; f.likes += p.likes ?? 0; f.shares += p.shares ?? 0;
    f.saves += p.saves ?? 0; f.comments += p.comments ?? 0;
    byFormat.set(p.format, f);
  }
  const rows = [...byFormat.entries()].map(([format, f]) => ({
    format, ...f,
    spl: f.likes > 0 ? f.shares / f.likes : (f.shares > 0 ? 999 : 0),
  })).sort((a, b) => b.spl - a.spl);

  const body = rows.map((r) =>
    `*${r.format}* (${r.n})\n  ${fmtNum(r.likes)} likes · ${fmtNum(r.shares)} shares · ${fmtNum(r.saves)} saves\n  shares/like: *${r.spl.toFixed(3)}*`).join("\n\n");
  const thin = rows.some((r) => r.n < 3);
  return `📊 *Format scoreboard*\nRanked by shares per like.\n\n${body}` +
    (thin ? "\n\n_Some formats have under 3 posts. Too early to retire anything._" : "");
}

export async function cmdTopics() {
  const { TOPICS } = await import("./wick-topics.js");
  const { data } = await supabase.from("wick_posts").select("topic_id").not("topic_id", "is", null);
  const used = new Set((data ?? []).map((r) => r.topic_id));
  const byLane = {};
  for (const t of TOPICS) {
    byLane[t.lane] ??= { total: 0, done: 0 };
    byLane[t.lane].total++;
    if (used.has(t.id) || t.published) byLane[t.lane].done++;
  }
  const lines = Object.entries(byLane).map(([lane, v]) => `*${lane}* ${v.done}/${v.total}`);
  const remaining = TOPICS.filter((t) => !used.has(t.id) && !t.published);
  return `📚 *Episode registry*\n\n${lines.join("\n")}\n\n${remaining.length} unused episode${remaining.length === 1 ? "" : "s"} left.` +
    (remaining.length ? `\nNext: _${remaining[0].title}_` : "\nThe registry has cycled. Re-runs will repeat episodes.");
}

export async function cmdStatus() {
  const out = [];
  const { count: queued } = await supabase.from("wick_posts")
    .select("*", { count: "exact", head: true }).in("status", ["approved", "pending"]);
  const { count: posted } = await supabase.from("wick_posts")
    .select("*", { count: "exact", head: true }).eq("status", "posted");
  out.push(`Queued: *${queued ?? 0}*   Published: *${posted ?? 0}*`);
  out.push(`Publishing: ${process.env.POSTING_PAUSED === "true" ? "*PAUSED* ⏸" : "active ✅"}`);

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const id = process.env.INSTAGRAM_BUSINESS_ID;
  if (token && id) {
    try {
      const r = await fetch(`https://graph.instagram.com/v21.0/${id}?fields=username,followers_count&access_token=${token}`);
      const j = await r.json();
      out.push(`Instagram: ${j.username ? `✅ @${j.username}` : `❌ ${j.error?.message ?? "rejected"}`}`);
      // The CTA plan is staged on follower count: shares and reposts only until
      // 1,000, then a free asset. Surfacing the number means the switch happens
      // on evidence rather than on a guess about when we got there.
      if (typeof j.followers_count === "number") {
        const n = j.followers_count;
        out.push(`Followers: *${fmtNum(n)}*`);
        out.push(n >= 1000
          ? `🎯 Past 1,000. Time to swap the CTA to a free asset.`
          : `CTA: shares + reposts (${fmtNum(1000 - n)} to go before the free asset)`);
      }
    } catch { out.push("Instagram: ⚠️ check failed"); }
  } else out.push("Instagram: ❌ not configured");

  return `🩺 *Status*\n\n${out.join("\n")}`;
}

// Threads A/B. Reported separately from the Wick scoreboard because it answers a
// different question: not "which format gets engagement" but "which SHAPE gets
// replies worth having". Likes per comment is the tell, a reply with a like
// behind it is agreement, a reply without one is an argument.
async function variantReportText(report, title, window) {
  const { rows, note } = await report;
  if (note || !rows.length) return note ?? "No tagged posts yet.";
  const body = rows.map((r) =>
    `*${r.variant}* (${r.n} posts)\n  reposts/post: *${r.avgShares}*\n  ${r.avgComments} comments · ${r.avgLikes} likes`).join("\n\n");
  const thin = rows.some((r) => r.n < 5);
  return `${title} (${window})\n\n${body}\n\n_Ranked by reposts per post. Reposts reach non-followers, which is where follows come from. Comment count is shown but does not decide the winner: round 1's comment leader produced zero reposts._` +
    (thin ? "\n_Under 5 posts in a variant. Too early to call it._" : "");
}

export async function cmdThreads() {
  const { threadsVariantReport } = await import("../agent/generate-post.js");
  return variantReportText(threadsVariantReport(), "🧵 *Threads A/B*", "last 14 days");
}

export async function cmdLinkedIn() {
  const { linkedInVariantReport } = await import("../agent/generate-post.js");
  // 30-day window: LinkedIn posts 1x/day so a shorter window never has a sample.
  return variantReportText(linkedInVariantReport(), "💼 *LinkedIn A/B*", "last 30 days");
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

export async function cmdSync() {
  const { syncWickMetrics } = await import("./wick-analytics.js");
  const n = await syncWickMetrics();
  return `Synced ${n ?? 0} post(s).\n\n${await cmdReport()}`;
}

export async function cmdPreview() {
  const { sendBatchToTelegram } = await import("./wick-telegram.js");
  const { data } = await supabase.from("wick_posts").select("*")
    .in("status", ["approved", "pending"]).order("created_at", { ascending: true });
  if (!data?.length) return "Nothing queued to preview.";
  await sendBatchToTelegram(data);
  return null; // sendBatchToTelegram already posts into the chat
}

export async function cmdRecaption() {
  const { writeCaption } = await import("./wick-copy.js");
  const { data } = await supabase.from("wick_posts")
    .select("id,format,copy").in("status", ["approved", "pending"]);
  if (!data?.length) return "Nothing queued to recaption.";
  let n = 0;
  for (const p of data) {
    try {
      const caption = await writeCaption({ format: p.format, copy: p.copy });
      await supabase.from("wick_posts").update({ caption }).eq("id", p.id);
      n++;
    } catch (err) { console.warn(`[WickCmd] recaption ${p.id}: ${err.message}`); }
  }
  return `Rewrote ${n}/${data.length} caption(s). Send /preview to see them.`;
}

export async function cmdPause(paused) {
  process.env.POSTING_PAUSED = paused ? "true" : "false";
  await supabase.from("agent_kv").upsert({
    key: "posting_paused", value: String(paused), updated_at: new Date().toISOString(),
  });
  return paused
    ? "⏸ Publishing *paused*. Nothing will go out until /resume.\n\n_Note: this holds until the next redeploy. For a permanent stop set POSTING_PAUSED on Railway._"
    : "▶️ Publishing *resumed*.";
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export async function runCommand(text) {
  const cmd = String(text ?? "").trim().toLowerCase().split(/[\s@]/)[0];
  switch (cmd) {
    case "/start":
    case "/help":      return HELP;
    case "/queue":     return cmdQueue();
    case "/next":      return cmdNext();
    case "/report":    return cmdReport();
    case "/sync":      return cmdSync();
    case "/preview":   return cmdPreview();
    case "/recaption": return cmdRecaption();
    case "/topics":    return cmdTopics();
    case "/threads":   return cmdThreads();
    case "/linkedin":  return cmdLinkedIn();
    case "/status":    return cmdStatus();
    case "/pause":     return cmdPause(true);
    case "/resume":    return cmdPause(false);
    case "/fixcta":
      return "Rebuilding CTA slides needs the image pipeline. Run it on the Mac:\n`npm run wick:fixcta`";
    case "/batch":
      return "Generating a batch needs the Higgsfield CLI, which only runs on Dre's Mac:\n`npm run wick:batch`";
    default:
      return cmd.startsWith("/") ? `Unknown command ${cmd}.\n\n${HELP}` : null;
  }
}

// The command list Telegram shows in the "/" menu.
export const BOT_COMMANDS = [
  { command: "queue",     description: "What is waiting to publish" },
  { command: "next",      description: "What goes out next and when" },
  { command: "report",    description: "Format scoreboard, shares per like" },
  { command: "sync",      description: "Pull live Instagram metrics" },
  { command: "preview",   description: "Re-send the queue to this chat" },
  { command: "recaption", description: "Rewrite every queued caption" },
  { command: "topics",    description: "Episode registry progress" },
  { command: "threads",   description: "Which Threads variant is winning" },
  { command: "linkedin",  description: "Which LinkedIn variant is winning" },
  { command: "status",    description: "Tokens, queue depth, publishing state" },
  { command: "pause",     description: "Stop all publishing" },
  { command: "resume",    description: "Start publishing again" },
  { command: "help",      description: "Show all commands" },
];
