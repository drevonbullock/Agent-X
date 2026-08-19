import "dotenv/config";
import fs from "fs";
import path from "path";
import supabase from "../supabase/client.js";
import { postCarouselToInstagram, postImageToInstagram } from "../distributors/instagram.js";
import { writeVersusCarousel, writeOrderCarousel, writeCostume, writeLesson, writeParable, writeCaption } from "./wick-copy.js";
import { pickTopics } from "./wick-topics.js";
import {
  hfAvailable, generateScene, download, tmpDir,
  versusPanelPrompt, costumePrompt, lessonScenePrompt,
  compositeTwoPanel, compositeSplitPanel, compositeSinglePanel, compositeReveal, compositeParable,
  parableScenePrompt,
  compositeCostume, compositeLessonCover, compositeLessonItem, compositeCta,
} from "./wick-render.js";

// ─── WICK'S WISDOM — ORCHESTRATOR ────────────────────────────────────────────
// Weekly batch → Supabase queue → publish to the same Instagram account Agent X
// already uses (same token, same business id, new brand).
//
// AUTO MODE (Dre, 2026-07-30): posts are queued already approved and publish on
// their 9am/12pm slot with no human gate. Telegram notifies with a per-post Pull
// kill switch. Set WICK_AUTO_PUBLISH=false to restore the approval gate.

const BUCKET = "agent-x-images";

// Retries, for the same reason download() does: by the time we upload, the art
// has already been GENERATED AND PAID FOR. Losing a finished ORDER carousel to a
// transient "fetch failed" throws away five generations, and it happened live on
// 2026-08-09. A network blip must never cost credits.
async function uploadSlide(buffer, storagePath, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
      return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const backoff = 2000 * i;
        console.warn(`[Wick] upload attempt ${i}/${attempts} failed (${err.message}), retrying in ${backoff / 1000}s`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw new Error(`Upload failed after ${attempts} attempts: ${lastErr?.message}`);
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
// VERSUS has two layouts and alternates between them, both supplied by Dre:
//   stacked — two wide panels one above the other
//   split   — a vertical split, consequence on the left, cause on the right
// Alternating stops a profile grid of VERSUS posts reading as one repeated
// template. Panel aspect follows the layout: 3:2 for stacked, 9:16 for split.
async function buildComparisonCarousel(c, format, dir, jobIds, layout = "stacked") {
  const split = layout === "split";
  console.log(`[Wick] ${format} carousel (${layout}): "${c.theme}" (${c.pairs.length} comparisons + CTA)`);
  const buffers = [];

  for (let i = 0; i < c.pairs.length; i++) {
    const pair = c.pairs[i];
    console.log(`[Wick]   ${i + 1}/${c.pairs.length}: "${pair.top_label}" / "${pair.bottom_label}"`);
    const aspect = split ? "9:16" : "3:2";
    const topPath = await scene(versusPanelPrompt(pair.top_scene, { owned: true,  expression: pair.top_expression,  seed: i * 2 }),     dir, `p${i}-top`, aspect, jobIds);
    const botPath = await scene(versusPanelPrompt(pair.bottom_scene, { owned: false, expression: pair.bottom_expression, seed: i * 2 + 1 }), dir, `p${i}-bot`, aspect, jobIds);
    buffers.push(split
      // Left is the consequence, so the reader meets the outcome before the cause.
      ? await compositeSplitPanel({
          leftPath: botPath, rightPath: topPath,
          leftLabel: pair.bottom_label, rightLabel: pair.top_label,
        })
      : await compositeTwoPanel({
          topPath, bottomPath: botPath,
          topLabel: pair.top_label, bottomLabel: pair.bottom_label,
        }));
  }

  const ctaPath = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression, 0, "upper"), dir, "cta", "4:5", jobIds);
  buffers.push(await compositeCta({
    scenePath: ctaPath,
    closingLine: c.closing_line,
    sendTo: c.send_to, keyword: c.keyword, resource: c.resource,
  }));

  return { slideBuffers: buffers, copy: c, format, sub_type: c.sub_type, pillar: c.pillar };
}

