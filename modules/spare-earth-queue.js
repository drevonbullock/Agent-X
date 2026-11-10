import "dotenv/config";
import supabase from "../supabase/client.js";
import { postReelToInstagram } from "../distributors/instagram.js";
// Notices go to the main bot chat (TELEGRAM_CHAT_ID), the same chat the Spare
// Earth videos are delivered to. Only posted / failed / interrupted, two a day.
import { alertWick as tell } from "./wick-telegram.js";

// ─── SPARE EARTH POSTING QUEUE ───────────────────────────────────────────────
// Finished What-If reels for @thespareearth wait in Supabase `scheduled_reels`
// with a publish_at time (10am and 5pm ET, two a day). The scheduler calls
// publishDueReels() every 10 minutes and it posts at most ONE due reel per tick.
//
// Safety rules:
//   - A row is claimed with a conditional update (status queued → posting), so
//     two ticks or two containers can never post the same reel.
//   - Never two posts within MIN_GAP. After downtime the backlog drains one
//     post every 4 hours instead of flooding the feed.
//   - A row stuck in "posting" (container killed mid-post) is set to "held",
//     not retried, because it may already be live. Double posting is worse
//     than a missed slot.
//   - These reels are NOT logged to `posts`. That table trains Agent X's own
//     AI-business voice; science reels in it would skew every learning loop.
//     scheduled_reels is their record (media_id, post_url, posted_at).
//
// Kill switch: SPARE_EARTH_PAUSED=true. Separate from POSTING_PAUSED, so Agent X
// can be paused without stopping Spare Earth, and the other way round.

const TABLE = "scheduled_reels";
const MIN_GAP_MS = 4 * 60 * 60 * 1000;
const STALE_CLAIM_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 3;

// Pure: which row should post now? Earliest due queued row, or null when the
// last post was too recent or nothing is due.
export function pickDue(rows, lastPostedAt, now = new Date()) {
  if (lastPostedAt && now - new Date(lastPostedAt) < MIN_GAP_MS) return null;
  const due = rows
    .filter((r) => r.status === "queued" && new Date(r.publish_at) <= now)
    .sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at) || a.id - b.id);
  return due[0] ?? null;
}

