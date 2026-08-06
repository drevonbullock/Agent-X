import "dotenv/config";

// ─── AGENT X OPINION ENGINE ──────────────────────────────────────────────────
// Blunt, binary claims stated as fact. Sharp opinion, but always from inside a
// domain Dre actually operates in.
//
// REWRITTEN 2026-08-06 against 30 days of real Threads data. The previous
// version optimised for the wrong outcome and the numbers proved it:
//
//   95 posts | 3,113 views | 26 likes | 70 replies | 0 reposts | 0 quotes | +2 followers
//
// Two findings drove this rewrite:
//
// 1. THE POSTS THAT TRAVELLED WERE OFF-NICHE. The two highest-reach posts
//    (1,032 and 497 views, about half the month's total) came from the old
//    "AI FILM > REAL FILM" lane. They landed in a film community, and the
//    replies were domain experts issuing corrections. One reply read "This is
//    a bot account." A film person who corrects you about Kubrick will never
//    follow an AI automation account. That lane is DELETED, and the standing
//    rule below exists so nothing like it comes back.
//
// 2. ZERO REPOSTS IS THE WHOLE PROBLEM. Reposts and quotes are how a post
//    reaches non-followers, and follows come from non-followers. The old voice
//    said "attack the group's identity" and listed goal reactions as "argue
//    back, screenshot it angry". That reliably produces replies and reliably
//    produces nothing else: 70 replies against 26 likes is people arguing, not
//    an audience. The target metric is now REPOSTS, not comment count.
//
// FREE CONTENT = WHAT / WHY / WHEN only. HOW stays paid.

// HARD RULE (Dre, 2026-07-13): posts NEVER mention his personal life, job
// history, backstory, or how many systems he has. Topics argue themselves.
// RECEIPT vs SHARP is an internal ratio tag only — receipts are claims grounded
// in the reality of shipped work, argued WITHOUT autobiography.
export const RECEIPTS = [];

// ─── THE STANDING RULE ───────────────────────────────────────────────────────
// Every lane below sits inside work Dre actually does: building AI automation
// for small and service businesses. That is the only ground he can make a claim
// from without inviting a correction from someone who knows better.
//
// A lane belongs here only if the answer to "who would argue with this, and do
// they know more than Dre?" is "the reader, and no". Film history, academia,
// medicine, law, aviation and anything else he does not operate in are OUT, no
// matter how much reach they pull, because the reach arrives as corrections.
//
// tag: RECEIPT = grounded in shipped work. SHARP = a harder edge, same ground.
export const LANES = [
  {
    lane: "AUTOMATION REALITY",   // the core niche: the work he actually does
    topics: [
      { claim: "Most businesses automate the flashy thing first. The money is in the boring thing they do 40 times a day.", tag: "RECEIPT", bait: "the boring thing is boring because it already works" },
      { claim: "A lead that waits 5 hours is not a lead anymore. It's a name in a spreadsheet.", tag: "RECEIPT", bait: "some industries genuinely do not move that fast" },
      { claim: "An AI tool waits for you to open it. An AI system runs while you sleep. Most people bought the tool and called it a system.", tag: "SHARP", bait: "the system also breaks while you sleep" },
      { claim: "Hiring before you fix intake just means more chaos, faster.", tag: "RECEIPT", bait: "sometimes you genuinely are short-handed" },
      { claim: "The bottleneck is almost never the thing owners think it is. It's usually the handoff nobody owns.", tag: "RECEIPT", bait: "or it's just underpricing" },
    ],
  },
  {
    lane: "AI AT WORK",           // adjacent, still his ground: AI doing real tasks
    topics: [
      { claim: "AI is already good enough for most repetitive desk work. The holdup is trust, not capability.", tag: "SHARP", bait: "then why does every rollout still need cleanup?" },
      { claim: "You don't lose your job to AI. You lose it to the person who learned it first.", tag: "RECEIPT", bait: "until the company replaces that person too" },
      { claim: "Every AI rollout that failed, failed at the handoff, not the model.", tag: "RECEIPT", bait: "plenty fail because the model was wrong for the job" },
    ],
  },
  {
    lane: "SHIPPED > THEORISED",  // he is self-taught and ships — genuine standing
    topics: [
      { claim: "Screenshots are not systems. If there's no live link, it isn't built.", tag: "SHARP", bait: "not everything worth building is public" },
      { claim: "90 days of building in public teaches more about software than a semester about it.", tag: "RECEIPT", bait: "survivorship bias with a keyboard" },
      { claim: "Half the AI advice online is written by people who have never had a customer complain about their thing at 6pm on a Friday.", tag: "SHARP", bait: "you can learn plenty without shipping" },
    ],
  },
  {
    lane: "TECH MEETS SPIRITUALITY", // differentiator — run sparingly
    topics: [
      { claim: "The tool is a mirror. What you build with AI is a readout of your imagination, nothing else.", tag: "SHARP", bait: "or it's a readout of the training data" },
      { claim: "People are outsourcing cognition and calling it productivity.", tag: "SHARP", bait: "calculators were 'outsourcing cognition' too" },
    ],
  },
];

