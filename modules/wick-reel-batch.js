import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import supabase from "../supabase/client.js";
import { pickTopics } from "./wick-topics.js";
import { writeStepsReel, writeTiersReel, writeCaption } from "./wick-copy.js";
import { compositeStepsReel, compositeTiersReel, cropCell, makeThumbnail } from "./wick-reels.js";
import { hfAvailable, generateScene, download, STYLE_STACK } from "./wick-render.js";

// ─── WICK'S WISDOM — WEEKLY REEL BATCH ──────────────────────────────────────
// 14 reels a week, published 2 a day. Every reel is a 9:16 cover plus a matching
// white-background thumbnail, and each one is pushed to Telegram the moment its
// row exists rather than at the end of the run.
//
// LANE LOCK: reels only ever use MIND_BEHAVIOUR and MONEY_SYSTEMS. Dre: "the
// reels should never be the 80." Those two lanes are 10% each of the registry,
// so a reel batch draws from a deliberately small pool and extends it when dry.
//
// COST: badges and figures are cropped from the two character sheets, so the only
// per-reel generation is its thumbnail.

const BUCKET = "agent-x-images";
const PLAIN = "wick_examples/00_character_sheet.png";
const SUIT = "wick_examples/00_character_sheet_suit.png";
const REEL_LANES = ["MIND_BEHAVIOUR", "MONEY_SYSTEMS"];

// Weakest to strongest, mapped onto each sheet's expression order.
const LADDER_PLAIN = [6, 7, 8, 2, 1, 0, 5, 3, 4];
const LADDER_SUIT = [6, 7, 8, 2, 1, 5, 0, 3, 4];

const tmpRoot = () => {
  const d = path.join(os.tmpdir(), "wick-reelbatch");
  fs.mkdirSync(d, { recursive: true });
  return d;
};

