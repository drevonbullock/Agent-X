import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { findJargon } from "./wick-copy.js";

// ─── PULL = DIAGNOSE + REDO ──────────────────────────────────────────────────
// Dre, 2026-08-09: "whenever i say pull it i want you to redo it and see what
// went wrong."
//
// Pull used to be a delete: status -> rejected, end of story. That threw away
// the only signal the system ever gets about quality. A pull now does three
// things, in this order:
//   1. RETIRE the post so it cannot publish.
//   2. DIAGNOSE it against the rules, mechanically first and then with a
//      critique, and say plainly what went wrong.
//   3. REBUILD the same topic in the same format so the slot is not lost.
//
// The diagnosis is stored on the row, so a pattern across several pulls is
// visible later instead of being re-derived from memory each time.

const client = new Anthropic();
const words = (t) => String(t ?? "").trim().split(/\s+/).filter(Boolean).length;
const sentences = (t) => String(t ?? "").split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);

// Every line of reader-facing copy in a post, whatever the format's shape.
function copyLines(copy = {}) {
  const out = [];
  const push = (label, text) => { if (typeof text === "string" && text.trim()) out.push({ label, text }); };
  push("cover", copy.cover_headline);
  push("theme", copy.theme);
  push("reveal", copy.reveal_line);
  push("closing", copy.closing_line);
  push("application", copy.application);
  push("send_to", copy.send_to);
  for (const l of copy.lines ?? []) push("line", l.label);
  for (const p of copy.pairs ?? []) { push("pair-top", p.top_label); push("pair-bottom", p.bottom_label); }
  for (const r of copy.roles ?? []) push("role", r.label);
  for (const b of copy.beats ?? []) push("beat", b.bubble);
  for (const l of copy.labels ?? []) push("label", l);
  for (const c of copy.counters ?? []) push("counter", c);
  for (const it of copy.items ?? []) {
    push(`item${it.number} title`, it.title);
    push(`item${it.number} problem`, it.problem);
    push(`item${it.number} solution`, it.solution);
  }
  return out;
}

// Mechanical checks: the rules that can be measured rather than judged.
export function mechanicalFaults(copy = {}) {
  const faults = [];

  const jargon = findJargon(copy);
  if (jargon.length) faults.push(`Words that are too big or too technical: ${jargon.join(", ")}`);

  for (const { label, text } of copyLines(copy)) {
    const ss = sentences(text);
    if (ss.length > 2 && label !== "send_to") {
      faults.push(`"${label}" runs ${ss.length} sentences. Two is the ceiling, and the point had already landed.`);
    }
    for (const s of ss) {
      if (words(s) > 12) faults.push(`"${label}" has a ${words(s)}-word sentence: "${s}". Cut it to ten.`);
    }
  }

  if (!copy.send_to) faults.push("No send_to, so the closing slide cannot name who to send this to.");
  if (!copy.pillar_link) faults.push("No pillar_link. Every post must wire two pillars together.");
  else if (sentences(copy.pillar_link).length > 1 || words(copy.pillar_link) > 20) {
    faults.push("pillar_link is not one plain sentence, which usually means the topic was not ready.");
  }

  return faults;
}

// The judgement calls a regex cannot make: does it motivate, does it land, does
// the last beat free the reader or just scold them.
export async function critique(post) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `A post for Wick's Wisdom was PULLED by the owner, meaning he judged it not good enough to publish. Work out why.

The page's standard, in priority order:
1. Every word is one a child knows. No big words, no jargon, no psychology terms.
2. Two short sentences maximum for any line. Once the point lands, stop.
3. It must MOTIVATE. The reader should finish able to act, not just informed or told off. The last beat should hand them back something they control.
4. Every item is a MOMENT the reader can picture, never an abstract concept.
5. It wires two pillars together (Mind, Behaviour, Money, Systems) and names the handoff plainly.
6. No philosophy, no history, no invented statistics, no named companies.

THE POST (${post.format}, pillar ${post.pillar ?? "?"}):
${JSON.stringify(post.copy, null, 1).slice(0, 3500)}

Give the 1 to 3 REAL reasons this was pulled, sharpest first. Be concrete and quote the offending line. If the copy is actually fine, say the problem is likely the ARTWORK or the topic itself, and say which. No preamble, no praise, plain sentences, max 25 words each. Return a JSON array of strings and nothing else.`,
    }],
  });
  try {
    const t = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const arr = JSON.parse(t.slice(t.indexOf("[")));
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch { return []; }
}

// Full flow for one pulled post.
export async function diagnosePulled(id) {
  const { data: post } = await supabase.from("wick_posts").select("*").eq("id", id).maybeSingle();
  if (!post) return { faults: [], post: null };

  const faults = mechanicalFaults(post.copy ?? {});
  let judged = [];
  try { judged = await critique(post); }
  catch (err) { console.warn(`[WickDiag] critique failed: ${err.message}`); }

  const all = [...faults, ...judged];
  // Stored so a pattern across pulls is visible instead of re-derived each time.
  await supabase.from("wick_posts")
    .update({ pull_reasons: all, pulled_at: new Date().toISOString() })
    .eq("id", id);

  console.log(`[WickDiag] ${post.format} ep${post.topic_id} pulled:\n  - ${all.join("\n  - ")}`);
  return { faults: all, post };
}

// Rebuild the same topic in the same format so a pull does not cost a slot.
// Needs the Higgsfield CLI, so on Railway this reports instead of silently
// doing nothing, which is the failure mode that started this whole thread.
export async function rebuildPulled(post) {
  const { hfAvailable } = await import("./wick-render.js");
  if (!hfAvailable()) {
    return { rebuilt: false, reason: "Higgsfield CLI unavailable on this host" };
  }
  const { runWeeklyBatch } = await import("./wicks-wisdom.js");
  const r = await runWeeklyBatch({ formats: [post.format] });
  return { rebuilt: !r?.skipped, result: r };
}

// What the Telegram handler calls: diagnose, report, rebuild.
export async function handlePull(id) {
  const { faults, post } = await diagnosePulled(id);
  if (!post) return "Pulled, but the post could not be found to diagnose.";

  const header = `🚫 Pulled ${post.format} ep${post.topic_id}\n\nWhat went wrong:`;
  const body = faults.length
    ? faults.map((f) => `• ${f}`).join("\n")
    : "• Nothing mechanical found. Likely the artwork or the topic itself.";

  let tail = "";
  try {
    const r = await rebuildPulled(post);
    tail = r.rebuilt
      ? "\n\n♻️ Rebuilding a replacement now. It will arrive here when it is done."
      : `\n\n⚠️ Cannot rebuild here: ${r.reason}. Run the batch on the Mac.`;
  } catch (err) {
    tail = `\n\n⚠️ Rebuild failed to start: ${err.message}`;
  }
  return `${header}\n${body}${tail}`;
}
