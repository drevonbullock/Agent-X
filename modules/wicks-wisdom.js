import "dotenv/config";
import fs from "fs";
import path from "path";
import supabase from "../supabase/client.js";
import { postCarouselToInstagram, postImageToInstagram } from "../distributors/instagram.js";
import { writeVersusCarousel, writeOrderCarousel, writeCostume, writeLesson, writeCaption } from "./wick-copy.js";
import { pickTopics } from "./wick-topics.js";
import {
  hfAvailable, generateScene, download, tmpDir,
  versusPanelPrompt, costumePrompt, lessonScenePrompt,
  compositeTwoPanel, compositeCostume, compositeLessonCover,
  compositeLessonItem, compositeCta,
} from "./wick-render.js";

// ─── WICK'S WISDOM — ORCHESTRATOR ────────────────────────────────────────────
// Weekly batch → Supabase queue → publish to the same Instagram account Agent X
// already uses (same token, same business id, new brand).
//
// AUTO MODE (Dre, 2026-07-30): posts are queued already approved and publish on
// their 9am/12pm slot with no human gate. Telegram notifies with a per-post Pull
// kill switch. Set WICK_AUTO_PUBLISH=false to restore the approval gate.

const BUCKET = "agent-x-images";

async function uploadSlide(buffer, storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Generate a scene and return its local path. Retries individual panels only
// (never whole pairs or carousels) per the skill's retry policy.
async function scene(prompt, dir, name, aspect, jobIds) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { url, jobId } = generateScene(prompt, aspect);
      if (jobId) jobIds.push(jobId);
      return await download(url, path.join(dir, `${name}.png`));
    } catch (err) {
      lastErr = err;
      console.warn(`[Wick] ${name} attempt ${attempt} failed: ${String(err.message).slice(0, 120)}`);
    }
  }
  throw lastErr;
}

// ─── BUILDERS — each returns { slideBuffers[], copy, format, sub_type, pillar } ──

// VERSUS / ORDER — a 5 slide carousel: 4 two-panel comparisons on one theme,
// then a CTA slide. Each comparison slide is 2 generated panels stacked, so a
// full carousel is 9 generations (8 panels + 1 CTA scene).
async function buildComparisonCarousel(c, format, dir, jobIds) {
  console.log(`[Wick] ${format} carousel: "${c.theme}" (${c.pairs.length} comparisons + CTA)`);
  const buffers = [];

  for (let i = 0; i < c.pairs.length; i++) {
    const pair = c.pairs[i];
    console.log(`[Wick]   ${i + 1}/${c.pairs.length}: "${pair.top_label}" / "${pair.bottom_label}"`);
    const topPath = await scene(versusPanelPrompt(pair.top_scene, { owned: true,  expression: pair.top_expression,  seed: i * 2 }),     dir, `p${i}-top`, "3:2", jobIds);
    const botPath = await scene(versusPanelPrompt(pair.bottom_scene, { owned: false, expression: pair.bottom_expression, seed: i * 2 + 1 }), dir, `p${i}-bot`, "3:2", jobIds);
    buffers.push(await compositeTwoPanel({
      topPath, bottomPath: botPath,
      topLabel: pair.top_label, bottomLabel: pair.bottom_label,
    }));
  }

  const ctaPath = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression), dir, "cta", "4:5", jobIds);
  buffers.push(await compositeCta({
    scenePath: ctaPath,
    closingLine: c.closing_line,
    sendTo: c.send_to, keyword: c.keyword, resource: c.resource,
  }));

  return { slideBuffers: buffers, copy: c, format, sub_type: c.sub_type, pillar: c.pillar };
}

async function buildCostume(topic, dir, jobIds) {
  // 6 role slides + 1 CTA. The cast is written per topic, not a fixed list.
  const c = await writeCostume(topic);
  console.log(`[Wick] COSTUME: "${c.theme}" (${c.roles.length} roles + CTA)`);
  const buffers = [];
  for (let i = 0; i < c.roles.length; i++) {
    const r = c.roles[i];
    console.log(`[Wick]   ${i + 1}/${c.roles.length}: ${r.label}`);
    const p = await scene(costumePrompt(r, i), dir, `role-${i}`, "4:5", jobIds);
    buffers.push(await compositeCostume({ scenePath: p, label: r.label, boldWord: r.bold }));
  }
  const ctaScene = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression), dir, "cta", "4:5", jobIds);
  buffers.push(await compositeCta({
    scenePath: ctaScene,
    closingLine: c.closing_line,
    sendTo: c.send_to, keyword: c.keyword, resource: c.resource,
  }));
  return {
    slideBuffers: buffers, copy: c,
    format: "COSTUME", sub_type: "cast", pillar: c.pillar,
  };
}

