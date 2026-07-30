import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── WICK'S WISDOM — COPY ENGINE ─────────────────────────────────────────────
// Copy is written FIRST, before any image is generated (SKILL.md Step 2:
// overproduce and cut). Copy is the cheap part and decides everything.
//
// Pillars: Money, Systems, Mind, Behaviour. There is no fifth.
// Formula: lead with the BEHAVIOUR, land on the MONEY.
// Every post must reveal a HIDDEN RULE that was always operating on the reader.

export const PILLARS = ["Money", "Systems", "Mind", "Behaviour"];

const BRAND_RULES = `
WICK'S WISDOM — non-negotiable content rules.

THE LANE: hidden rules. Every post reveals a rule that was always operating on the
reader and that nobody named for them. If it doesn't reveal a hidden rule, it isn't
a Wick's Wisdom post.

THE FORMULA: lead with the behaviour, land on the money. Open on a feeling the
reader recognizes. Reveal the mechanic underneath it. Behaviour is the hook; money
is the stakes.

THE MECHANISM RULE: the money layer is always a MECHANISM, never a lecture. Explain
how a system exploits or rewards a predictable human tendency. NEVER tell anyone
what to buy, invest in, or do with their money. No financial advice, ever.

HARD NEVERS:
- NEVER fabricate history. No invented bans, fake attributions, or research that
  does not exist. This brand enters ancient wisdom where readers know primary
  sources. One credible debunk costs more than a year of posts earns. Only use
  genuinely real practices, people and terms. If unsure of a fact, do not use it.
- NEVER claim proof that does not exist. No follower counts, revenue figures, or
  origin stories. No app CTAs. The app does not exist.
- NEVER teach HOW. WHAT, WHY and WHEN only. Name the practice and the cost of
  skipping it; the method stays behind the paywall.
- NEVER name a real modern company, product, app or living person, and NEVER
  make a specific factual claim about one (no "Company X removed the confirmation
  screen and volume spiked"). Those claims cannot be verified and one debunk
  costs more than a year of posts earns. Describe the MECHANISM generically:
  "the apps are built so the tap comes before the thought". Historical figures
  and genuinely documented ancient practice are the only named specifics allowed.
- NEVER invent statistics, percentages, study results or research findings.
- NEVER use the sage register. No "dear seeker", no "ancient ones", no faux
  scripture. Wick is wise; the writing sounds like a friend who reads a lot.
- NEVER use em dashes or en dashes. Write separate sentences instead.
- No hashtags in body copy.

TRUE MATERIAL that survives an expert (use freely): Stoics rehearsed misfortune
deliberately (praemeditatio malorum). Pythagoreans required years of silence from
new students. Marcus Aurelius wrote a private notebook never meant to be read.
Diogenes lived in a jar and owned almost nothing. Seneca wrote letters on time and
money. Epictetus was born enslaved and taught inner freedom. Roman households
buried savings in sealed jars.`;