const badge = (sheet, i) => {
  const p = path.join(tmpRoot(), `badge-${sheet === SUIT ? "suit" : "plain"}-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: true, sheet });
  return p;
};
const figure = (sheet, i) => {
  const p = path.join(tmpRoot(), `figure-${sheet === SUIT ? "suit" : "plain"}-${i}.jpg`);
  if (!fs.existsSync(p)) cropCell(i, p, { square: false, sheet });
  return p;
};

const THUMB_STYLE =
  "Plain pure white studio background, completely empty, no room, no set, no scenery, " +
  "no gradient and no shadow on the backdrop. The character is centred, full body, at a " +
  "comfortable distance with even flat lighting. " + STYLE_STACK +
  " Absolutely no text anywhere in the image.";

const ANATOMY =
  "CRITICAL ANATOMY: he is a CANDLE. His body is a short cream wax cylinder with soft drips " +
  "and nothing else. No human torso, shoulders, chest, hips or neck. Thin black rubber hose arms " +
  "ending in rounded mitten hands, thin black rubber hose legs ending in rounded feet. The flame " +
  "is his whole head, roughly the same height as the wax body.";

const el = () => `<<<${process.env.WICK_ELEMENT_ID || "5e934732-6de4-438a-b3a6-024144603518"}>>>`;

async function makeThumb(scene, suited, outPath) {
  const suit = suited
    ? "He wears a well tailored charcoal business suit jacket with a white collar and slim dark tie " +
      "as a small garment over his cream wax candle body, the wax clearly visible below it. "
    : "";
  const { url } = generateScene(
    `A polished cinematic 3D cartoon character portrait, vertical. ${el()} ${scene} ${suit}${ANATOMY} ${THUMB_STYLE}`,
    "9:16");
  return download(url, outPath);
}

async function upload(buf, key) {
  const { error } = await supabase.storage.from(BUCKET)
    .upload(key, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`upload ${key}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

// Reels draw from two lanes only, so pickTopics' 80/10/10 split is not what we
// want here. Ask for a large slice and keep the reel-eligible ones.
async function reelTopics(need) {
  const pool = await pickTopics(need * 8, { allowPublished: false });
  const eligible = pool.filter((t) => REEL_LANES.includes(t.lane));
  if (eligible.length >= need) return eligible.slice(0, need);
  // Registry ran dry on these lanes; pickTopics extends them on the next call.
  const more = await pickTopics(need * 8, { allowPublished: false });
  return [...eligible, ...more.filter((t) => REEL_LANES.includes(t.lane))].slice(0, need);
}

export async function runWeeklyReels({ count } = {}) {
  const perWeek = count ?? parseInt(process.env.WICK_REELS_PER_WEEK ?? "14", 10);
  if (!hfAvailable()) {
    console.log("[WickReels] Skipped — higgsfield CLI not authenticated on this host.");
    return { skipped: true };
  }
  if (!fs.existsSync(path.join(process.cwd(), SUIT))) {
    console.warn("[WickReels] suit character sheet missing — Money & Systems reels will use the plain sheet");
  }

  const batchId = `reels-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  const topics = await reelTopics(perWeek);
  console.log(`\n[WickReels] Batch ${batchId}: ${topics.length} reel(s)`);

  const created = [];
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    // Alternate the two layouts so a reels tab never shows a run of one shape.
    const layout = i % 2 === 0 ? "steps" : "tiers";
    const suited = t.lane === "MONEY_SYSTEMS";
    const sheet = suited && fs.existsSync(path.join(process.cwd(), SUIT)) ? SUIT : PLAIN;

    console.log(`[WickReels] ${i + 1}/${topics.length} ${layout.toUpperCase()} ep${t.id} [${t.lane}]${suited ? " SUIT" : ""}`);
    try {
      let buf, copy;
      if (layout === "steps") {
        copy = await writeStepsReel(t);
        buf = await compositeStepsReel({
          title: copy.title, steps: copy.steps, kicker: copy.kicker,
          sendTo: copy.send_to, figurePath: figure(sheet, suited ? 4 : 3),
        });
      } else {
        copy = await writeTiersReel(t);
        buf = await compositeTiersReel({
          titleLines: copy.title_lines, tiers: copy.tiers, kicker: copy.kicker,
          sendTo: copy.send_to,
          badgePaths: (sheet === SUIT ? LADDER_SUIT : LADDER_PLAIN).map((c) => badge(sheet, c)),
        });
      }

      const dir = path.join(tmpRoot(), batchId, String(i));
      fs.mkdirSync(dir, { recursive: true });
      const thumbSrc = await makeThumb(copy.thumb_scene, suited, path.join(dir, "thumb.png"));
      const thumbOut = makeThumbnail(thumbSrc, path.join(dir, "thumb.jpg"));

      const coverUrl = await upload(buf, `wick/${batchId}/${i}/cover.jpg`);
      const thumbUrl = await upload(fs.readFileSync(thumbOut), `wick/${batchId}/${i}/thumb.jpg`);
      const caption = await writeCaption({ format: layout.toUpperCase(), copy });

      const { data, error } = await supabase.from("wick_reels").insert({
        batch_id: batchId, slot_index: i, layout, topic_id: t.id,
        pillar: copy.pillar ?? null, suited, copy, caption,
        cover_url: coverUrl, thumb_url: thumbUrl, status: "approved",
      }).select().single();
      if (error) throw new Error(`insert: ${error.message}`);

      created.push(data);
      console.log(`[WickReels]   queued`);

      // Deliver immediately, same rule as posts: a reel nobody can see does not exist.
      try {
        const { sendReelToTelegram } = await import("./wick-telegram.js");
        await sendReelToTelegram(data);
      } catch (err) {
        console.warn(`[WickReels]   Telegram push failed (reel is saved): ${err.message}`);
      }
    } catch (err) {
      console.error(`[WickReels] ${i + 1} failed: ${err.message}`);
    }
  }

  console.log(`[WickReels] Batch ${batchId} done — ${created.length} reel(s)`);
  return { batchId, created };
}

// One reel per slot, oldest first, alternating layout so the tab stays varied.
export async function publishNextReel() {
  const { data: queue } = await supabase.from("wick_reels")
    .select("*").eq("status", "approved").order("created_at", { ascending: true });
  if (!queue?.length) { console.log("[WickReels] No approved reels queued."); return null; }

  const { data: last } = await supabase.from("wick_reels")
    .select("layout").eq("status", "posted")
    .order("published_at", { ascending: false }).limit(1).maybeSingle();
  const next = queue.find((r) => r.layout !== last?.layout) ?? queue[0];

  // Instagram publishes Reels from VIDEO. These are covers and thumbnails, so
  // the clip itself is still assembled by Dre; marking it here would claim a
  // publish that never happened.
  console.log(`[WickReels] Next up: ${next.layout} ep${next.topic_id} (${next.id})`);
  return next;
}

if (process.argv[1]?.endsWith("wick-reel-batch.js")) {
  const n = process.argv.includes("--count")
    ? parseInt(process.argv[process.argv.indexOf("--count") + 1], 10) : undefined;
  runWeeklyReels({ count: n }).then(() => process.exit(0))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