async function buildLesson(topic, dir, jobIds) {
  const l = await writeLesson(topic);
  console.log(`[Wick] LESSON: "${l.cover_headline}" (${l.items.length} items)`);
  const buffers = [];

  const coverPath = await scene(lessonScenePrompt(l.cover_scene, l.cover_expression), dir, "cover", "4:5", jobIds);
  buffers.push(await compositeLessonCover({ scenePath: coverPath, headline: l.cover_headline }));

  for (const item of l.items) {
    const p = await scene(lessonScenePrompt(item.scene, item.expression, item.number), dir, `item-${item.number}`, "4:5", jobIds);
    buffers.push(await compositeLessonItem({
      scenePath: p, number: item.number, title: item.title,
      problem: item.problem, solution: item.solution,
    }));
  }

  // Recap CTA — every item becomes a labelled signpost pointing down the wrong road.
  const signposts = l.items.map((i) => i.signpost).filter(Boolean);
  const recapPath = await scene(lessonScenePrompt(
    `stands on a city sidewalk at dusk at a five way junction, ${signposts.length} illuminated overhead direction signs crowded above the left hand street all pointing the same way, one clear open street to the right leading toward lit towers, a bus shelter and parked cars framing the junction`
  ), dir, "recap", "4:5", jobIds);
  buffers.push(await compositeCta({
    scenePath: recapPath, closingLine: l.closing_line,
    sendTo: l.send_to, keyword: l.keyword, resource: l.resource,
  }));

  return { slideBuffers: buffers, copy: l, format: "LESSON", sub_type: "problem_solution", pillar: l.pillar };
}

// ─── BATCH ───────────────────────────────────────────────────────────────────
// Feeds the 2/day publish schedule: 14 posts per week. The mix is deliberately
// spread across formats so the 9am/12pm alternation always has an alternative
// in the queue. VERSUS leads because it is the highest share-rate format.
//
// Cost note: a comparison carousel is 9 generations, COSTUME is 7, LESSON is 7.
// At ~7 credits per generation (gpt_image_2) a 14 post week is roughly 800 credits;
// nano_banana_pro is 2 credits and cuts that to ~230. Switch via WICK_IMAGE_MODEL.
// Dial WICK_POSTS_PER_WEEK down if that outruns the credit budget.

