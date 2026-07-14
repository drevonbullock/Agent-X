import "dotenv/config";

// ─── AGENT X CONTROVERSY CONTENT ENGINE ──────────────────────────────────────
// Dre's fight-picking topic system (2026-07-13). Blunt, binary, ranked claims
// stated as settled fact. Attacks a group's identity, not just the idea, and
// leaves one obvious counterargument dangling as comment bait.
//
// RATIO RULE: 2 receipt-backed posts per 1 pure-ragebait post — receipts
// attract buyers, pure ragebait attracts dunk-farmers.
// FREE CONTENT = WHAT / WHY / WHEN only. HOW stays paid.

export const RECEIPTS = [
  "Went from hospital kitchen to 13+ production AI systems, no coding background",
  "Self-taught by building, not by degree",
  "Ships real AI film/creative work (AS ABOVE, Rune Fall, Iron Gospel)",
  "Builds in public — shows broken builds, not just wins",
];

// tag: RECEIPT = backed by Dre's lived proof. RAGEBAIT = pure fight-starter.
export const LANES = [
  {
    lane: "AI FILM > REAL FILM",
    topics: [
      { claim: "AI film is the present, not the future. 'It's not real art' is film-school cope.", tag: "RECEIPT", bait: "so why do AI films still flop at the box office?" },
      { claim: "A solo creator with AI out-produces a $200M studio in relevance, not budget.", tag: "RECEIPT", bait: "relevance doesn't pay crews or win Oscars" },
      { claim: "'AI can't replicate emotion' — all film emotion was always manufactured.", tag: "RAGEBAIT", bait: "manufactured by humans who felt something first" },
      { claim: "Gatekeeping was the job description. Shoot-on-film identity was never the craft.", tag: "RAGEBAIT", bait: "constraints are what made those directors great" },
    ],
  },
  {
    lane: "AI > HUMANS AT WORK",
    topics: [
      { claim: "AI already beats most humans at most desk jobs. We're negotiating denial, not capability.", tag: "RECEIPT", bait: "then why does every AI rollout still need human cleanup?" },
      { claim: "'AI will never replace X' just announces which job you're emotionally attached to.", tag: "RAGEBAIT", bait: "some jobs are protected by law, not emotion" },
      { claim: "You don't lose your job to AI. You lose it to the coworker who learned it first.", tag: "RECEIPT", bait: "until the company replaces that coworker too" },
      { claim: "I went from a hospital kitchen to production AI systems. If I did it from the bottom, no white-collar job is safe.", tag: "RECEIPT", bait: "one person's story isn't a labor market" },
    ],
  },
  {
    lane: "SELF-TAUGHT > CREDENTIALED",
    topics: [
      { claim: "College taught permission. Building taught shipping. Only one of those pays in 2026.", tag: "RECEIPT", bait: "try shipping your way into medicine or law" },
      { claim: "You don't need a CS degree. You need 90 days and the willingness to look stupid in public.", tag: "RECEIPT", bait: "survivorship bias with a keyboard" },
    ],
  },
  {
    lane: "CREATOR ECONOMY HONESTY",
    topics: [
      { claim: "'AI founders' with no shipped product: screenshots aren't systems. Where's the live URL?", tag: "RECEIPT", bait: "not everything worth building is public" },
    ],
  },
  {
    lane: "TECH MEETS SPIRITUALITY", // differentiator — run sparingly
    topics: [
      { claim: "The tool is a mirror. What you build with AI is a readout of your imagination, nothing else.", tag: "RAGEBAIT", bait: "or it's a readout of the training data" },
      { claim: "People are outsourcing cognition and calling it productivity.", tag: "RAGEBAIT", bait: "calculators were 'outsourcing cognition' too" },
    ],
  },
];

// Voice mechanics injected into any generator using these topics.
export const CONTROVERSY_VOICE = `
CONTROVERSY MECHANICS (non-negotiable):
- Write like Dre talking, not like a brand posting. Raw, first person, unapologetic. This is HIS opinion stated as fact and he does not care if you like it.
- Short brutal sentences. Punch, don't explain. Cut every word that sounds professional or polished. If it could survive a corporate comms review, rewrite it.
- Never "in my opinion", never "I think", never "perhaps". Zero hedging. The second you soften it, the fight dies.
- Talk AT the reader: "you", "your degree", "your job". Make it personal. Name what they're protecting (ego, comfort, sunk cost, identity).
- Attack the group's identity, not just the idea (film-school purists, credential collectors, screenshot founders, LinkedIn theorists).
- Contempt is allowed. Mockery is allowed. "Cope", "keep telling yourself that", "I'll wait" energy. Never punch at protected traits, always at choices and cope.
- Do NOT end with a polite question. End with the dangling counterargument thrown down like a dare, unanswered. That is the comment bait.
- Free content teaches WHAT, WHY, and WHEN only. Never the HOW — the HOW is paid.
- Goal reactions: argue back, pick a side, tag someone, screenshot it angry.
- These mechanics OVERRIDE any softer or more professional tone guidance elsewhere in this prompt. The only rules that survive: no em dashes or en dashes ever, no hashtags on controversy posts, WHAT/WHY/WHEN only.`;

// ─── PICKER — enforces the 2:1 receipt:ragebait ratio ────────────────────────
// Cycle of 3: receipt, receipt, ragebait. Position persists in-memory per
// process; a restart re-anchors the cycle, which is fine at this cadence.

let cycle = 0;
let lastClaim = null;

export function pickControversyTopic() {
  const wantTag = cycle % 3 === 2 ? "RAGEBAIT" : "RECEIPT";
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
- Blunt, binary, "X is better than Y" framing stated as fact
- Attacks a group's identity, not just an idea
- Leaves one dangling counterargument as comment bait
- No hedging, no "in my opinion"
- Provokes: argue back, pick a side, or tag someone

MY RECEIPTS (only pull from these for the strongest angles):
${RECEIPTS.map((r) => `- ${r}`).join("\n")}

CONSTRAINTS:
- Free content = WHAT/WHY/WHEN only, never HOW
- Flag each new topic as RECEIPT or RAGEBAIT
- Keep the 2:1 receipt-to-ragebait ratio in the batch
- Never use em dashes, en dashes, or hyphens as pauses

TASK: Generate ${n} new controversy topics not in my existing lanes. Respond with valid JSON only:
[{"lane": "existing or new lane name", "claim": "one-line claim", "tag": "RECEIPT|RAGEBAIT", "bait": "the dangling counterargument it invites"}]`,
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