// ORDER — one full-bleed scene per line, then the reveal. Not a comparison.
async function buildOrderCarousel(c, dir, jobIds) {
  console.log(`[Wick] ORDER carousel: "${c.theme}" (${c.lines.length} lines + reveal)`);
  const buffers = [];
  for (let i = 0; i < c.lines.length; i++) {
    const line = c.lines[i];
    console.log(`[Wick]   ${i + 1}/${c.lines.length}: "${line.label}"`);
    const p = await scene(lessonScenePrompt(line.scene, line.expression, i, "upper"), dir, `line-${i}`, "4:5", jobIds);
    buffers.push(await compositeSinglePanel({ scenePath: p, label: line.label }));
  }
  const revealPath = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression, 9, "upper"), dir, "reveal", "4:5", jobIds);
  buffers.push(await compositeReveal({
    scenePath: revealPath,
    revealLine: c.reveal_line,
    closingLine: c.closing_line,
    sendTo: c.send_to,
  }));
  return { slideBuffers: buffers, copy: c, format: "ORDER", sub_type: c.sub_type ?? "repeating_formula", pillar: c.pillar };
}

// PARABLE — three speech-bubble beats, the application, then the ask.
async function buildParable(topic, dir, jobIds) {
  const c = await writeParable(topic);
  console.log(`[Wick] PARABLE: "${c.theme}" (speaker: ${c.speaker})`);
  const buffers = [];
  for (let i = 0; i < c.beats.length; i++) {
    const b = c.beats[i];
    console.log(`[Wick]   ${i + 1}/3: "${b.bubble}"`);
    const p = await scene(parableScenePrompt(b.scene, b.expression, b.side, i), dir, `beat-${i}`, "4:5", jobIds);
    buffers.push(await compositeParable({ scenePath: p, bubbleText: b.bubble, side: b.side }));
  }
  const appPath = await scene(lessonScenePrompt(c.application_scene, c.application_expression, 5, "upper"), dir, "apply", "4:5", jobIds);
  buffers.push(await compositeSinglePanel({ scenePath: appPath, label: c.application }));

  const ctaPath = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression, 9, "upper"), dir, "cta", "4:5", jobIds);
  buffers.push(await compositeReveal({
    scenePath: ctaPath, revealLine: c.application,
    closingLine: c.closing_line, sendTo: c.send_to,
  }));
  return { slideBuffers: buffers, copy: c, format: "PARABLE", sub_type: "parable", pillar: c.pillar };
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
  const ctaScene = await scene(lessonScenePrompt(c.cta_scene, c.cta_expression, 0, "upper"), dir, "cta", "4:5", jobIds);
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

  const coverPath = await scene(lessonScenePrompt(l.cover_scene, l.cover_expression, 0, "upper"), dir, "cover", "4:5", jobIds);
  buffers.push(await compositeLessonCover({ scenePath: coverPath, headline: l.cover_headline }));

  for (const item of l.items) {
    // 3:2, NOT 4:5. The item slot is 1080x700 landscape; generating portrait and
    // cropping to it kept only rows ~65-765 of a 1350-tall frame and sliced off
    // the wax body, arms and legs, so Wick read as a floating head. Matching the
    // slot's aspect removes the destructive crop entirely.
    const p = await scene(lessonScenePrompt(item.scene, item.expression, item.number), dir, `item-${item.number}`, "3:2", jobIds);
    buffers.push(await compositeLessonItem({
      scenePath: p, number: item.number, title: item.title,
      problem: item.problem, solution: item.solution,
    }));
  }

  // Recap CTA — every item becomes a labelled signpost pointing down the wrong road.
  const signposts = l.items.map((i) => i.signpost).filter(Boolean);
  const recapPath = await scene(lessonScenePrompt(
    `stands on a city sidewalk at dusk at a five way junction, ${signposts.length} illuminated overhead direction signs crowded above the left hand street all pointing the same way, one clear open street to the right leading toward lit towers, a bus shelter and parked cars framing the junction`
  , undefined, 0, "upper"), dir, "recap", "4:5", jobIds);
  buffers.push(await compositeCta({
    scenePath: recapPath, closingLine: l.closing_line,
    sendTo: l.send_to, keyword: l.keyword, resource: l.resource,
  }));

  return { slideBuffers: buffers, copy: l, format: "LESSON", sub_type: "problem_solution", pillar: l.pillar };
}

