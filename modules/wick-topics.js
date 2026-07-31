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

// Pick `count` topics honouring the 80/10/10 mix, preferring unused ones.
// Episode 1 is excluded by default because it is already published.
export async function pickTopics(count, { allowPublished = false } = {}) {
  const used = await usedTopicIds();
  const eligible = TOPICS.filter((t) => allowPublished || !t.published);

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
    const pool = eligible.filter((t) => t.lane === lane);
    // Unused first, then least recently reused, so the cycle repeats evenly.
    const fresh = pool.filter((t) => !used.has(t.id));
    const ordered = [...fresh, ...pool.filter((t) => used.has(t.id))];
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
