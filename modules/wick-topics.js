import supabase from "../supabase/client.js";

// ─── WICK'S WISDOM — TOPIC REGISTRY ──────────────────────────────────────────
// The 30 episodes. This file is the source of truth for WHAT the page talks
// about. The copy engine only decides HOW a topic is written, never what it is.
//
// Letting the model pick its own theme is what produced philosophy posts. It
// cannot drift if it never chooses the subject.
//
// Mix, enforced by pickTopic():
//   80%  HYBRID          behaviour hook that pays off in money (the integration)
//   10%  MIND_BEHAVIOUR  how the head runs the hands
//   10%  MONEY_SYSTEMS   how the machine is built and who it pays

export const LANES = {
  HYBRID: { weight: 0.8, label: "Behaviour into Money" },
  MIND_BEHAVIOUR: { weight: 0.1, label: "Mind into Behaviour" },
  MONEY_SYSTEMS: { weight: 0.1, label: "Money into Systems" },
};

// hook = the behavioural mechanic. payoff = where it shows up in money.
// Both are the SPINE of the post, not copy to be quoted verbatim.
export const TOPICS = [
  // ── HYBRID (80%) — behaviour hook, money payoff ──────────────────────────
  { id: 1,  lane: "HYBRID", title: "Why You Avoid Checking Your Bank Account", hook: "Ostrich effect", payoff: "Avoidance compounds into fees", published: true },
  { id: 2,  lane: "HYBRID", title: "Why a Raise Never Feels Like Enough", hook: "Hedonic adaptation", payoff: "Lifestyle creep math" },
  { id: 3,  lane: "HYBRID", title: "Why You Overspend When You're Sad", hook: "Emotional regulation", payoff: "How retailers target that moment" },
  { id: 4,  lane: "HYBRID", title: "Why Debt Feels Heavier Than the Number", hook: "Cognitive load", payoff: "Balance order vs interest rate" },
  { id: 5,  lane: "HYBRID", title: "Why Treat Yourself Is the Most Expensive Phrase", hook: "Moral licensing", payoff: "Recurring spend vs compounding" },
  { id: 6,  lane: "HYBRID", title: "Why Free Trials Work on You Every Time", hook: "Loss aversion plus defaults", payoff: "Subscription drift engineering" },
  { id: 7,  lane: "HYBRID", title: "Why You'd Rather Not Know Your Credit Score", hook: "Avoidance", payoff: "What the score actually measures" },
  { id: 8,  lane: "HYBRID", title: "Why On Sale Makes You Spend More", hook: "Anchoring", payoff: "Manufactured reference pricing" },
  { id: 9,  lane: "HYBRID", title: "Why You Stay Loyal to Brands That Overcharge You", hook: "Identity plus sunk cost", payoff: "How loyalty programs profit" },
  { id: 10, lane: "HYBRID", title: "Why Payday Feels Like Permission", hook: "Mental accounting", payoff: "Why windfalls vanish" },
  { id: 11, lane: "HYBRID", title: "Why You Can't Stop Scrolling Shopping Apps", hook: "Variable reward", payoff: "Infinite scroll and one click design" },
  { id: 12, lane: "HYBRID", title: "Why Splitting the Bill Always Feels Unfair", hook: "Fairness bias", payoff: "Why groups overspend" },
  { id: 13, lane: "HYBRID", title: "Why You Keep Things You Never Use", hook: "Endowment effect", payoff: "Real cost of storage and clutter" },
  { id: 14, lane: "HYBRID", title: "Why Owning Feels Safer Than Renting", hook: "Status quo bias", payoff: "The math both directions" },
  { id: 15, lane: "HYBRID", title: "Why Your Budget Dies in Week Three", hook: "Planning fallacy", payoff: "Structural failure of fixed budgets" },
  { id: 16, lane: "HYBRID", title: "Why the First Price You Hear Ruins the Deal", hook: "Anchoring", payoff: "Negotiation and salary offers" },
  { id: 17, lane: "HYBRID", title: "Why You Spend More With a Card Than Cash", hook: "Pain of paying", payoff: "Tap to pay raises spend" },
  { id: 18, lane: "HYBRID", title: "Why You Say Yes to Things You Can't Afford", hook: "Social conformity", payoff: "Cost of keeping up" },
  { id: 19, lane: "HYBRID", title: "Why Ten Dollars a Month Feels Like Nothing", hook: "Denomination effect", payoff: "The annual number" },
  { id: 20, lane: "HYBRID", title: "Why You Fight Harder to Avoid Losing Than to Win", hook: "Loss aversion", payoff: "Sunk cost in jobs and investments" },

  // ── MIND & BEHAVIOUR (10%) ───────────────────────────────────────────────
  { id: 21, lane: "MIND_BEHAVIOUR", title: "Why You Procrastinate, and It Isn't Laziness", hook: "Avoiding a feeling, not a task", payoff: "Avoiding a feeling, not a task" },
  { id: 22, lane: "MIND_BEHAVIOUR", title: "Why You Self Sabotage Right Before You Win", hook: "Success threatens self image", payoff: "Success threatens self image" },
  { id: 23, lane: "MIND_BEHAVIOUR", title: "Why People Ghost You", hook: "Avoidance is cheaper than confrontation", payoff: "Avoidance is cheaper than confrontation" },
  { id: 24, lane: "MIND_BEHAVIOUR", title: "Why Criticism Sticks and Praise Doesn't", hook: "Negativity bias", payoff: "Negativity bias" },
  { id: 25, lane: "MIND_BEHAVIOUR", title: "Why Time Feels Faster Every Year", hook: "Fewer new experiences to encode", payoff: "Fewer new experiences to encode" },

  // ── MONEY & SYSTEMS (10%) ────────────────────────────────────────────────
  { id: 26, lane: "MONEY_SYSTEMS", title: "How Credit Scores Actually Work", hook: "Measures profitability to lenders, not responsibility", payoff: "Measures profitability to lenders, not responsibility" },
  { id: 27, lane: "MONEY_SYSTEMS", title: "Why Rent Keeps Going Up", hook: "Supply, zoning, who sets the price", payoff: "Supply, zoning, who sets the price" },
  { id: 28, lane: "MONEY_SYSTEMS", title: "What Inflation Really Does to Your Savings", hook: "Sitting still is a decision with a cost", payoff: "Sitting still is a decision with a cost" },
  { id: 29, lane: "MONEY_SYSTEMS", title: "How Minimum Payments Are Designed", hook: "The payment schedule is the product", payoff: "The payment schedule is the product" },
  { id: 30, lane: "MONEY_SYSTEMS", title: "Where Your Money Goes When You Swipe", hook: "The invisible chain taking a cut", payoff: "The invisible chain taking a cut" },
];