// ─── BATCH ───────────────────────────────────────────────────────────────────
// Feeds the 2/day publish schedule: 14 posts per week. Format mix is decided by
// planFormats(): even rotation while any format is under-tested, then weighted
// by measured shares per like.
//
// Cost note: a comparison carousel is 9 generations, COSTUME is 7, LESSON is 7.
// At ~7 credits per generation (gpt_image_2) a 14 post week is roughly 800 credits;
// nano_banana_pro is 2 credits and cuts that to ~230. Switch via WICK_IMAGE_MODEL.
// Dial WICK_POSTS_PER_WEEK down if that outruns the credit budget.

// Formats that rotate freely across the HYBRID lane. COSTUME and PARABLE are
// excluded on purpose: they are pinned to MONEY_SYSTEMS and MIND_BEHAVIOUR.
const FORMATS = ["VERSUS", "ORDER", "LESSON"];
const MIN_SAMPLES = 3;

// Which formats to build, and how many of each.
//
// This used to hardcode 60% VERSUS because the brand doc asserts VERSUS is the
// highest share-rate format. That is an assumption, not a measurement, and it
// starved LESSON to zero in a 6 post batch, which made the shares-per-like
// scoreboard unable to ever rank it. Optimising for an unverified winner while
// removing the means to verify it is the wrong order of operations.
//
// So: until every format has MIN_SAMPLES published posts, deal them out evenly
// and learn something. After that, weight toward what actually earns forwards.
async function planFormats(perWeek) {
  const { data } = await supabase.from("wick_posts")
    .select("format,likes,shares").eq("status", "posted");

  const stats = new Map(FORMATS.map((f) => [f, { n: 0, likes: 0, shares: 0 }]));
  for (const p of data ?? []) {
    const s = stats.get(p.format);
    if (!s) continue;
    s.n++; s.likes += p.likes ?? 0; s.shares += p.shares ?? 0;
  }

  const underTested = FORMATS.filter((f) => stats.get(f).n < MIN_SAMPLES);
  if (underTested.length) {
    // Even rotation, starting with the least-tested formats.
    const order = [...FORMATS].sort((a, b) => stats.get(a).n - stats.get(b).n);
    const plan = Array.from({ length: perWeek }, (_, i) => order[i % order.length]);
    console.log(`[Wick] Testing phase: ${underTested.join(", ")} under ${MIN_SAMPLES} posts. Rotating all four evenly.`);
    return plan;
  }

  // Every format has a real sample. Weight by shares per like, the metric the
  // brand actually optimises for, with a floor so nothing is fully retired.
  const scored = FORMATS.map((f) => {
    const s = stats.get(f);
    return { f, score: s.likes > 0 ? s.shares / s.likes : 0 };
  }).sort((a, b) => b.score - a.score);
  const weights = [0.4, 0.3, 0.2, 0.1];
  const plan = [];
  scored.forEach((s, i) => {
    const n = Math.max(1, Math.round(perWeek * weights[i]));
    for (let k = 0; k < n && plan.length < perWeek; k++) plan.push(s.f);
  });
  while (plan.length < perWeek) plan.push(scored[0].f);
  console.log(`[Wick] Weighting by shares/like: ${scored.map((s) => `${s.f} ${s.score.toFixed(3)}`).join(", ")}`);
  return plan.slice(0, perWeek);
}

