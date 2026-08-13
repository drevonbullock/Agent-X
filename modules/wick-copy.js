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

// Learned rules from pulled work, fetched fresh each call so a lesson applies to
// the very next post rather than the next deploy. See modules/wick-lessons.js.
export async function brandRules() {
  const { lessonsBlock } = await import("./wick-lessons.js");
  return BRAND_RULES + (await lessonsBlock("copy"));
}

const BRAND_RULES = `
WICK'S WISDOM — non-negotiable content rules.

THE FOUR PILLARS: Mind, Behaviour, Money, Systems. There is no fifth.

THE INTEGRATION RULE (the most important rule on this page): every post must
connect TWO pillars and show the wiring between them. Mind changes Behaviour.
Behaviour compounds into Money. Systems decide which behaviours are easy. Money
buys back Mind. Name the link and make the reader feel the handoff. A post that
lives inside one pillar has failed, however good the line sounds.

TONE (Dre, 2026-08-09: "more simple and motivational, less jargon, make the
viewer feel motivated to act after seeing a post"). This governs HOW every line
sounds, and it outranks any rule below about register.

WRITE LIKE YOU TALK. Everyday words only. If a person would not say it out loud
to a friend at a kitchen table, cut it. Short sentences. One idea each.

THE STANDARD TO HIT. Dre signed off on one post as "PERFECT" (LESSON, Mind|Money,
2026-08-09, cover "5 TIMES EYES IN THE ROOM COST YOU"). Aim at its ANATOMY every
time. Do NOT reuse its wording or its subject; what follows is the shape only.

  1. THE PILLAR LINK IS ONE PLAIN SENTENCE naming both sides and the direction
     of the handoff. It read: a need to look good (Mind) quietly raises what you
     pay (Money). If the link cannot be said that plainly, the topic is not ready.
  2. THE COVER PROMISES A COUNT OF SITUATIONS, not of ideas. "5 times <a moment
     the reader has lived> cost you", never "5 lessons about spending".
  3. EVERY ITEM IS A MOMENT, NOT A CONCEPT. The table. The server. The group
     round. A reader should be able to picture the room. An item that names a
     behaviour in the abstract has failed.
  4. ONE ITEM CARRIES REAL ARITHMETIC on a small everyday number, and it must
     actually multiply out. A few dollars a meal becoming a few hundred a year is
     the shape: small enough to be believable, big enough to sting.
  5. THE LAST ITEM RELEASES THE READER. After four items of cost, the fifth
     removes the pressure: nobody was keeping score anyway. Ending on the fifth
     cost leaves them beaten; ending on the release leaves them free to choose.
  6. THE CLOSE IS UNDER 8 WORDS AND REASSIGNS AGENCY. Two short sentences that
     hand the decision back to the reader, never a summary of the list.
  7. EVERY WORD IS ONE A CHILD KNOWS. Table, server, room, money, tip.

STOP WHEN THE POINT LANDS (Dre, 2026-08-09, on "You did not choose to spend it.
The room chose for you." -> "shorter, that is good enough").

TWO SHORT SENTENCES IS THE CEILING for any reveal line, closing line or label.
One is often better. Once the point has landed, STOP. Do not add a sentence that
restates it, extends it, or explains why it matters. That third beat is the
writer reassuring himself, and it is where the reader leaves.

  ENOUGH: "You did not choose to spend it. The room chose for you."
  TOO MUCH: the same two lines plus "And the room does not pay your bills."
            The point already landed. The extra line is a lecture.

Test every line: delete the last sentence. If the meaning survives, it was
padding. Ship the shorter one.

No sentence over about 10 words. No commas holding two ideas together, use a
full stop or cut one idea. No "and" joining two thoughts at the end.

USE THE SMALLEST WORD THAT WORKS (Dre, 2026-08-09: "words like invoice is too
big, make it as simple as if the viewers were 3 yr olds"). This is the FIRST
test every line must pass.

Write at the level of a children's book. One and two syllable words. If a
ten year old would stop and wonder what a word means, it is the wrong word.
Read every line out loud: if it sounds like something written rather than
something said, rewrite it.

SWAP THE BIG WORD FOR THE SMALL ONE, always:
  invoice -> bill          purchase -> buy         acquire / obtain -> get
  expense / expenditure -> what you spend          remainder -> what is left
  accumulate -> add up / pile up                   diminish -> shrink / get smaller
  obligation -> a promise you made                 compensation -> pay
  sufficient -> enough     additional -> more      approximately -> about
  require -> need          receive -> get          provide -> give
  maintain -> keep         demonstrate / indicate -> show
  assist -> help           attempt -> try          commence / initiate -> start
  terminate -> end         subsequent -> next      prior -> before
  reside -> live           consume -> use up       allocate -> put aside
  sustain -> keep going    substantial -> big      minimal -> small
  utilise -> use           portion -> part         quantity -> how much
  transaction -> what you paid                     accumulated -> built up

Concrete everyday nouns beat abstract ones every time: money, bill, rent, phone,
car, job, food, card, cash, hours. A reader should SEE the thing.

Good: "You paid for the whole night and nobody noticed."
Bad:  "Your bank account got the invoice." (invoice)
Good: "The money leaves before you feel it."
Bad:  "The outflow occurs prior to the sensation." (outflow, prior, sensation)

NEVER NAME THE PSYCHOLOGY. This page is about behaviour, so the textbook term is
always the nearest word and it is always the wrong one. It makes a reader feel
lectured instead of seen, and a named bias sounds like something happening to
other people. BANNED: status quo bias, loss aversion, sunk cost, sunk cost
fallacy, anchoring, anchoring effect, cognitive dissonance, confirmation bias,
present bias, hyperbolic discounting, endowment effect, social proof, scarcity
principle, recency bias, survivorship bias, availability heuristic, framing
effect, opportunity cost, diminishing returns, marginal utility, behavioural
economics, heuristic, cognitive load, dopamine loop, reward pathway.
Describe what it FEELS LIKE from the inside instead. Not "status quo bias sells
you comfort" but "staying put feels free until the bill shows up". Not "loss
aversion" but "losing a hundred stings more than winning a hundred feels good".
The reader should recognise themselves, not learn a term.

BANNED WORDS, use the plain version: leverage, optimize, streamline, robust,
seamless, holistic, facilitate, elevate, empower, compounding (as a noun),
incentive structure, mechanism (in the copy itself, it stays a thinking tool
only), asymmetry, arbitrage, allocate, deploy, capital efficiency, systematize,
paradigm, ecosystem, friction (as jargon), utilise, mitigate, optimise.
Say "use", "fix", "simplify", "strong", "smooth", "help", "lift", "grows",
"who profits", "the setup", "money", "put in", "makes it easy or hard".

LEAVE THEM ABLE, NOT JUST INFORMED. The reader should finish a post feeling
"I can see it now, and I can do something about it" rather than "well, that is
grim." Name the trap honestly, then leave the door open. Every post lands on the
reader's own agency: the thing they already control, however small.

THE FEELING TO AIM FOR: a friend who believes in you telling you the truth.
Warm, direct, certain, on your side. Not a lecture. Not a warning label.

MOTIVATION IS NOT HYPE. No exclamation marks, no "you got this", no "crush it",
no "level up", no rah-rah. The lift comes from CLARITY, not volume: showing
someone the rule that was quietly running their life IS the motivating act,
because a named rule is a rule you can finally do something about.

This does NOT license teaching the HOW. Point at the door, do not walk them
through it. "You can decide this one on purpose now" is motivating and free.
"Here is the five step framework" is the paid product.

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
- No hashtags in body copy.

THE CTA IS SHARES AND REPOSTS. Nothing else, on any format, until the account
passes 1,000 followers.

Never promise a resource, a guide, a download, a DM, a link, a keyword reply or a
product. Nothing exists to deliver yet, and an unkept promise costs more than a
missed follow. Never ask for a follow either: below a thousand followers the only
thing worth buying with a slot is distribution, and a share puts the post in
somebody's DMs where a follow request never goes.

Every final slide does exactly two things:
1. Names ONE person to send it to, by a situation the reader recognizes instantly.
   "the friend who got a raise and still feels broke", never "someone who needs this".
2. Invites a repost if it landed.

Write send_to for the first. The second is fixed copy added at composite time,
so do not write it yourself.

STAGE THE SENTENCE. This is the most important rule in this document after the
philosophy ban, and it is the one that has been failing.

The image is generated from your scene text and nothing else. The label is added
on top afterwards. So the scene must STAGE THE WHOLE SENTENCE as a picture, the
way a film still stages a line of dialogue. A reader with the text covered should
be able to guess the line.

Work through the label word by word and put every part of it on screen:

1. WHO ELSE IS IN IT. If the line implies someone doing something to him, they
   are IN THE FRAME doing it. "Call a rich man broke and he'll laugh" is not a
   man alone; it is people jabbing a finger at him holding up a sign while he
   laughs. If someone doubts him, they are visibly doubting. If nobody else is
   implied, he is alone on purpose.
2. THE ACTION IN THE LINE. The literal verb, happening. Not a related mood.
3. THE REACTION. If the line names how he responds, his face and body do exactly
   that. "He'll laugh" means he is laughing. Not smiling, not content. Laughing.
4. THE PROOF OBJECT. The one thing in frame that makes the claim checkable: the
   unchanged lease, the oxygen mask, the untouched savings jar, the barbell.
5. HIS BODY POSITION, stated plainly, because it is the only pose information the
   image gets. Seated, crouched, mid-stride, turned away, slumped, braced.

Two panels that pair must be a MATCHED PAIR: same framing logic, opposite
outcome, so the eye reads the difference instantly. If the top is a wide shot of
him at a table, the bottom is a wide shot of him at a table.

Vary the setting and body position across the four slides. Four seated desk shots
in a row is a dead carousel.

Worked example of the standard, do not reuse the content:
  LABEL: "Call a saver cheap, he'll laugh."
  WEAK SCENE: "he stands in a shop looking at a price tag" (generic, no accuser,
  no reaction, nothing to read)
  RIGHT SCENE: "two friends jab their fingers at him laughing and holding up a
  worn coupon like a trophy while he leans back on the bench genuinely laughing
  with them, a full glass savings jar on the table beside him, a supermarket car
  park at dusk"
`;

