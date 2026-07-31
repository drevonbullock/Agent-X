import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── WICK'S WISDOM — COPY ENGINE ─────────────────────────────────────────────
// Copy is written FIRST, before any image is generated (SKILL.md Step 2:
// overproduce and cut). Copy is the cheap part and decides everything.
//
// Pillars: Money, Systems, Mind, Behaviour. There is no fifth.
// Every post connects TWO of them. The whole point of the page is that they are
// one machine: how you think sets what you do, what you do builds the system,
// the system decides what you keep. A post that sits inside a single pillar is
// a quote page post, not a Wick's Wisdom post.
//
// Everything is PRESENT DAY. No philosophy, no philosophers, no antiquity.

export const PILLARS = ["Money", "Systems", "Mind", "Behaviour"];

// Free-resource keywords people DM. Kept plain and modern on purpose.
export const KEYWORDS = ["SYSTEM", "RESET", "LEDGER", "BLUEPRINT"];

const BRAND_RULES = `
WICK'S WISDOM — non-negotiable content rules.

THE FOUR PILLARS: Mind, Behaviour, Money, Systems. There is no fifth.

THE INTEGRATION RULE (the most important rule on this page): every post must
connect TWO pillars and show the wiring between them. Mind changes Behaviour.
Behaviour compounds into Money. Systems decide which behaviours are easy. Money
buys back Mind. Name the link and make the reader feel the handoff. A post that
lives inside one pillar has failed, however good the line sounds.

THE LANE: hidden rules. Every post reveals a rule that was already running the
reader's life that nobody named for them.

THE FORMULA: lead with the behaviour, land on the money. Open on a feeling the
reader recognizes. Reveal the mechanic underneath it. Behaviour is the hook; money
is the stakes.

THE MECHANISM RULE: the money layer is always a MECHANISM, never a lecture. Explain
how a system exploits or rewards a predictable human tendency. NEVER tell anyone
what to buy, invest in, or do with their money. No financial advice, ever.

THIS PAGE IS NOT A PHILOSOPHY PAGE. This is the rule that gets broken most, so
read it twice:
- NEVER mention philosophy, a philosopher, or a school of thought. No Stoics, no
  Stoicism, no Marcus Aurelius, no Seneca, no Socrates, no Epictetus, no Diogenes,
  no Buddhism, no monks, no ancient Greece or Rome, no "the ancients".
- NEVER reference history at all. No historical figures, no old civilisations, no
  "for thousands of years", no antiquity as a source of authority.
- NEVER write abstract wisdom for its own sake. Every claim must cash out into
  something a person does on a Tuesday and something it costs or earns them.
- Every scene is PRESENT DAY. Phones, laptops, apartments, gyms, cars, offices,
  storefronts, kitchens, delivery boxes. No togas, scrolls, oil lamps, stone
  colonnades, granaries or candles-as-props.

HARD NEVERS:
- NEVER claim proof that does not exist. No follower counts, revenue figures, or
  origin stories. No app CTAs. The app does not exist.
- NEVER teach HOW. WHAT, WHY and WHEN only. Name the practice and the cost of
  skipping it; the method stays behind the paywall.
- NEVER name a real company, product, app or living person, and NEVER make a
  specific factual claim about one (no "Company X removed the confirmation screen
  and volume spiked"). Those claims cannot be verified and one debunk costs more
  than a year of posts earns. Describe the MECHANISM generically instead, in your
  own fresh wording every time.
- NEVER reuse a phrase that appears in these instructions. Every line you write
  must be newly worded. The examples here are for RHYTHM only, never for copying.
- NEVER invent statistics, percentages, study results or research findings.
- NEVER invent a person or an anecdote. No "one guy I know", no "a friend of
  mine", no "I had a client who". The author's private life is never content and
  a made up example is a fabricated proof. When beat 3 needs something concrete,
  use ARITHMETIC on a hypothetical the reader can check ("six charges at twelve
  dollars is eight hundred and sixty four a year"), never a story about a person.
  Every number you write must actually multiply out. Check it.
- NEVER use the sage register. No "dear seeker", no faux scripture, no fortune
  cookie lines. Wick sounds like a sharp friend who has run the numbers.
- NEVER use em dashes or en dashes. Write separate sentences instead.
- No hashtags in body copy.`;