function stripDashes(s) {
  return String(s ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
}

function parseJson(raw) {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.search(/[[{]/);
  return JSON.parse(t.slice(start));
}

// ─── VERSUS — two-panel comparison (the engine format) ───────────────────────

export async function writeVersus(count = 1) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

FORMAT: VERSUS. Two stacked panels arguing with each other. Primary sub-type is
ANCIENT vs MODERN: every piece of genuine ancient practice implies a modern failure.
The top label states the ancient reality, the bottom label states the modern one.
Short labels. The bottom line should land like a quiet accusation the reader
recognizes about themselves.

Reference rhythm (do not copy these, write new ones):
"Marcus Aurelius journaled to know himself" / "You scroll to forget yourself"
"Diogenes owned one cup" / "You own forty-seven subscriptions"
"The Stoics practiced poverty on purpose" / "You practice it by accident"

Write ${count === 1 ? "1 VERSUS post" : count + " DIFFERENT VERSUS posts"}. Overproduce internally, then return only the best.

Return JSON array, one object each:
[{
  "pillar": "Money|Systems|Mind|Behaviour",
  "sub_type": "ancient_vs_modern",
  "top_label": "the ancient line, max 9 words",
  "bottom_label": "the modern line, max 9 words",
  "top_scene": "One dense sentence describing a concrete ancient scene for Wick: what he is doing, 3-4 named physical objects, the setting. No character description, he is supplied separately.",
  "bottom_scene": "One dense sentence describing the modern mirror scene: what Wick is doing, 3-4 named modern objects, the setting.",
  "hidden_rule": "the rule this reveals, one sentence, for internal use"
}]`,
    }],
  });
  return parseJson(msg.content[0].text).map((p) => ({
    ...p,
    top_label: stripDashes(p.top_label),
    bottom_label: stripDashes(p.bottom_label),
  }));
}

// ─── ORDER — imperative two-panel (command, then turn or arithmetic) ─────────

export async function writeOrder(count = 1) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1600,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

FORMAT: ORDER. Two panels. Panel one gives a command. Panel two either inverts it
(the turn) or does the arithmetic on it. The ARITHMETIC variant is strongest
because the number persuades so the copy does not have to. Prefer arithmetic.

Reference rhythm (do not copy):
"Read ten pages a day." / "That's fifteen books a year."
"Wake before the house." / "Tell no one."
"Save two dollars a day." / "That's seven hundred and thirty a year."

All arithmetic MUST be correct. Check the multiplication.

Write ${count === 1 ? "1 ORDER post" : count + " DIFFERENT ORDER posts"}.

Return JSON array:
[{
  "pillar": "Money|Systems|Mind|Behaviour",
  "sub_type": "arithmetic|turn",
  "top_label": "the command, max 8 words",
  "bottom_label": "the turn or the arithmetic, max 10 words",
  "top_scene": "One dense sentence: concrete scene for Wick performing the command, 3-4 named objects, setting.",
  "bottom_scene": "One dense sentence: the payoff scene, 3-4 named objects showing accumulation or consequence.",
  "hidden_rule": "one sentence, internal"
}]`,
    }],
  });
  return parseJson(msg.content[0].text).map((p) => ({
    ...p,
    top_label: stripDashes(p.top_label),
    bottom_label: stripDashes(p.bottom_label),
  }));
}

// ─── COSTUME — archetype carousel, 8 archetypes + CTA ────────────────────────

export const ARCHETYPES = [
  { label: "Think like a Stoic",      bold: "Stoic",    pillar: "Mind",      wardrobe: "a simple white toga draped over his wax body", setting: "an open marble colonnade with a violent storm raging beyond the columns, sheeting rain and trees bent sideways", beat: "his flame burns perfectly straight and undisturbed despite the storm" },
  { label: "Watch like a Monk",       bold: "Monk",     pillar: "Mind",      wardrobe: "a coarse undyed wool habit over his wax body", setting: "a stone cloister before dawn, a single arched window, a worn prayer bench, a clay water bowl", beat: "he sits perfectly still watching the doorway, hands folded" },
  { label: "Plan like an Engineer",   bold: "Engineer", pillar: "Systems",   wardrobe: "a leather work apron over his wax body", setting: "a workshop with an unrolled aqueduct blueprint on a heavy table, bronze calipers, a real stone aqueduct visible through the arch", beat: "he measures the blueprint with the calipers" },
  { label: "Count like a Merchant",   bold: "Merchant", pillar: "Money",     wardrobe: "a russet merchant robe over his wax body", setting: "a storeroom counting table with a bronze balance scale, sorted stacks of coins, an open ledger, sealed amphorae behind", beat: "he weighs coins on the balance, focused" },
  { label: "Save like a Farmer",      bold: "Farmer",   pillar: "Money",     wardrobe: "a rough homespun tunic over his wax body", setting: "a stone granary at harvest, full grain sacks, a wooden scoop, a sealed storage jar, bare winter fields through the door", beat: "he sets aside one sack separate from the rest" },
  { label: "Question like Socrates",  bold: "Socrates", pillar: "Behaviour", wardrobe: "a pale draped himation over his wax body", setting: "a sunlit market square with stone steps, a fruit stall, a small group of listeners seated on the steps", beat: "one mitten hand open in a questioning gesture" },
  { label: "Speak like a Diplomat",   bold: "Diplomat", pillar: "Behaviour", wardrobe: "a deep blue formal robe over his wax body", setting: "a quiet negotiation chamber, a long polished table, two sealed scrolls, a carafe of water, empty chairs opposite", beat: "he listens with hands still, saying nothing yet" },
  { label: "Endure like a Spartan",   bold: "Spartan",  pillar: "Behaviour", wardrobe: "a crimson wool cloak over his wax body", setting: "a rocky mountain pass at cold dawn, a bronze helmet resting on the rock beside him, a worn leather pack, frost on stone", beat: "his flame burns low but completely steady in the cold wind" },
];

