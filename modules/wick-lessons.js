import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";

// ─── SELF LEARNING ───────────────────────────────────────────────────────────
// Dre, 2026-08-09: "you should always be self learning, when i pull one learn
// from your mistakes."
//
// Until now a pull produced a diagnosis that was read once and forgotten, so the
// same fault shipped again the following week. This turns every rejection into a
// DURABLE RULE that is injected back into the prompts that generate the next
// batch. The system gets stricter each time it gets something wrong.
//
// Two scopes, because the two failure modes are fixed in different places:
//   copy  -> injected into wick-copy.js BRAND_RULES
//   image -> injected into wick-render.js scene prompts
//
// Recurrence is counted rather than duplicated: a fault that keeps happening
// gets a rising `hits` value and is stated more forcefully, which is the signal
// that a prompt rule is not holding and something structural is needed instead.

const client = new Anthropic();

// Distil one or more concrete faults into short imperative rules.
export async function learnFrom(faults, { scope = "copy", source = "pull" } = {}) {
  const list = (Array.isArray(faults) ? faults : [faults]).filter(Boolean);
  if (!list.length) return [];

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `These are faults found in rejected content for an Instagram brand:

${list.map((f) => `- ${f}`).join("\n")}

Turn them into DURABLE PREVENTION RULES to add to the generator's instructions.

Rules:
- Imperative and specific. "Never X" or "Always Y".
- Each must be general enough to prevent the CLASS of mistake, not just this instance. "Never name a psychology term" beats "never say status quo bias".
- Max 18 words each.
- Skip anything that is a one-off fluke rather than a repeatable mistake.
- Return at most 3.
- ${scope === "image" ? "These are ARTWORK faults, so write rules for an image generation prompt." : "These are COPY faults, so write rules for a writing prompt."}

Return a JSON array of strings, nothing else.`,
    }],
  });

  let rules = [];
  try {
    const t = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    rules = JSON.parse(t.slice(t.indexOf("["))).map(String).filter(Boolean);
  } catch { return []; }

  const saved = [];
  for (const rule of rules.slice(0, 3)) {
    // A repeat fault increments hits rather than creating a duplicate row: the
    // count is the evidence that a prompt rule is not holding.
    const { data: existing } = await supabase.from("wick_lessons")
      .select("id,hits").ilike("rule", rule).maybeSingle();
    if (existing) {
      await supabase.from("wick_lessons")
        .update({ hits: existing.hits + 1, updated_at: new Date().toISOString(), active: true })
        .eq("id", existing.id);
      saved.push({ rule, repeated: true, hits: existing.hits + 1 });
    } else {
      await supabase.from("wick_lessons").insert({ rule, scope, source });
      saved.push({ rule, repeated: false, hits: 1 });
    }
  }
  if (saved.length) {
    console.log(`[WickLessons] learned ${saved.length} rule(s) from ${source}:`);
    for (const s of saved) console.log(`  ${s.repeated ? `↑ x${s.hits}` : "+ new"} ${s.rule}`);
  }
  return saved;
}

// Rules to inject at generation time. Most-repeated first, because a fault that
// keeps recurring is the one the model is most likely to make again.
export async function activeLessons(scope = "copy", limit = 12) {
  const { data } = await supabase.from("wick_lessons")
    .select("rule,hits").eq("scope", scope).eq("active", true)
    .order("hits", { ascending: false }).order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => (r.hits > 1 ? `${r.rule} (this has happened ${r.hits} times, do not repeat it)` : r.rule));
}

// Rendered block for a prompt. Empty string when nothing has been learned yet,
// so a fresh install is unaffected.
export async function lessonsBlock(scope = "copy") {
  try {
    const rules = await activeLessons(scope);
    if (!rules.length) return "";
    return `\nLEARNED FROM REJECTED WORK. These are mistakes this system has actually made and had pulled. Each one is non-negotiable:\n${rules.map((r) => `- ${r}`).join("\n")}\n`;
  } catch { return ""; }   // learning must never break generation
}

// CLI: node modules/wick-lessons.js
const entry = process.argv[1] ? (await import("url")).pathToFileURL(process.argv[1]).href : null;
if (entry && import.meta.url === entry) {
  (async () => {
    for (const scope of ["copy", "image"]) {
      const { data } = await supabase.from("wick_lessons")
        .select("rule,hits,source,created_at").eq("scope", scope).eq("active", true)
        .order("hits", { ascending: false });
      console.log(`\n=== ${scope.toUpperCase()} (${data?.length ?? 0}) ===`);
      for (const r of data ?? []) console.log(`  x${r.hits}  ${r.rule}   [${r.source}]`);
    }
    process.exit(0);
  })();
}