function stripDashes(s) {
  return String(s ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
}

// The topic is handed to the model as a fixed assignment. It writes the carousel
// FOR this subject and never chooses its own, which is what caused drift.
function topicBrief(topic) {
  const lane = {
    HYBRID: `This is a HYBRID post, the page's main lane. The behavioural mechanic is the hook and the money consequence is the payoff. Both halves must be present and the handoff between them must be explicit.`,
    MIND_BEHAVIOUR: `This is a MIND into BEHAVIOUR post. Show how the thought pattern produces the action. Money may appear at the edge but is not the subject.`,
    MONEY_SYSTEMS: `This is a MONEY into SYSTEMS post. Show how the machine is built, who designed it that way, and who it pays. Explain the mechanism, never give advice.`,
  }[topic.lane];

  return `YOUR ASSIGNED TOPIC. Write about this and nothing else.

TITLE: ${topic.title}
BEHAVIOURAL MECHANIC: ${topic.hook}
WHERE IT LANDS: ${topic.payoff}

${lane}

The title above is the subject, not a line to quote. Do not print it on a slide
verbatim. Every slide must serve this one topic. Do not widen it into a general
lesson about life, and do not reach for any other subject.`;
}

function parseJson(raw) {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.search(/[[{]/);
  return JSON.parse(t.slice(start));
}

// ─── VERSUS — two-panel comparison (the engine format) ───────────────────────

export async function writeVersusCarousel(topic) {
  if (!topic) throw new Error("writeVersusCarousel requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

${topicBrief(topic)}

FORMAT: VERSUS CAROUSEL. Five slides. Slides 1 to 4 are two-panel comparisons that
ALL belong to ONE theme. Slide 5 is a call to action. Every scene is present day.

This is the engine format. Pick one theme that WIRES TWO PILLARS TOGETHER, then
write FOUR different comparisons inside it. They must escalate: slide 1 is the most
recognizable and scroll-stopping, slide 4 is the one that stings most. Each is a
complete standalone thought, but together they build one argument about how the
first pillar feeds the second.

THE CONTRAST IS NOT OLD VERSUS NEW. It is RUNS THE SYSTEM versus RUN BY IT. Both
panels are the same modern world. The difference is who is holding the controls.

Top label = the person who owns the mechanic. Written in third person or as a plain
statement of what that person does. This panel is warm and lit by his own flame.
Bottom label = the reader's default, landing like a quiet accusation they recognize
about themselves. Written in second person. This panel is cold and lit by a screen.

Reference rhythm only, never copy the content:
"He decides what his morning is for" / "Your morning is decided by whoever posts first"
"She knows what her week actually cost" / "You find out when the card declines"
"He picked the number before he walked in" / "You picked it after they asked"

Return JSON object:
{
  "theme": "short internal name for the theme",
  "pillar": "the primary pillar: Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars this set wires together, e.g. Mind to Money",
  "sub_type": "owner_vs_owned",
  "hidden_rule": "the rule the whole set reveals, one sentence, and it must name the handoff between the two pillars",
  "pairs": [
    {
      "top_label": "the owner line, max 9 words",
      "bottom_label": "the reader's default, max 9 words",
      "top_scene": "One dense sentence: what Wick is doing in a concrete PRESENT DAY scene, 3-4 named modern physical objects, the setting. No character description, he is supplied separately.",
      "top_expression": "His facial expression in the owner panel. Be specific and emotionally precise: focused, quietly certain, unhurried, deliberate, clear eyed. Match the feeling of the scene.",
      "bottom_scene": "One dense sentence: the mirror scene in the same modern world, what Wick is doing, 3-4 named modern objects, the setting.",
      "bottom_expression": "His facial expression in the second panel. Usually the emotional cost: hollow and vacant, anxious, defeated, numb, quietly ashamed, exhausted. Match the feeling of the scene."
    }
  ],
  "closing_line": "One sentence that reframes all four at once and lands the pillar handoff.",
  "keyword": "SYSTEM|RESET|LEDGER|BLUEPRINT",
  "resource": "name of the free text resource the keyword delivers",
  "cta_scene": "One dense sentence: a closing PRESENT DAY scene for Wick that visually gathers the theme, 3-4 named modern objects.",
  "cta_expression": "His expression in the closing scene. Usually warm, resolved, quietly hopeful, or knowing."
}

EXPRESSION MATTERS. Wick's face must carry the emotion of every scene. A serious
scene gets a serious face. A hopeful one gets warmth. Never default to smiling.

Exactly 4 pairs.`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.pairs = (c.pairs ?? []).slice(0, 4).map((p) => ({
    ...p,
    top_label: stripDashes(p.top_label),
    bottom_label: stripDashes(p.bottom_label),
  }));
  c.closing_line = stripDashes(c.closing_line);
  return c;
}

// ─── ORDER — imperative two-panel (command, then turn or arithmetic) ─────────

export async function writeOrderCarousel(topic) {
  if (!topic) throw new Error("writeOrderCarousel requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2600,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

${topicBrief(topic)}

FORMAT: ORDER CAROUSEL. Five slides. Slides 1 to 4 are two-panel imperatives that
all serve the assigned topic. Slide 5 is a call to action. Every scene is present day.

Panel one gives a command. Panel two either inverts it (the turn) or does the
arithmetic on it. The ARITHMETIC variant is strongest because the number persuades
so the copy does not have to. Use arithmetic on at least two of the four.

Reference rhythm only, never copy the content:
"Check the balance every Friday." / "That's fifty two chances to catch it early."
"Name the feeling before you open the app." / "The cart empties itself."
"Add the annual number to the label." / "Nothing costs ten dollars."

All arithmetic MUST be correct. Check every multiplication.

Return JSON object:
{
  "theme": "short internal name",
  "pillar": "Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars this set wires together, e.g. Behaviour to Money",
  "sub_type": "imperative",
  "hidden_rule": "one sentence naming the handoff between the two pillars",
  "pairs": [
    {
      "top_label": "the command, max 8 words",
      "bottom_label": "the turn or the arithmetic, max 10 words",
      "top_scene": "One dense sentence: Wick performing the command in a PRESENT DAY setting, 3-4 named modern objects.",
      "top_expression": "His expression performing the command. Specific: determined, focused, quietly disciplined, resolute.",
      "bottom_scene": "One dense sentence: the payoff scene in the same modern world, 3-4 named modern objects showing accumulation or consequence.",
      "bottom_expression": "His expression at the payoff. Specific: quietly satisfied, awed, proud, steady."
    }
  ],
  "closing_line": "One sentence that reframes all four.",
  "keyword": "SYSTEM|RESET|LEDGER|BLUEPRINT",
  "resource": "name of the free text resource",
  "cta_scene": "One dense sentence: closing PRESENT DAY scene for Wick, 3-4 named modern objects.",
  "cta_expression": "His expression in the closing scene."
}

EXPRESSION MATTERS. Wick's face must carry the emotion of every scene. Never
default to smiling.

Exactly 4 pairs.`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.pairs = (c.pairs ?? []).slice(0, 4).map((p) => ({
    ...p,
    top_label: stripDashes(p.top_label),
    bottom_label: stripDashes(p.bottom_label),
  }));
  c.closing_line = stripDashes(c.closing_line);
  return c;
}

// ─── COSTUME — the cast inside the mechanic, 6 roles + CTA ───────────────────
// Was a fixed list of philosopher archetypes. It is now written per topic: the
// actors who make the mechanic run, or the modes the reader switches between.
// Wick plays every one of them, so the reader sees the whole machine as one page.

export async function writeCostume(topic) {
  if (!topic) throw new Error("writeCostume requires a topic from wick-topics.js");
  const angle = topic.lane === "MONEY_SYSTEMS"
    ? `Cast the ACTORS IN THE CHAIN. Each role is a party that profits from, designs, or absorbs the cost of this mechanic. The reader should finish the carousel understanding who is paid at every step and by whom.`
    : `Cast the MODES THE READER SWITCHES BETWEEN. Each role is a version of a person that shows up at a different point in this mechanic. One of them is the one that costs them money. Do not label which; let the reader recognize themselves.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

${topicBrief(topic)}

FORMAT: COSTUME CAROUSEL. Seven slides. Six role slides plus a call to action.
Wick wears each role in turn. Every setting is present day.

${angle}

Each role gets a short label written as a plain job or mode, not an aspiration.
"The one who sets the price" is right. "Think like a Stoic" is exactly wrong and
so is anything that names a historical figure or a philosophy.

Return JSON object:
{
  "theme": "short internal name",
  "pillar": "Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars this wires together",
  "hidden_rule": "one sentence naming what the full cast reveals",
  "roles": [
    {
      "label": "the role, max 5 words, plain and modern",
      "bold": "the single most important word in the label, for emphasis",
      "note": "One sentence on what this role actually does in the mechanic.",
      "pose": "His body position in this scene. Vary it hard across the six: crouching, leaning, seated, mid stride, turned away, reaching. Never two the same.",
      "expression": "His facial expression, matched to the role. Specific and emotionally precise.",
      "wardrobe": "modern clothing over his wax body that reads the role instantly, e.g. a courier's windbreaker, a cashier's apron, a tailored blazer",
      "setting": "One dense sentence: a PRESENT DAY setting with 3-4 named modern objects.",
      "beat": "The one small action he is caught mid performing."
    }
  ],
  "closing_line": "One sentence that lands the whole cast at once.",
  "keyword": "SYSTEM|RESET|LEDGER|BLUEPRINT",
  "resource": "name of the free text resource",
  "cta_scene": "One dense sentence: closing PRESENT DAY scene, 3-4 named modern objects.",
  "cta_expression": "His expression in the closing scene."
}

Exactly 6 roles.`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.roles = (c.roles ?? []).slice(0, 6).map((r) => ({
    ...r,
    label: stripDashes(r.label),
    note: stripDashes(r.note),
  }));
  c.closing_line = stripDashes(c.closing_line);
  return c;
}

// ─── LESSON — problem/solution carousel, 7 slides ────────────────────────────

export async function writeLesson(topic) {
  if (!topic) throw new Error("writeLesson requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2600,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

${topicBrief(topic)}

FORMAT: LESSON. A 7 slide problem/solution carousel. Slide 1 is a cover whose
headline promises a count. Slides 2 to 6 are one numbered item each with a PROBLEM
block and a SOLUTION block. Slide 7 recaps every item visually and asks for a
keyword.

The SOLUTION blocks must obey the HOW rule: name the practice and the cost of
skipping it, never the step by step method. "Rehearse the loss before it arrives"
is allowed. A protocol for doing it is not.

Cover headline rhythm only, write a new one for the assigned topic:
"5 SIGNS THE FEE WAS THE POINT"
"6 WAYS THE PRICE WAS SET BEFORE YOU ARRIVED"
"5 REASONS THE BUDGET NEVER HAD A CHANCE"

Return JSON object:
{
  "pillar": "Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars this wires together",
  "cover_headline": "ALL CAPS headline promising a count, max 8 words",
  "cover_scene": "One dense sentence: the PRESENT DAY cover scene for Wick, 3-4 named modern objects, setting.",
  "cover_expression": "His expression on the cover, matched to the headline's tone.",
  "items": [
    {
      "number": 1,
      "title": "Short item title, max 6 words",
      "problem": "2 to 3 sentences naming the trap, in second person.",
      "solution": "2 to 3 sentences naming the practice and the cost of skipping it. NEVER a method.",
      "scene": "One dense sentence: PRESENT DAY scene for Wick illustrating this item, 3-4 named modern objects.",
      "expression": "His facial expression in this scene, emotionally matched to the problem being shown. Specific: troubled, weary, uneasy, resigned, alert.",
      "signpost": "2 to 3 word label for the recap slide signpost"
    }
  ],
  "closing_line": "One sentence that reframes the whole list.",
  "keyword": "SYSTEM|RESET|LEDGER|BLUEPRINT",
  "resource": "name of the free text resource the keyword delivers"
}

EXPRESSION MATTERS. Wick's face must carry the emotion of every scene. A post
about loss gets a sombre face, not a smile.

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
      ? `A cast carousel showing every role inside the mechanic: ${(post.copy.roles ?? []).map((r) => r.label).join(", ")}.`
      : `A ${post.copy.pairs?.length ?? 4} slide comparison carousel on the theme "${post.copy.theme}". The comparisons are: ${(post.copy.pairs ?? []).map((p) => `"${p.top_label}" vs "${p.bottom_label}"`).join("; ")}.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `${BRAND_RULES}

Write the Instagram caption for this post.
${context}
The hidden rule it reveals: ${post.copy.hidden_rule ?? post.copy.closing_line ?? ""}

THE CAPTION SHAPE. Follow this structure exactly, in this order. It is taken
from the account's own best performing caption, so the rhythm is proven.

1. OPENER: "Most people think" plus the wrong conclusion the viewer just reached.
   One line. NEVER describe the image.
2. THE REVERSAL: two or three words on their own line. "It doesn't." "It isn't."
   "That is the trap." Hard stop.
3. THE PIVOT: one line naming what is actually going on.
4. THE LIST: three to five short parallel lines, one per line, same grammatical
   shape each time. This is the spine of the caption and the part people screenshot.
5. THE CALLOUT: the literal line "The hidden rule is this:" on its own, then the
   rule in one sentence underneath. The rule must name the handoff between the two
   pillars this post wires together.
6. THE COST: one or two lines on what it costs to keep missing it. Use checkable
   arithmetic here if the topic has a number. Never a made up person or study.
7. THE IMPERATIVE: a two to four word command on its own line.
8. THE QUESTION: one engagement question in second person, aimed at a reply.
9. SIGNOFF: the literal line "Light one. Pass it on. 🕯️" exactly as written.

FORMATTING IS PART OF THE FORMULA. Single blank line between every beat. Most
lines stand alone. Never write a dense paragraph. This is read on a phone at
arm's length, and white space is what makes it legible.

Voice: conversational, like texting a smart friend. Confident, occasionally
unfiltered. Never the sage register.

Under 1100 characters. Plain text only, no markdown, no hashtags, no em dashes.
Write only the caption.`,
    }],
  });
  return stripDashes(msg.content[0].text.trim()).slice(0, 2200);
}