// opts.formats — explicit format list, e.g. ["LESSON"]. Used to top up a format
// the automatic plan under-served, without re-running a whole batch.
export async function runWeeklyBatch({ versus, order, formats, rotating = "auto" } = {}) {
  const perWeek = formats?.length ?? parseInt(process.env.WICK_POSTS_PER_WEEK ?? "14", 10);
  // Refresh credentials before the gate. The access token lives ~24h, so a
  // long-running Railway container would otherwise reach Sunday with a dead
  // token and skip the batch for a reason that was entirely fixable.
  try {
    const { ensureHiggsfieldAuth } = await import("./higgsfield-auth.js");
    await ensureHiggsfieldAuth();
  } catch (err) {
    console.warn(`[Wick] higgsfield auth refresh failed: ${err.message}`);
  }

  if (!hfAvailable()) {
    // LOUD, not silent. This branch is ALWAYS taken on Railway (no Higgsfield
    // CLI there), so a quiet return here meant the weekly carousel batch no-opped
    // every Sunday and the queue drained with nobody told. See alertWick.
    const msg = "[Wick] SKIPPED: higgsfield CLI not available on this host. No carousel batch was built.";
    console.error(msg);
    try {
      const { alertWick } = await import("./wick-telegram.js");
      await alertWick("🚨 WICK CAROUSEL BATCH DID NOT RUN\n\nThe Higgsfield CLI is not available on this host, so no art could be generated. Railway cannot build batches.\n\nRun it on your Mac to refill the queue.");
    } catch { /* alerting must never mask the skip */ }
    return { skipped: true, reason: "higgsfield-cli-unavailable" };
  }
  // Pull in everything learned from previous pulls and failed image QA before a
  // single frame is generated.
  try {
    const { loadImageLessons } = await import("./wick-render.js");
    await loadImageLessons();
  } catch { /* never block a batch on the learning layer */ }

  const batchId = `wick-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  console.log(`\n[Wick] Batch ${batchId} starting`);

  // Topics come from the fixed 30 episode registry at the 80/10/10 lane mix.
  // The copy engine is never allowed to choose its own subject: that is what
  // produced philosophy posts instead of Mind/Behaviour/Money/Systems ones.
  const topics = await pickTopics(perWeek);
  if (topics.length < perWeek) {
    console.warn(`[Wick] Only ${topics.length} unused topics for ${perWeek} slots — the registry is cycling.`);
  }

  // Assign a format to each topic, then write ALL copy before any image.
  // Explicit versus/order counts still win when passed, for one-off runs.
  const kinds = formats?.length ? formats
    : (versus != null || order != null)
    ? [
        ...Array.from({ length: versus ?? 0 }, () => "VERSUS"),
        ...Array.from({ length: order ?? 0 }, () => "ORDER"),
        ...Array.from({ length: Math.max(0, perWeek - (versus ?? 0) - (order ?? 0)) },
          (_, n) => (n % 2 === 0 ? "COSTUME" : "LESSON")),
      ]
    : await planFormats(perWeek);

  const jobs = [];
  const { canAfford } = await import("./credit-guard.js");

  for (let i = 0; i < kinds.length; i++) {
    // Checked per post, not once at the start. A batch spends over many minutes
    // and would otherwise sail past the reserve midway through.
    const afford = canAfford(kinds[i]);
    if (!afford.ok) {
      console.log(`[Wick] STOPPING to protect the credit floor: ${afford.reason}`);
      try {
        const { alertWick } = await import("./wick-telegram.js");
        await alertWick(`⛔ Batch stopped to protect your credit reserve.\n\n${afford.reason}\n\nBuilt ${created.length} post(s) before stopping.`);
      } catch { /* alerting must not mask the stop */ }
      break;
    }
    const topic = topics[i % topics.length];
    if (!topic) break;
    // Two formats are scoped to a lane rather than dealt by rotation, because
    // Dre scoped them by subject: parables are for how a person thinks and acts,
    // costumes are for showing every actor inside a money mechanism. Those lanes
    // are 10% each of the registry, so the mix lands with no extra counter to
    // drift out of sync. Everything else (the 80% HYBRID lane) rotates.
    const kind = topic.lane === "MIND_BEHAVIOUR" ? "PARABLE"
               : topic.lane === "MONEY_SYSTEMS"  ? "COSTUME"
               : kinds[i];
    console.log(`[Wick] copy ${i + 1}/${kinds.length} ${kind} <- #${topic.id} ${topic.title}`);
    const spec = kind === "VERSUS" ? await writeVersusCarousel(topic)
               : kind === "ORDER"  ? await writeOrderCarousel(topic)
               : null; // COSTUME/LESSON/PARABLE write their copy inside their builder
    jobs.push({ kind, spec, topic });
  }
  console.log(`[Wick] Plan: ${kinds.join(", ")} = ${jobs.length} posts`);

  const created = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const dir = tmpDir(batchId, i);
    const jobIds = [];
    try {
      let built;
      if (job.kind === "VERSUS") {
        const { count } = await supabase.from("wick_posts")
          .select("*", { count: "exact", head: true }).eq("format", "VERSUS");
        built = await buildComparisonCarousel(job.spec, "VERSUS", dir, jobIds,
          (count ?? 0) % 2 === 0 ? "stacked" : "split");
      } else if (job.kind === "ORDER") {
        built = await buildOrderCarousel(job.spec, dir, jobIds);
      } else if (job.kind === "PARABLE") {
        built = await buildParable(job.topic, dir, jobIds);
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
        // NOT "approved". approved means publishable, and publishNextApproved
        // runs at 9am and 12pm while the image QA runs once at 7am. A post built
        // at 2pm therefore published at 4pm, ~17 hours before the check would
        // ever see it: ep1024 went out 23 minutes after it was built and ep1029
        // 100 minutes after, both ungraded. The gate existed and never ran.
        // qa_pending is the holding state; only auditQueue promotes to approved.
        status: autoPublish ? "qa_pending" : "pending",
      }).select().single();
      if (error) throw new Error(`DB insert failed: ${error.message}`);

      created.push(data);
      console.log(`[Wick] Queued ${built.format} (${urls.length} slide${urls.length > 1 ? "s" : ""}) → ${autoPublish ? "auto-publishing on schedule" : "pending approval"}`);

      // Push THIS post the moment it exists, not the whole batch at the end.
      // A batch takes hours, so end-of-run delivery meant Dre sat with finished
      // posts sitting invisible in the database. Failure here is logged and
      // swallowed: a Telegram outage must never lose a post that already built.
      try {
        const { sendPostToTelegram } = await import("./wick-telegram.js");
        await sendPostToTelegram(data);
      } catch (err) {
        console.warn(`[Wick] Telegram push failed for slot ${i} (post is saved, use /preview): ${err.message}`);
      }
    } catch (err) {
      console.error(`[Wick] Post ${i} (${job.kind}) failed: ${err.message}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // Each post was already pushed as it was built, so this is just the summary.
  if (created.length) {
    try {
      const { notifyBatchDone } = await import("./wick-telegram.js");
      await notifyBatchDone(created);
    } catch (err) {
      console.warn(`[Wick] batch summary failed: ${err.message}`);
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

  // DEDUP GUARD: never publish an episode whose topic already went out. A topic
  // can end up queued twice (an old batch and a rebuild covering the same
  // episode), and without this the same idea appears on the grid twice. Any such
  // row is retired here rather than published.
  const { data: posted } = await supabase.from("wick_posts")
    .select("topic_id").eq("status", "posted").not("topic_id", "is", null);
  const postedTopics = new Set((posted ?? []).map((r) => r.topic_id));
  const fresh = [];
  for (const p of queue) {
    if (p.topic_id != null && postedTopics.has(p.topic_id)) {
      await supabase.from("wick_posts").update({ status: "rejected" }).eq("id", p.id);
      console.log(`[Wick] Skipping ep${p.topic_id} (${p.format}) — that episode already published; retiring the duplicate.`);
    } else {
      fresh.push(p);
    }
  }
  if (!fresh.length) { console.log("[Wick] Nothing left to publish after dedup."); return null; }

  // Alternate styles: prefer the oldest fresh post whose format differs from the
  // one published most recently. Falls back to FIFO so a single-format queue
  // still drains.
  const { data: last } = await supabase.from("wick_posts")
    .select("format").eq("status", "posted")
    .order("published_at", { ascending: false }).limit(1);
  const lastFormat = last?.[0]?.format ?? null;

  const post = fresh.find((p) => p.format !== lastFormat) ?? fresh[0];

  // RACE GUARD: claim the row before publishing. A conditional update flips it
  // out of "approved" so a concurrent run (cron retry, manual publish) cannot
  // grab the same post and publish it twice.
  const { data: claimed } = await supabase.from("wick_posts")
    .update({ status: "posting" }).eq("id", post.id).eq("status", "approved")
    .select("id").maybeSingle();
  if (!claimed) { console.log(`[Wick] ${post.id} already claimed by another run — skipping.`); return null; }
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
    // Release the claim back to approved so the next slot retries. Without this
    // a failed publish would strand the post in "posting" forever.
    await supabase.from("wick_posts").update({ status: "approved" }).eq("id", post.id).eq("status", "posting");
    console.error(`[Wick] Publish failed (released for retry): ${err.message}`);
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