// Voice mechanics injected into any generator using these topics.
export const CONTROVERSY_VOICE = `
OPINION MECHANICS (non-negotiable):

THE TARGET REACTION IS A REPOST, NOT AN ARGUMENT.
Someone reposts a claim when it says a thing they already half-believed but could not put into words, and sharing it makes them look sharp to their own audience. Nobody reposts a post they are busy correcting. Before writing, ask: "would a small business owner send this to their operations person?" If the honest answer is "no, but someone might argue with it", rewrite it.

STAY ON YOUR OWN GROUND.
Only make claims about building and running AI automation for small and service businesses. Do not make authority claims about film, art history, academia, medicine, law, aviation, or any field the author does not work in. Those posts reach the wrong room: experts arrive to correct you, and correctors never follow. If a claim needs knowledge the author does not have, it is the wrong claim.

- Write like a real person talking, not a brand posting. Direct, specific, unhedged.
- NEVER mention the author's personal life, job history, backstory, credentials, or how many systems he has built. No autobiography, no "I went from X to Y", no numbers about his own work. The topic argues itself.
- Short sentences. Punch, don't explain. Cut every word that sounds professional or polished.
- Never "in my opinion", never "I think", never "perhaps". Zero hedging. Conviction is the point.
- Talk to the reader: "you", "your intake", "your follow-up". Be concrete about the work, never about who they are as a person.
- Attack the IDEA and the HABIT, never the group's identity. "Most owners automate the wrong thing first" is the shape. "Credential collectors are coping" is not: it insults a group, and insulted groups reply instead of reposting.
- No contempt, no mockery, no "cope", no "keep telling yourself that", no "I'll wait". That register produced 70 replies, 0 reposts and 2 followers in a month. It reads as a bot picking fights, and one reader said exactly that out loud.
- Be specific enough to be useful. A number, a named workflow, a concrete before-and-after. Specificity is what makes a post worth resharing; a vague hot take is only worth arguing with.
- Be defensible. Someone should be able to disagree and still think you know what you are talking about.
- Free content teaches WHAT, WHY, and WHEN only. Never the HOW — the HOW is paid.
- Goal reactions, in order: repost it, send it to a colleague, reply with their own experience.
- These mechanics OVERRIDE any softer or more professional tone guidance elsewhere in this prompt. The only rules that survive: no em dashes or en dashes ever, no hashtags on opinion posts, WHAT/WHY/WHEN only.`;

// ─── PICKER — 2 grounded claims per 1 sharper one ────────────────────────────
// Cycle of 3: receipt, receipt, sharp. RAGEBAIT is gone; SHARP is the same
// ground with a harder edge, not a fight with a different room. Position
// persists in-memory per process; a restart re-anchors it, fine at this cadence.

let cycle = 0;
let lastClaim = null;

export function pickControversyTopic() {
  const wantTag = cycle % 3 === 2 ? "SHARP" : "RECEIPT";
  cycle++;

  // Sparingly-run lane gets 1/6 odds; others uniform
  const eligibleLanes = LANES.filter((l) =>
    l.lane === "TECH MEETS SPIRITUALITY" ? Math.random() < 0.17 : true
  );
  const pool = eligibleLanes
    .flatMap((l) => l.topics.map((t) => ({ ...t, lane: l.lane })))
    .filter((t) => t.tag === wantTag && t.claim !== lastClaim);

  const all = pool.length
    ? pool
    : LANES.flatMap((l) => l.topics.map((t) => ({ ...t, lane: l.lane })));
  const pick = all[Math.floor(Math.random() * all.length)];
  lastClaim = pick.claim;
  return pick; // { lane, claim, tag, bait }
}

// ─── GENERATOR MODE — invent fresh topics with the same DNA ──────────────────
// Called ad hoc (CLI) or when the static pool feels stale.

export async function generateFreshTopics(n = 5) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `You are Agent X's controversy topic generator.

DNA to preserve:
- Blunt, specific claims stated as fact, not hedged
- Attacks a HABIT or an IDEA, never a group's identity
- Concrete enough to be useful: a number, a named workflow, a real before-and-after
- Defensible: a reader can disagree and still think the author knows the work

CONSTRAINTS:
- STAY ON GROUND THE AUTHOR ACTUALLY OPERATES ON: building AI automation for small and service businesses. No claims about film, art, academia, medicine, law, aviation or any field he does not work in. Off-niche claims reach experts who correct him, and correctors never follow.
- The target reaction is a REPOST, not an argument. If the only natural reply is "actually, no", it is the wrong topic.
- NEVER reference the author's personal life, job history, backstory, or counts of his own work — claims must argue themselves
- Free content = WHAT/WHY/WHEN only, never HOW
- Flag each new topic as RECEIPT (grounded in shipped work) or SHARP (harder edge, same ground)
- Keep a 2:1 receipt-to-sharp ratio in the batch
- Never use em dashes, en dashes, or hyphens as pauses

TASK: Generate ${n} new controversy topics not in my existing lanes. Respond with valid JSON only:
[{"lane": "existing or new lane name", "claim": "one-line claim", "tag": "RECEIPT|SHARP", "bait": "the strongest objection to the claim, used internally as a stress test and never printed in a post"}]`,
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(raw.slice(raw.indexOf("[")));
}

// CLI: node agent/controversy-topics.js [--fresh N]
if (process.argv[1]?.endsWith("controversy-topics.js")) {
  if (process.argv.includes("--fresh")) {
    const n = parseInt(process.argv[process.argv.indexOf("--fresh") + 1] ?? "5", 10);
    generateFreshTopics(n).then((t) => { console.log(JSON.stringify(t, null, 2)); process.exit(0); });
  } else {
    for (let i = 0; i < 6; i++) console.log(pickControversyTopic());
    process.exit(0);
  }
}