export async function runWeeklyBatch({ versus, order, rotating = "auto" } = {}) {
  const perWeek = parseInt(process.env.WICK_POSTS_PER_WEEK ?? "14", 10);
  // Ratio: half VERSUS (the engine), a third ORDER (cheap, high forward rate),
  // the remainder COSTUME/LESSON rotating.
  const rotatingCount = Math.max(1, Math.round(perWeek * 0.15));
  versus = versus ?? Math.round((perWeek - rotatingCount) * 0.6);
  order  = order  ?? (perWeek - rotatingCount - versus);
  if (!hfAvailable()) {
    console.log("[Wick] Skipped — higgsfield CLI not authenticated on this host.");
    return { skipped: true };
  }
  const batchId = `wick-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  console.log(`\n[Wick] Batch ${batchId} starting`);

  // Topics come from the fixed 30 episode registry at the 80/10/10 lane mix.
  // The copy engine is never allowed to choose its own subject: that is what
  // produced philosophy posts instead of Mind/Behaviour/Money/Systems ones.
  const topics = await pickTopics(perWeek);
  if (topics.length < perWeek) {
    console.warn(`[Wick] Only ${topics.length} unused topics for ${perWeek} slots — the registry is cycling.`);
  }

  // Rotate the 4th slot between COSTUME and LESSON.
  let rotate = rotating;
  if (rotate === "auto") {
    const { count } = await supabase.from("wick_posts")
      .select("*", { count: "exact", head: true }).eq("format", "COSTUME");
    rotate = (count ?? 0) % 2 === 0 ? "COSTUME" : "LESSON";
  }

  // Assign a format to each topic, then write ALL copy before any image.
  const kinds = [
    ...Array.from({ length: versus }, () => "VERSUS"),
    ...Array.from({ length: order }, () => "ORDER"),
    ...Array.from({ length: rotatingCount }, (_, n) =>
      n % 2 === 0 ? rotate : (rotate === "COSTUME" ? "LESSON" : "COSTUME")),
  ];

  const jobs = [];
  for (let i = 0; i < kinds.length; i++) {
    const topic = topics[i % topics.length];
    if (!topic) break;
    const kind = kinds[i];
    console.log(`[Wick] copy ${i + 1}/${kinds.length} ${kind} <- #${topic.id} ${topic.title}`);
    const spec = kind === "VERSUS" ? await writeVersusCarousel(topic)
               : kind === "ORDER"  ? await writeOrderCarousel(topic)
               : null; // COSTUME/LESSON write their copy inside their builder
    jobs.push({ kind, spec, topic });
  }
  console.log(`[Wick] Plan: ${versus} VERSUS, ${order} ORDER, ${rotatingCount} ${rotate}/alt = ${jobs.length} posts`);

  const created = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const dir = tmpDir(batchId, i);
    const jobIds = [];
    try {
      let built;
      if (job.kind === "VERSUS" || job.kind === "ORDER") {
        built = await buildComparisonCarousel(job.spec, job.kind, dir, jobIds);
      } else if (job.kind === "COSTUME") {
        built = await buildCostume(job.topic, dir, jobIds);
      } else {
        built = await buildLesson(job.topic, dir, jobIds);
      }

      const caption = await writeCaption(built);

      const urls = [];
      for (let s = 0; s < built.slideBuffers.length; s++) {
        urls.push(await uploadSlide(
          built.slideBuffers[s],
          `wick/${batchId}/${i}/slide-${String(s + 1).padStart(2, "0")}.jpg`
        ));
      }

      // AUTO MODE (Dre, 2026-07-30): posts are queued already approved and
      // publish on their slot without a human gate. Set WICK_AUTO_PUBLISH=false
      // to restore the approval gate from the original spec.
      const autoPublish = process.env.WICK_AUTO_PUBLISH !== "false";

      const { data, error } = await supabase.from("wick_posts").insert({
        batch_id: batchId, format: built.format, sub_type: built.sub_type,
        pillar: built.pillar, slot_index: i, copy: built.copy, caption,
        topic_id: job.topic?.id ?? null,
        slide_urls: urls, hf_job_ids: jobIds,
        status: autoPublish ? "approved" : "pending",
      }).select().single();
      if (error) throw new Error(`DB insert failed: ${error.message}`);

      created.push(data);
      console.log(`[Wick] Queued ${built.format} (${urls.length} slide${urls.length > 1 ? "s" : ""}) → ${autoPublish ? "auto-publishing on schedule" : "pending approval"}`);
    } catch (err) {
      console.error(`[Wick] Post ${i} (${job.kind}) failed: ${err.message}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // Push the whole week to Telegram with Approve / Reject buttons.
  if (created.length) {
    try {
      const { sendBatchToTelegram } = await import("./wick-telegram.js");
      await sendBatchToTelegram(created);
    } catch (err) {
      console.warn(`[Wick] Telegram send failed (batch still pending at /wick): ${err.message}`);
    }
  }

  const mode = process.env.WICK_AUTO_PUBLISH !== "false" ? "queued for auto-publish" : "awaiting approval";
  console.log(`[Wick] Batch ${batchId} done — ${created.length} post(s) ${mode}\n`);
  return { batchId, created };
}

// ─── APPROVAL ────────────────────────────────────────────────────────────────

// Everything still waiting to go out, oldest first — the publish order.
// This filtered on status='pending' only, which showed an empty queue in AUTO
// mode where rows are inserted already 'approved'. Both states are "not yet
// published", so both belong here.
export async function listPendingWick() {
  const { data } = await supabase.from("wick_posts")
    .select("*").in("status", ["approved", "pending"])
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function decideWick(id, action) {
  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabase.from("wick_posts").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  console.log(`[Wick] ${id} → ${status}`);
  return status;
}

// ─── PUBLISH — one approved post per scheduled slot ──────────────────────────

export async function publishNextApproved() {
  // Pull the approved queue oldest first.
  const { data: queue } = await supabase.from("wick_posts")
    .select("*").eq("status", "approved")
    .order("created_at", { ascending: true });
  if (!queue?.length) { console.log("[Wick] No approved posts queued — nothing to publish."); return null; }

  // Alternate styles: prefer the oldest approved post whose format differs from
  // the one published most recently. Falls back to plain FIFO when the queue is
  // all one format, so a single-format queue still drains.
  const { data: last } = await supabase.from("wick_posts")
    .select("format").eq("status", "posted")
    .order("published_at", { ascending: false }).limit(1);
  const lastFormat = last?.[0]?.format ?? null;

  const post = queue.find((p) => p.format !== lastFormat) ?? queue[0];
  if (lastFormat) {
    console.log(`[Wick] Last posted: ${lastFormat} → now: ${post.format}${post.format === lastFormat ? " (no alternative in queue)" : ""}`);
  }

  const urls = post.slide_urls ?? [];
  if (!urls.length) throw new Error("Post has no slides");

  console.log(`[Wick] Publishing ${post.format} (${urls.length} slide${urls.length > 1 ? "s" : ""})...`);
  try {
    const res = urls.length === 1
      ? await postImageToInstagram(urls[0], post.caption)
      : await postCarouselToInstagram(urls, post.caption);

    await supabase.from("wick_posts").update({
      status: "posted",
      ig_media_id: res.mediaId ?? null,
      post_url: res.postUrl ?? null,
      published_at: new Date().toISOString(),
    }).eq("id", post.id);

    console.log(`[Wick] Published: ${res.postUrl}`);
    try {
      const { notifyPublished } = await import("./wick-telegram.js");
      await notifyPublished(post, res.postUrl);
    } catch { /* notification is best effort */ }
    return res;
  } catch (err) {
    // Never restart the whole flow after a publish failure — it creates a
    // duplicate parent container. Leave it approved and let the next slot retry.
    console.error(`[Wick] Publish failed (stays approved for retry): ${err.message}`);
    throw err;
  }
}

// ─── /wick DASHBOARD ─────────────────────────────────────────────────────────

export function renderWickPageHtml(posts) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const token = process.env.REVIEW_TOKEN ?? process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? "";

  const cards = posts.map((p) => {
    const slides = (p.slide_urls ?? []).map((u, i) =>
      `<img src="${esc(u)}" loading="lazy" title="slide ${i + 1}">`).join("");
    return `<div class="card">
      <div class="meta"><span class="fmt">${esc(p.format)}</span>
        <span class="pill">${esc(p.pillar ?? "")}</span>
        <span class="pill">${esc(p.sub_type ?? "")}</span>
        <span class="dim">${(p.slide_urls ?? []).length} slides</span></div>
      <div class="strip">${slides}</div>
      <pre class="cap">${esc(p.caption)}</pre>
      <div class="actions">
        <a class="btn ok" href="/wick/decide?id=${p.id}&action=approve&token=${encodeURIComponent(token)}">Approve</a>
        <a class="btn no" href="/wick/decide?id=${p.id}&action=reject&token=${encodeURIComponent(token)}">Reject</a>
      </div></div>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wick's Wisdom — Approval</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0e0e0e;color:#f0f0f0;font-family:-apple-system,system-ui,sans-serif;padding:22px;}
h1{font-size:26px;margin-bottom:4px;} .sub{color:#9a9a9a;font-size:14px;margin-bottom:24px;}
.card{background:#1a1917;border:1px solid #2c2a27;border-radius:10px;padding:18px;margin-bottom:22px;}
.meta{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}
.fmt{background:#F5A524;color:#0e0e0e;font-weight:700;font-size:12px;letter-spacing:1.5px;padding:5px 11px;border-radius:4px;}
.pill{border:1px solid #3a3733;color:#c9c2b8;font-size:12px;padding:4px 10px;border-radius:20px;}
.dim{color:#8a8580;font-size:12px;margin-left:auto;}
.strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px;}
.strip img{height:290px;border-radius:6px;flex:0 0 auto;border:1px solid #2c2a27;}
.cap{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.55;color:#ded7cd;
  background:#111010;border:1px solid #262421;border-radius:6px;padding:14px;margin-bottom:14px;}
.actions{display:flex;gap:10px;}
.btn{flex:1;text-align:center;text-decoration:none;font-weight:700;font-size:15px;padding:13px;border-radius:6px;}
.ok{background:#F5A524;color:#0e0e0e;} .no{background:#2a2724;color:#e0d9cf;}
.empty{color:#8a8580;padding:40px 0;text-align:center;}
</style></head><body>
<h1>Wick's Wisdom</h1>
<div class="sub">${posts.length} post${posts.length === 1 ? "" : "s"} awaiting approval. Nothing publishes until you approve it.</div>
${cards || '<div class="empty">Nothing pending. Next batch builds Sunday 6am.</div>'}
</body></html>`;
}

// CLI: node modules/wicks-wisdom.js [--batch|--list|--approve <id>|--publish]
if (process.argv[1]?.endsWith("wicks-wisdom.js")) {
  const a = process.argv;
  const run = async () => {
    if (a.includes("--batch")) return runWeeklyBatch();
    if (a.includes("--list")) {
      const p = await listPendingWick();
      p.forEach((x) => console.log(`${x.id} | ${x.format} | ${(x.slide_urls ?? []).length} slides | ${String(x.caption).slice(0, 60)}...`));
      return;
    }
    if (a.includes("--approve")) return decideWick(a[a.indexOf("--approve") + 1], "approve");
    if (a.includes("--reject")) return decideWick(a[a.indexOf("--reject") + 1], "reject");
    if (a.includes("--publish")) return publishNextApproved();
    console.log("usage: --batch | --list | --approve <id> | --reject <id> | --publish");
  };
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