export const byId = (id) => TOPICS.find((t) => t.id === id);

// Which topics have already been posted. Falls back to "none" so a DB outage
// degrades to repeats rather than to no posts at all.
async function usedTopicIds() {
  const { data, error } = await supabase.from("wick_posts").select("topic_id").not("topic_id", "is", null);
  if (error) {
    console.warn(`[WickTopics] could not read history: ${error.message}`);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.topic_id));
}

// Extend the registry rather than repeat it. Dre: "you're never going to
// recycle, you're always going to be generating more." The 30 seed episodes are
// four weeks of posting at 2/day, so once a lane runs dry new episodes are
// written in the same shape and stored, keeping the 80/10/10 mix intact.
//
// Generated ids start at 1000 so a seed episode is always distinguishable.
async function extendLane(lane, need, existing) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const sample = TOPICS.filter((t) => t.lane === lane).slice(0, 6)
    .map((t) => `${t.title} | ${t.hook} | ${t.payoff}`).join("\n");
  const taken = existing.map((t) => t.title).join("; ");

  const brief = {
    HYBRID: "A behavioural mechanic people feel every week, whose cost shows up in money. Voice reference: Rohn and Nightingale on the behaviour, Hormozi and Buffett on the number.",
    MIND_BEHAVIOUR: "How a thought pattern produces an action. Voice reference: Jim Rohn, Earl Nightingale, Tony Robbins, Florence Scovel Shinn.",
    MONEY_SYSTEMS: "How a money machine is built and who it pays. Voice reference: Hormozi, Dalio, Buffett, Kiyosaki. Mechanism only, never advice.",
  }[lane];

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1600,
    messages: [{ role: "user", content: `Write ${need} new episode ideas for a behavioural-money Instagram page.

LANE: ${lane}. ${brief}

Existing episodes in this lane, for shape only:
${sample}

Already covered on the page, do NOT duplicate or restate any of these:
${taken}

Rules: present day only. No philosophy, no philosophers, no history. Name a real
behavioural or structural mechanic, not a vibe. The payoff must be something a
person can check. Never name a real company or living person.

Return ONLY a JSON array:
[{"title":"Why ...","hook":"the mechanic, 2-6 words","payoff":"where it lands, 3-8 words"}]` }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const items = JSON.parse(raw.slice(raw.search(/[[{]/)));
  const base = 1000 + Math.max(0, ...existing.filter((t) => t.id >= 1000).map((t) => t.id - 1000));
  const fresh = items.map((it, i) => ({ ...it, id: base + i + 1, lane, generated: true }));

  // upsert, not insert: three same-day batches each computed ids from the same
  // base-1000 counter and collided on the primary key, so generated topics
  // stopped persisting at all — which quietly erodes the topic dedup memory.
  const { error } = await supabase.from("wick_generated_topics")
    .upsert(fresh.map((t) => ({ topic_id: t.id, lane: t.lane, title: t.title, hook: t.hook, payoff: t.payoff })),
            { onConflict: "topic_id", ignoreDuplicates: true });
  if (error) console.warn(`[WickTopics] could not persist generated topics: ${error.message}`);
  console.log(`[WickTopics] Generated ${fresh.length} new ${lane} episode(s).`);
  return fresh;
}

// Everything available: the 30 seeds plus anything generated previously.
async function allTopics() {
  const { data } = await supabase.from("wick_generated_topics").select("*");
  const gen = (data ?? []).map((r) => ({
    id: r.topic_id, lane: r.lane, title: r.title, hook: r.hook, payoff: r.payoff, generated: true,
  }));
  return [...TOPICS, ...gen];
}

// Pick `count` topics honouring the 80/10/10 mix, preferring unused ones.
// Episode 1 is excluded by default because it is already published.
export async function pickTopics(count, { allowPublished = false } = {}) {
  const used = await usedTopicIds();
  const pool = await allTopics();
  const eligible = pool.filter((t) => allowPublished || !t.published);

  const quota = {
    HYBRID: Math.round(count * LANES.HYBRID.weight),
    MIND_BEHAVIOUR: Math.round(count * LANES.MIND_BEHAVIOUR.weight),
    MONEY_SYSTEMS: Math.round(count * LANES.MONEY_SYSTEMS.weight),
  };
  // Rounding can under or overshoot; settle the difference on the main lane.
  quota.HYBRID += count - (quota.HYBRID + quota.MIND_BEHAVIOUR + quota.MONEY_SYSTEMS);

  const picked = [];
  for (const [lane, n] of Object.entries(quota)) {
    if (n <= 0) continue;
    const lanePool = eligible.filter((t) => t.lane === lane);
    let unused = lanePool.filter((t) => !used.has(t.id));

    // Out of fresh material in this lane: write more rather than repeat.
    if (unused.length < n) {
      try {
        const made = await extendLane(lane, n - unused.length, lanePool);
        unused = [...unused, ...made];
      } catch (err) {
        console.warn(`[WickTopics] ${lane} generation failed (${err.message}) — reusing oldest instead`);
      }
    }
    const ordered = [...unused, ...lanePool.filter((t) => used.has(t.id))];
    picked.push(...ordered.slice(0, n));
  }
  return picked;
}

// CLI: node modules/wick-topics.js [count]
if (process.argv[1]?.endsWith("wick-topics.js")) {
  const n = parseInt(process.argv[2] ?? "14", 10);
  pickTopics(n).then((ts) => {
    for (const t of ts) console.log(`${String(t.id).padStart(2)} [${t.lane}] ${t.title}`);
    process.exit(0);
  });
}