// postReelToInstagram builds its URL from the media id, which is not a working
// link. Ask the API for the real permalink; fall back to the guess on failure.
async function permalinkOf(mediaId) {
  try {
    const res = await fetch(`https://graph.instagram.com/v22.0/${mediaId}?fields=permalink`, {
      headers: { Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    return (await res.json()).permalink ?? null;
  } catch { return null; }
}

async function holdStaleClaims(now) {
  const cutoff = new Date(now - STALE_CLAIM_MS).toISOString();
  const { data, error } = await supabase.from(TABLE)
    .update({ status: "held", error: "Interrupted mid-post. Check Instagram before requeueing, it may already be live." })
    .eq("status", "posting").lt("claimed_at", cutoff)
    .select("n,title");
  if (error) { console.warn(`[SpareEarth] stale-claim check failed: ${error.message}`); return; }
  for (const r of data ?? []) {
    console.error(`[SpareEarth] #${r.n} was interrupted mid-post and is now held`);
    await tell(`⚠️ Spare Earth #${r.n} "${r.title}" was interrupted while posting. Check Instagram: if it is not live, set its status back to queued.`);
  }
}

export async function publishDueReels({ now = new Date() } = {}) {
  if (process.env.SPARE_EARTH_PAUSED === "true") {
    console.log("[SpareEarth] PAUSED, nothing posted");
    return null;
  }

  await holdStaleClaims(now);

  const [{ data: queued, error: qErr }, { data: last, error: lErr }] = await Promise.all([
    supabase.from(TABLE).select("*").eq("platform", "instagram").eq("status", "queued")
      .lte("publish_at", now.toISOString()).order("publish_at").limit(10),
    supabase.from(TABLE).select("posted_at").eq("platform", "instagram").eq("status", "posted")
      .order("posted_at", { ascending: false }).limit(1),
  ]);
  if (qErr || lErr) throw new Error(`queue read failed: ${(qErr ?? lErr).message}`);

  const row = pickDue(queued ?? [], last?.[0]?.posted_at, now);
  if (!row) return null;

  // Claim it. If another tick got there first, zero rows come back.
  const { data: claimed, error: cErr } = await supabase.from(TABLE)
    .update({ status: "posting", claimed_at: now.toISOString(), attempts: row.attempts + 1 })
    .eq("id", row.id).eq("status", "queued").select();
  if (cErr) throw new Error(`claim failed: ${cErr.message}`);
  if (!claimed?.length) return null;

  console.log(`[SpareEarth] posting #${row.n} "${row.title}" (attempt ${row.attempts + 1})`);
  try {
    const { mediaId, postUrl: guessUrl } = await postReelToInstagram(row.video_url, row.caption, row.cover_url);
    const postUrl = (await permalinkOf(mediaId)) ?? guessUrl;
    const { error: pErr } = await supabase.from(TABLE)
      .update({ status: "posted", media_id: mediaId, post_url: postUrl, posted_at: new Date().toISOString(), error: null })
      .eq("id", row.id);
    if (pErr) console.error(`[SpareEarth] #${row.n} is LIVE but the row update failed: ${pErr.message}`);
    console.log(`[SpareEarth] ✅ #${row.n} live: ${postUrl}`);
    await tell(`✅ Spare Earth posted #${row.n} "${row.title}"\n${postUrl}`);
    return { n: row.n, mediaId, postUrl };
  } catch (err) {
    const attempts = row.attempts + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await supabase.from(TABLE)
      .update({ status: giveUp ? "failed" : "queued", error: String(err.message).slice(0, 500) })
      .eq("id", row.id);
    console.error(`[SpareEarth] #${row.n} failed (attempt ${attempts}/${MAX_ATTEMPTS}): ${err.message}`);
    if (giveUp) {
      await tell(`🚨 Spare Earth #${row.n} "${row.title}" failed ${MAX_ATTEMPTS} times and was not posted.\n\n${String(err.message).slice(0, 300)}`);
    }
    return { n: row.n, error: err.message };
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
//   node modules/spare-earth-queue.js --list        show the queue
//   node modules/spare-earth-queue.js --check 36    upload #36 to Instagram as a
//        container and wait for FINISHED, WITHOUT publishing. Proves the video,
//        cover and caption are accepted. The unused container expires in 24h.
async function checkRow(n) {
  const { initTokens } = await import("./token-manager.js");
  await initTokens();
  const { data: row, error } = await supabase.from(TABLE).select("*").eq("n", n).eq("platform", "instagram").single();
  if (error) throw new Error(`row #${n} not found: ${error.message}`);

  const API = "https://graph.instagram.com/v22.0";
  const headers = { Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`, "Content-Type": "application/json" };
  const res = await fetch(`${API}/${process.env.INSTAGRAM_BUSINESS_ID}/media`, {
    method: "POST", headers,
    body: JSON.stringify({ media_type: "REELS", video_url: row.video_url, cover_url: row.cover_url, caption: row.caption.slice(0, 2200), share_to_feed: true }),
  });
  if (!res.ok) throw new Error(`container create failed (${res.status}): ${await res.text()}`);
  const { id } = await res.json();
  console.log(`[SpareEarth] check #${n}: container ${id} created, waiting for processing (not publishing)`);
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 15000));
    const s = await fetch(`${API}/${id}?fields=status_code,status`, { headers });
    if (!s.ok) continue;
    const { status_code, status } = await s.json();
    console.log(`[SpareEarth] check #${n}: ${status_code}`);
    if (status_code === "FINISHED") return true;
    if (status_code === "ERROR") throw new Error(`Instagram rejected the video: ${status}`);
  }
  throw new Error("still processing after 6 minutes");
}

const entry = process.argv[1] ? (await import("url")).pathToFileURL(process.argv[1]).href : null;
if (entry && import.meta.url === entry) {
  const [flag, arg] = process.argv.slice(2);
  try {
    if (flag === "--check") {
      await checkRow(arg);
      console.log(`[SpareEarth] check #${arg}: PASS, Instagram accepted it`);
    } else {
      const { data, error } = await supabase.from(TABLE).select("n,title,publish_at,status,attempts,post_url,error").order("publish_at");
      if (error) throw error;
      console.table(data);
    }
    process.exit(0);
  } catch (err) {
    console.error(`[SpareEarth] ${err.message}`);
    process.exit(1);
  }
}