function stripDashes(s) {
  return String(s ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
}

// The topic is handed to the model as a fixed assignment. It writes the carousel
// FOR this subject and never chooses its own, which is what caused drift.
function topicBrief(topic) {
  // Voice references Dre set per lane. These shape CADENCE and STANCE, never
  // content: never name them, never quote them, never imitate a catchphrase.
  const lane = {
    HYBRID: `This is a HYBRID post, the page's main lane. The behavioural mechanic is the hook and the money consequence is the payoff. Both halves must be present and the handoff between them must be explicit.

VOICE: the plain-spoken certainty of Jim Rohn and Earl Nightingale, with money talked about as simply as Buffett explains it to a beginner. Warm about the person, honest about the number, and always leaving them something they can act on.`,

    MIND_BEHAVIOUR: `This is a MIND into BEHAVIOUR post. Show how the thought pattern produces the action. Money may appear at the edge but is not the subject.

VOICE: Jim Rohn, Earl Nightingale, Tony Robbins, Florence Scovel Shinn. Short declaratives in everyday words. Concrete pictures, never abstraction. Speak to ONE person like you believe in them. Certain, encouraging, never preachy and never cheerleading.`,

    MONEY_SYSTEMS: `This is a MONEY into SYSTEMS post. Show how the machine is built, who designed it that way, and who it pays. Explain the mechanism, never give advice.

VOICE: Hormozi, Dalio, Buffett, Kiyosaki, but explained the way you would to a friend who has never read a finance book. Plain nouns, simple arithmetic, zero hype. Name who profits and let the reader draw the conclusion, then leave them feeling they can spot it next time. Never tell anyone what to buy.`,
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

// Jargon the model reaches for because it is the nearest word. A prompt rule
// alone has failed on this page before (the philosophy ban needed the topic
// registry to actually hold), so this checks the OUTPUT rather than trusting the
// instruction. Warn-only: a loud log beats silently shipping "status quo bias"
// onto a slide, and beats throwing away a paid generation.
const JARGON = /\b(status quo bias|loss aversion|sunk cost(?: fallacy)?|anchoring(?: effect)?|cognitive (?:dissonance|load)|confirmation bias|present bias|hyperbolic discounting|endowment effect|social proof|scarcity principle|recency bias|survivorship bias|availability heuristic|framing effect|opportunity cost|diminishing returns|marginal utility|behavioou?ral economics|heuristics?|dopamine (?:loop|hit)|reward pathway|leverage|optimi[sz]e|streamline|seamless|holistic|empower|synerg|paradigm|arbitrage|systemati[sz]e|invoice|expenditure|obligation|compensation|remainder|sufficient|additional|approximately|subsequent|terminate|commence|initiate|reside|allocate|substantial|utilis|transaction|accumulate|diminish|acquire|obtain|demonstrate|outflow|inflow|monetary|fiscal|liquidity|attain|procure)\b/i;

export function findJargon(obj) {
  const hits = new Set();
  const walk = (v) => {
    if (typeof v === "string") { const m = v.match(JARGON); if (m) hits.add(m[0].toLowerCase()); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(obj);
  return [...hits];
}

function parseJson(raw) {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.search(/[[{]/);
  const parsed = JSON.parse(t.slice(start));
  const jargon = findJargon(parsed);
  if (jargon.length) {
    console.warn(`[WickCopy] ⚠️ JARGON in generated copy: ${jargon.join(", ")} — the tone rule was ignored. Post still ships; tighten BRAND_RULES if this repeats.`);
  }
  return parsed;
}

// ─── VERSUS — two-panel comparison (the engine format) ───────────────────────

export async function writeVersusCarousel(topic) {
  if (!topic) throw new Error("writeVersusCarousel requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `${await brandRules()}

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
      "top_label": "the owner line, max 7 words. Punchier is better. Reference rhythm: 'You talk too much'. Short enough to read in one glance at thumbnail size.",
      "bottom_label": "the reader's default, max 7 words. Reference rhythm: 'Start a Podcast.' Land it hard and stop.",
      "top_scene": "One dense sentence that SHOWS the top label. Name his body position, the single action that proves the claim, 3-4 named modern objects, and the setting. Present day. No character description, he is supplied separately.",
      "top_expression": "His facial expression in the owner panel. Be specific and emotionally precise: focused, quietly certain, unhurried, deliberate, clear eyed. Match the feeling of the scene.",
      "bottom_scene": "One dense sentence that SHOWS the bottom label. Name his body position, the action that proves it, 3-4 named modern objects, the setting. Must visually rhyme with the top scene while showing the opposite outcome.",
      "bottom_expression": "His facial expression in the second panel. Usually the emotional cost: hollow and vacant, anxious, defeated, numb, quietly ashamed, exhausted. Match the feeling of the scene."
    }
  ],
  "closing_line": "ONE short sentence, max 10 words, landing all four at once. Stop when it lands.",
  "send_to": "Who to send this post to. One line, max 12 words, naming a RECOGNIZABLE SITUATION, not a personality trait. 'the friend who got a raise and still feels broke' is right. 'someone who needs this' is wrong.",
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

// ─── ORDER — one scene per slide, one repeating sentence ────────────────────
// Dre supplied the reference: a SINGLE full-bleed image per slide with one line
// over it, and all four lines run the SAME grammatical shape with one word
// swapped. "Call a rich man broke, he'll laugh." then "Call a genius stupid,
// he'll laugh." The repetition IS the format. Slide 5 breaks the pattern and
// names the rule.
//
// This was previously built as a stacked two-panel comparison, which is
// structurally VERSUS, which is exactly why the two formats looked identical.

export async function writeOrderCarousel(topic) {
  if (!topic) throw new Error("writeOrderCarousel requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2600,
    messages: [{
      role: "user",
      content: `${await brandRules()}

${topicBrief(topic)}

FORMAT: ORDER CAROUSEL. Five slides. Slides 1 to 4 are ONE scene each with ONE
line of copy over the art. Slide 5 breaks the pattern and names the rule.

THE FORMAT IS REPETITION. All four lines share the SAME grammatical shape with a
single element swapped. Read together they become a drumbeat, and the swap is
what makes the fourth one land. This is not four different sentences about a
theme; it is one sentence said four times about four things.

Reference rhythm ONLY, never reuse this content:
"Call a rich man broke, he'll laugh."
"Call a genius stupid, he'll laugh."
"Call a strong man weak, he'll laugh."
Same shape every time. Only the pair of opposites changes.

Build your own shape for the assigned topic and hold it exactly across all four.
Escalate: line 1 is the most recognizable, line 4 is the one that stings.

If your shape carries a number, every number must actually multiply out. Check it.

Return JSON object:
{
  "theme": "short internal name",
  "pillar": "Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars this set wires together",
  "sub_type": "repeating_formula",
  "formula": "the sentence shape you are holding, with the swapped part marked, for internal reference only",
  "hidden_rule": "one sentence naming the handoff between the two pillars",
  "lines": [
    {
      "label": "the full line, max 9 words, following the shape exactly. This is the only text on the slide.",
      "scene": "One dense sentence SHOWING this line. Name his body position, the single action that proves it, 3-4 named modern objects, the setting. Present day. He is supplied separately, never describe him.",
      "expression": "His facial expression, emotionally precise and matched to the line."
    }
  ],
  "reveal_line": "Slide 5. The rule the four lines were building to. ONE sentence, max 10 words.",
  "closing_line": "ONE short sentence under the reveal, max 8 words. It renders directly beneath the reveal line, so the two together must read as the whole point and nothing more. Never a third idea.",
  "send_to": "Who to send this post to. One line, max 12 words, naming a RECOGNIZABLE SITUATION, not a personality trait.",
  "cta_scene": "One dense sentence: closing PRESENT DAY scene, 3-4 named modern objects.",
  "cta_expression": "His expression in the closing scene."
}

EXPRESSION MATTERS. Wick's face carries the line. Never default to smiling.

Exactly 4 lines.`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.lines = (c.lines ?? []).slice(0, 4).map((l) => ({ ...l, label: stripDashes(l.label) }));
  c.reveal_line = stripDashes(c.reveal_line);
  c.closing_line = stripDashes(c.closing_line);
  return c;
}

// ─── PARABLE — a three beat story in speech bubbles ─────────────────────────
// MIND_BEHAVIOUR ONLY. Dre: "the parable part should only be for mind and
// behavior, it should not be about money and systems." A parable earns its
// ending by being about how a person thinks and acts. The same shape aimed at
// interchange fees would be a lecture wearing a story's clothes.

export async function writeParable(topic) {
  if (!topic) throw new Error("writeParable requires a topic from wick-topics.js");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2200,
    messages: [{
      role: "user",
      content: `${await brandRules()}

${topicBrief(topic)}

FORMAT: PARABLE. Five slides. A tiny story told in SPEECH BUBBLES, then the
application, then the ask. Everything present day.

Slide 1: something in the world asks Wick a simple question. A bubble.
Slide 2: Wick gives the obvious, slightly wrong answer. A bubble. Make it human
         and a little sheepish, the answer anyone would give.
Slide 3: the thing corrects him in one line that reframes everything. A bubble.
         This is the whole post. It must be short enough to remember and true
         enough to repeat.
Slide 4: the application, stated flat over the art. No bubble. Second person.
Slide 5: the ask.

Reference rhythm ONLY, never reuse this content:
  "Which way does a tree fall?" / "Uhh... down?" / "The tree falls the way it
  leans." / "Be careful which way you lean."

THE RULES OF THIS FORMAT:
- The speaker is an ORDINARY PRESENT DAY THING that could plausibly know the
  answer: a worn pair of running shoes, a kettle, a door, a bus, a stack of
  unopened mail, a gym bench. Give it a face and let it talk. It is never a
  historical figure, never a sage, never an animal that lectures.
- Bubbles are SHORT. Slide 1 under 8 words, slide 2 under 5, slide 3 under 11.
  If it needs a comma to work it is too long.
- The turn must be a genuine reframe, not a restatement of the question.
- No moral at the end. Slide 4 states what to do and stops.

Return JSON object:
{
  "theme": "short internal name",
  "pillar": "Mind|Behaviour",
  "pillar_link": "Mind to Behaviour, or Behaviour to Mind",
  "sub_type": "parable",
  "speaker": "the ordinary present day thing that speaks, 2-4 words",
  "hidden_rule": "one sentence, the rule the story reveals",
  "beats": [
    {
      "bubble": "the line spoken on this slide",
      "side": "left or right, alternate across the three beats",
      "scene": "One dense sentence SHOWING this beat. Name Wick's body position, the speaker object clearly visible with a face, 3-4 named modern objects, the setting. He is supplied separately, never describe him.",
      "expression": "Wick's facial expression on this beat."
    }
  ],
  "application": "Slide 4. What to do, second person, max 9 words.",
  "application_scene": "One dense sentence: the scene under the application line.",
  "application_expression": "His expression on slide 4.",
  "closing_line": "ONE short sentence under the ask, max 8 words.",
  "send_to": "Who to send this to. Max 12 words, a recognizable situation.",
  "cta_scene": "One dense sentence: closing PRESENT DAY scene, 3-4 named modern objects.",
  "cta_expression": "His expression in the closing scene."
}

Exactly 3 beats.`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.beats = (c.beats ?? []).slice(0, 3).map((b, i) => ({
    ...b,
    bubble: stripDashes(b.bubble),
    side: b.side === "right" || i === 1 ? "right" : "left",
  }));
  c.application = stripDashes(c.application);
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
      content: `${await brandRules()}

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
      "wardrobe": "ONE small accessory that reads the role instantly and sits ON a candle without giving it a human body. A hard hat, a headset, a lanyard, a visor, a name badge, a tool belt slung round the wax, a scarf, a tiny apron. NEVER a shirt, suit, trousers, shoes or anything implying a torso or legs.",
      "setting": "One dense sentence: a PRESENT DAY setting with 3-4 named modern objects.",
      "beat": "The one small action he is caught mid performing."
    }
  ],
  "closing_line": "ONE short sentence, max 10 words, landing the whole cast at once.",
  "send_to": "Who to send this post to. One line, max 12 words, naming a RECOGNIZABLE SITUATION, not a personality trait. 'the friend who got a raise and still feels broke' is right. 'someone who needs this' is wrong.",
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
      content: `${await brandRules()}

${topicBrief(topic)}

FORMAT: LESSON. A 7 slide problem/solution carousel. Slide 1 is a cover whose
headline promises a count. Slides 2 to 6 are one numbered item each with a PROBLEM
block and a SOLUTION block. Slide 7 recaps every item visually and asks for a
keyword.

LENGTH IS THE POINT. Every problem and solution is ONE sentence, 12 words or
fewer. Two short lines set big beat six small ones nobody finishes: a reader
decides whether to swipe in about two seconds, and a paragraph loses them.
If a sentence needs a comma to survive, it is too long. Cut it, do not shrink it.

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
      "problem": "ONE short sentence naming the trap, second person. MAX 12 WORDS. This is read in under two seconds on a phone, so cut every clause that is not the trap itself.",
      "solution": "ONE short sentence naming the practice and what skipping it costs. MAX 12 WORDS. NEVER a method.",
      "scene": "One dense sentence SHOWING this item's problem. Name his body position, the action that proves it, 3-4 named modern objects. Present day.",
      "expression": "His facial expression in this scene, emotionally matched to the problem being shown. Specific: troubled, weary, uneasy, resigned, alert.",
      "signpost": "2 to 3 word label for the recap slide signpost"
    }
  ],
  "closing_line": "ONE short sentence, max 10 words, that lands the point and stops. No second thought bolted on.",
  "send_to": "Who to send this post to. One line, max 12 words, naming a RECOGNIZABLE SITUATION, not a personality trait. 'the friend who splits every bill and never says anything' is right. 'someone who needs this' is wrong."
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
  // Reels have their own shapes. Without these branches STEPS and TIERS fell
  // through to the comparison branch, which reads fields reel copy does not
  // have, and produced a caption written from nothing.
  const context = post.format === "STEPS"
    ? `A reel titled "${post.copy.title}" laying out ${post.copy.steps?.length ?? 5} steps in order: ${(post.copy.steps ?? []).map((s, i) => `${i + 1}. ${s.rule} (${s.why})`).join(" ")} It closes on: "${post.copy.kicker ?? ""}".`
    : post.format === "TIERS"
    ? `A reel titled "${(post.copy.title_lines ?? []).join(" ")}" showing a nine step ladder: ${(post.copy.tiers ?? []).map((t) => `${t.label} at ${t.stat}`).join(", ")}. It closes on: "${post.copy.kicker ?? ""}".`
    : post.format === "LESSON"
    ? `A carousel titled "${post.copy.cover_headline}" covering: ${(post.copy.items?.map((i) => i.title) ?? post.copy.labels?.slice(1, 6) ?? []).join(", ")}.`
    : post.format === "COSTUME"
      ? `A cast carousel showing every role inside the mechanic: ${(post.copy.roles?.map((r) => r.label) ?? post.copy.labels ?? []).join(", ")}.`
      : post.copy.pairs?.length
        ? `A ${post.copy.pairs.length} slide comparison carousel on the theme "${post.copy.theme}". The comparisons are: ${post.copy.pairs.map((p) => `"${p.top_label}" vs "${p.bottom_label}"`).join("; ")}.`
        : post.copy.lines?.length
          ? `A carousel on "${post.copy.theme}" built from one repeating line: ${post.copy.lines.map((l) => `"${l.label}"`).join("; ")}. It ends on: "${post.copy.reveal_line ?? ""}".`
          : post.copy.beats?.length
            ? `A parable told by ${post.copy.speaker ?? "an everyday object"}: ${post.copy.beats.map((b) => `"${b.bubble}"`).join(" -> ")}. It lands on: "${post.copy.application ?? ""}".`
            : `A carousel on the theme "${post.copy.theme}". The slides read: ${(post.copy.labels ?? []).map((l) => `"${l}"`).join("; ")}${post.copy.counters?.length ? `, answered by: ${post.copy.counters.map((l) => `"${l}"`).join("; ")}` : ""}.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `${await brandRules()}

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
   Never ask for a keyword, a DM or a download. The ask is a reply or a share.
9. SIGNOFF: the literal line "Light one. Pass it on. 🕯️" exactly as written.

FORMATTING IS PART OF THE FORMULA. Single blank line between every beat. Most
lines stand alone. Never write a dense paragraph. This is read on a phone at
arm's length, and white space is what makes it legible.

IF THIS IS A REEL (format STEPS or TIERS): the viewer has already watched the
thing, so the caption must NOT restate the slides. Skip the parallel list beat
entirely and go opener, reversal, the hidden rule, the cost, question, signoff.
Keep it under 600 characters. A reel caption competes with the video for
attention and loses, so it earns its place by adding the part the video could
not fit.

Voice: conversational, like texting a smart friend. Confident, occasionally
unfiltered. Never the sage register.

Under 1100 characters. Plain text only, no markdown, no hashtags, no em dashes.
Write only the caption.`,
    }],
  });
  return stripDashes(msg.content[0].text.trim()).slice(0, 2200);
}

// ─── COPY WRITTEN TO EXISTING ART ───────────────────────────────────────────
// Normally copy is written first and art is generated to match. When the art
// already exists the pipeline inverts: the label is chosen to describe what is
// genuinely in the frame. Same rule from the other direction, and it means paid
// art gets used instead of re-bought.
//
// `slots` is [{ role, shows }]. Returns labels in the same order.
export async function writeToScenes(topic, format, slots, { rules = "", fields = "" } = {}) {
  const list = slots.map((s, i) => `${i + 1}. [${s.role}] ${s.shows}`).join("\n");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `${await brandRules()}

${topicBrief(topic)}

You are writing a ${format} carousel for art that ALREADY EXISTS. You cannot
change the pictures. Write the line that each picture is already telling.

THE FRAMES, in order:
${list}

RULES:
- Each label must describe what is ACTUALLY IN ITS FRAME. If the frame shows him
  in bed with a phone, the line is about being in bed with a phone. Never write a
  line the picture does not support.
- Together the labels must still build ONE argument about the assigned topic, and
  still wire the two pillars.
- Keep the brand's punch. Max 7 words per label unless told otherwise.
${rules}

Return JSON with EVERY key below present. Do not omit any of them:
{
  "theme": "short internal name",
  "pillar": "Money|Systems|Mind|Behaviour",
  "pillar_link": "the two pillars wired",
  "hidden_rule": "one sentence naming the handoff",
  "labels": ["one per frame, in the same order, ${slots.length} entries"],
${fields ? fields + "\n" : ""}  "closing_line": "ONE short sentence, max 10 words. Land it and stop.",
  "send_to": "who to send it to, max 12 words, a recognizable situation"
}`,
    }],
  });
  const c = parseJson(msg.content[0].text);
  c.labels = (c.labels ?? []).map(stripDashes);
  c.closing_line = stripDashes(c.closing_line);
  return c;
}

// ─── REEL COPY ──────────────────────────────────────────────────────────────
// Reels are locked to the 10% lanes. Dre: "the reels should never be the 80."

export async function writeStepsReel(topic) {
  if (!topic) throw new Error("writeStepsReel requires a topic");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1600,
    messages: [{ role: "user", content: `${await brandRules()}

${topicBrief(topic)}

FORMAT: STEPS REEL. A single 9:16 cover: a hard title, then FIVE numbered steps,
then a closing line.

Each step is a short imperative followed by the reason it works. The reason is
the part people screenshot, so it must be a mechanism, not a platitude.

These are STEPS, an order of operations someone could actually follow, not a list
of maxims. Step 1 must be the thing you do first and step 5 the thing you do last.
If the order could be shuffled without loss, it is a list of rules and it is wrong.

Reference rhythm ONLY, never reuse this content:
  "Name the feeling first, a labelled urge loses most of its pull."
  "Write the annual number down, twelve dollars a month hides eight hundred a year."

The title must NOT reference antiquity, tradition or ancient rules. This page is
present day.

Return JSON:
{
  "title": "ALL CAPS, max 6 words, the promise of the sequence",
  "pillar": "Mind|Behaviour|Money|Systems",
  "steps": [
    { "rule": "the imperative, max 6 words, no trailing punctuation",
      "why": "the mechanism, max 12 words, starts lowercase, ends with a full stop" }
  ],
  "kicker": "One line under the list, max 8 words, the whole idea compressed",
  "thumb_scene": "One dense sentence for a THUMBNAIL: Wick alone on a plain white studio background, doing the single action this reel is about, holding or beside 1-2 simple objects. No room, no set, no scenery.",
  "send_to": "who to send it to, max 12 words, a recognizable situation"
}

Exactly 5 steps, in the order they must be done.` }],
  });
  const c = parseJson(msg.content[0].text);
  c.title = stripDashes(c.title).toUpperCase();
  c.steps = (c.steps ?? []).slice(0, 5).map((r) => ({ rule: stripDashes(r.rule), why: stripDashes(r.why) }));
  c.kicker = stripDashes(c.kicker);
  return c;
}

export async function writeTiersReel(topic) {
  if (!topic) throw new Error("writeTiersReel requires a topic");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1600,
    messages: [{ role: "user", content: `${await brandRules()}

${topicBrief(topic)}

FORMAT: TIER REEL. A single 9:16 cover: a two line title, then NINE tiers laid
out in a 3x3 grid, then a closing line.

The nine tiers are a LADDER. Each has a one word rank and a number showing what
it took to get there, and they escalate from the weakest to the strongest. The
character's expression escalates with them, so tier 1 should read as soft and
tier 9 as unshakeable.

The numbers must be a believable progression a person could actually count
(times done, weeks held, months tracked). They are a scale, not a claim about
anyone's results, so never present them as research.

Reference rhythm ONLY, never reuse this content:
  SOFT 5 times / WIMPY 15 times / SHAKY 30 times ... ICEPROOF 320 times

Return JSON:
{
  "title_lines": ["line one, max 5 words", "line two, max 5 words"],
  "pillar": "Mind|Behaviour|Money|Systems",
  "tiers": [
    { "label": "ONE WORD, ALL CAPS", "stat": "the count, e.g. 5 times or 3 weeks" }
  ],
  "kicker": "One line under the grid, max 8 words",
  "thumb_scene": "One dense sentence for a THUMBNAIL: Wick alone on a plain white studio background, doing the single action this reel is about, holding or beside 1-2 simple objects. No room, no set, no scenery.",
  "send_to": "who to send it to, max 12 words, a recognizable situation"
}

Exactly 9 tiers, weakest first.` }],
  });
  const c = parseJson(msg.content[0].text);
  c.tiers = (c.tiers ?? []).slice(0, 9).map((t) => ({
    label: stripDashes(t.label).toUpperCase(), stat: stripDashes(t.stat),
  }));
  c.kicker = stripDashes(c.kicker);
  return c;
}

// ─── RECEIPT REEL ────────────────────────────────────────────────────────────
// Dre, 2026-08-13: "the tiers has to go and be replaced with something more eye
// popping visually and more valuable."
//
// TIERS was nine small circular badges with 29px labels: visually quiet and it
// carried almost no information. THE RECEIPT is the opposite. It itemises what a
// habit actually costs across a year on something shaped like a till receipt,
// which reads instantly at thumb size and is the kind of thing people screenshot.
//
// It is also the format closest to the post Dre called PERFECT, whose strongest
// beat was arithmetic on a small everyday number that anyone can check.
export async function writeReceiptReel(topic) {
  if (!topic) throw new Error("writeReceiptReel requires a topic");
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1600,
    messages: [{ role: "user", content: `${await brandRules()}

FORMAT: RECEIPT REEL. A single 9:16 frame built like a till receipt that prices a
habit honestly over one year.

THE ARITHMETIC IS THE WHOLE POINT AND IT MUST BE CORRECT.
Pick ONE small everyday amount and multiply it out over a year. Every number must
actually multiply: if a line says 4.50 and the frequency says 3 a week, the year
figure is 4.50 x 3 x 52 = 702. Do the multiplication and check it. A number that
does not add up destroys the whole post, so keep the sums easy.
Amounts are believable and ordinary. Never invent a statistic, a study or a
company. This is the reader's own spending, not research.

TOPIC: ${topic.title}
LANE: ${topic.lane}   HIDDEN RULE: ${topic.hook ?? ""}

Respond with valid JSON only:
{
  "pillar": "Mind|Money style pillar pair",
  "pillar_link": "ONE plain sentence naming both pillars and the direction of the handoff.",
  "title": "The receipt header. ALL CAPS, max 5 words, naming what is being priced. 'THE REAL PRICE OF BEING NICE' is the shape.",
  "subtitle": "3 to 5 words under the header, like a shop name. Plain and dry.",
  "items": [
    { "label": "what the line is, max 4 words, everyday words", "detail": "the frequency, like '3 x week' or 'every payday'", "amount": "the single-occurrence amount as a plain number with 2 decimals, no currency symbol" }
  ],
  "total_label": "ALL CAPS label for the total line, max 3 words. 'ONE YEAR' is the shape.",
  "total": "the year total as a plain number, no symbol, no decimals. It MUST equal the items multiplied out.",
  "punch": "ONE short sentence under the total, max 10 words, that reframes the number. Never a scolding.",
  "kicker": "ALL CAPS closing line, max 8 words, handing the reader back the decision.",
  "send_to": "who to send it to, max 12 words, a recognisable situation",
  "thumb_scene": "One dense sentence staging Wick holding or reading a long paper receipt, present day, 3-4 named modern objects."
}

Exactly 5 items. Every amount small and ordinary. The total must be the honest sum.` }],
  });
  const c = parseJson(msg.content[0].text);
  c.items = (c.items ?? []).slice(0, 5);
  return c;
}