// ─── LESSON — problem/solution carousel, 7 slides ────────────────────────────

export async function writeLesson() {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2600,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

FORMAT: LESSON. A 7 slide problem/solution carousel. Slide 1 is a cover whose
headline promises a count. Slides 2 to 6 are one numbered item each with a PROBLEM
block and a SOLUTION block. Slide 7 recaps every item visually and asks for a
keyword.

The SOLUTION blocks must obey the HOW rule: name the practice and the cost of
skipping it, never the step by step method. "Rehearse the loss before it arrives"
is allowed. A protocol for doing it is not.

Cover headline examples for rhythm (write a new one):
"5 Signs You're Living Someone Else's Life"
"7 Ways You're Quietly Losing Money"
"6 Ancient Habits That Fix A Modern Head"

Return JSON object:
{
  "pillar": "Money|Systems|Mind|Behaviour",
  "cover_headline": "ALL CAPS headline promising a count, max 8 words",
  "cover_scene": "One dense sentence: the cover scene for Wick, 3-4 named objects, setting.",
  "items": [
    {
      "number": 1,
      "title": "Short item title, max 6 words",
      "problem": "2 to 3 sentences naming the trap, in second person.",
      "solution": "2 to 3 sentences naming the practice and the cost of skipping it. NEVER a method.",
      "scene": "One dense sentence: scene for Wick illustrating this item, 3-4 named objects.",
      "signpost": "2 to 3 word label for the recap slide signpost"
    }
  ],
  "closing_line": "One sentence that reframes the whole list.",
  "keyword": "WISDOM|RITUAL|STOIC|SAGE",
  "resource": "name of the free text resource the keyword delivers"
}

Exactly 5 items.`,
    }],
  });
  const l = parseJson(msg.content[0].text);
  l.cover_headline = stripDashes(l.cover_headline).toUpperCase();
  l.closing_line = stripDashes(l.closing_line);
  l.items = (l.items ?? []).slice(0, 5).map((it) => ({
    ...it,
    title: stripDashes(it.title),
    problem: stripDashes(it.problem),
    solution: stripDashes(it.solution),
  }));
  return l;
}

// ─── CAPTION — the four-beat formula ─────────────────────────────────────────

export async function writeCaption(post) {
  const context = post.format === "LESSON"
    ? `A carousel titled "${post.copy.cover_headline}" covering: ${post.copy.items.map((i) => i.title).join(", ")}.`
    : post.format === "COSTUME"
      ? `An archetype carousel: ${(post.copy.archetypes ?? []).map((a) => a.label).join(", ")}.`
      : `A two panel post. Top: "${post.copy.top_label}". Bottom: "${post.copy.bottom_label}".`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

Write the Instagram caption for this post.
${context}
The hidden rule it reveals: ${post.copy.hidden_rule ?? post.copy.closing_line ?? ""}

THE FOUR BEAT FORMULA, in order:
1. Contradict the obvious read. Open by dismissing the conclusion the viewer just
   reached. NEVER describe the image.
2. Give the real mechanism. Two or three sentences, concrete, no hedging.
3. One specific example. A number, a name, a scene. This is what separates a
   caption from a fortune cookie.
4. Soft close. A question, or nothing. Never a hard pitch.

Voice: conversational, like texting a smart friend. Confident, occasionally
unfiltered. Never the sage register.

Under 900 characters. Plain text only, no markdown, no hashtags, no em dashes.
Write only the caption.`,
    }],
  });
  return stripDashes(msg.content[0].text.trim()).slice(0, 2200);
}
