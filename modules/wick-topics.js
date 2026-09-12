import supabase from "../supabase/client.js";

// ─── WICK'S WISDOM — TOPIC REGISTRY ──────────────────────────────────────────
// The episodes. This file is the source of truth for WHAT the page talks about.
// The copy engine only decides HOW a topic is written, never what it is.
//
// Letting the model pick its own theme is what produced philosophy posts. It
// cannot drift if it never chooses the subject.
//
// PIVOTED 2026-09-12. Dre moved the page from behavioural money to wealth
// building, knowingly and after the trade-offs were put to him: "how you can
// flip $500 in 2 weeks by reselling and giving the blueprint how, how credit
// works and how to take advantage of good debt, how to find a path to make
// money, how the economy runs on credit and why you should use it, how to
// invest in stocks and why you should."
//
// The old 33 behavioural episodes are retired. They are preserved in git
// history rather than deleted from the world — if the pivot does not produce
// the reach signal Dre is testing for (30 -> 90+ in three weeks), that set is
// one revert away.
//
// Mix, enforced by pickTopic(), weighted to Dre's own stated priority order.
// He led with earning, named credit twice, and investing once:
//   60%  EARN_GROW        make the money, then show what it becomes
//   25%  CREDIT_SYSTEMS   how credit, debt and the economy actually work
//   15%  GROW_SYSTEMS     compounding and the mechanics of investing

export const LANES = {
  EARN_GROW:      { weight: 0.60, label: "Earn × Grow (the blueprint)" },
  CREDIT_SYSTEMS: { weight: 0.25, label: "How credit works" },
  GROW_SYSTEMS:   { weight: 0.15, label: "How compounding works" },
};

// hook = the mechanic being taught. payoff = the number or method it lands on.
// Both are the SPINE of the post, not copy to be quoted verbatim.
export const TOPICS = [
  // ── EARN × GROW (60%) — how money is made, and what it turns into ────────
  { id: 1,  lane: "EARN_GROW", title: "Flip $500 Into $1,000 Reselling", hook: "Sourcing below market and the 2x rule", payoff: "The 14-day cycle, item by item" },
  { id: 2,  lane: "EARN_GROW", title: "How To Price A Resale Item So It Sells", hook: "Price is a speed dial, not a value claim", payoff: "Sell-through rate vs margin" },
  { id: 3,  lane: "EARN_GROW", title: "Where To Find Inventory Under $50", hook: "Arbitrage lives where convenience is low", payoff: "Five sourcing channels, real costs" },
  { id: 4,  lane: "EARN_GROW", title: "Test Demand Before You Buy Anything", hook: "Sold listings, not active listings", payoff: "The 10-minute check that prevents dead stock" },
  { id: 5,  lane: "EARN_GROW", title: "What $500 Of Inventory Becomes In A Year", hook: "Turns per year, not margin per item", payoff: "Six turns at 2x vs one turn at 4x" },
  { id: 6,  lane: "EARN_GROW", title: "Your Hourly Rate Is The Wrong Number", hook: "Price the outcome, not the hour", payoff: "Same work, three pricing models" },
  { id: 7,  lane: "EARN_GROW", title: "How To Price Your Own Work", hook: "Anchoring and the first number said", payoff: "What a 20% raise on rate compounds to" },
  { id: 8,  lane: "EARN_GROW", title: "The First $100 You Make Is The Hardest", hook: "Distribution beats product at the start", payoff: "The shortest honest path to a first sale" },
  { id: 9,  lane: "EARN_GROW", title: "Why Most Resellers Quit In Month Two", hook: "Cash tied up in unsold stock", payoff: "Working capital, shown as a cycle" },
  { id: 10, lane: "EARN_GROW", title: "One Skill Into A Paid Service In 30 Days", hook: "Narrow beats broad when you are unknown", payoff: "The 30-day sequence" },
  { id: 11, lane: "EARN_GROW", title: "A $20 Profit, Repeated 50 Times", hook: "Frequency is the variable people ignore", payoff: "$1,000 a month from small margins" },
  { id: 12, lane: "EARN_GROW", title: "What To Do With Your First $1,000 Of Profit", hook: "Reinvest, reserve, or take it", payoff: "The three-way split and what each costs" },
  { id: 13, lane: "EARN_GROW", title: "Why Reinvesting Beats Withdrawing In Year One", hook: "Compounding applies to inventory too", payoff: "Same start, two paths, 12 months" },
  { id: 14, lane: "EARN_GROW", title: "Negotiate A Raise With A Number", hook: "Evidence beats sentiment in salary talks", payoff: "What a 10% raise compounds to by 40" },
  { id: 15, lane: "EARN_GROW", title: "What Your Time Is Actually Worth Right Now", hook: "Opportunity cost when you have no clients", payoff: "When cheap work is the right call" },
  { id: 16, lane: "EARN_GROW", title: "Scaling From 10 Sales To 100", hook: "What breaks first is always fulfilment", payoff: "The three bottlenecks in order" },
  { id: 17, lane: "EARN_GROW", title: "Side Hustle Versus Side Business", hook: "One buys your time back, one does not", payoff: "The test: does it run without you" },
  { id: 18, lane: "EARN_GROW", title: "The Margin You Actually Keep", hook: "Fees, shipping and returns eat the headline", payoff: "Gross to net on a real $100 sale" },

  // ── CREDIT × SYSTEMS (25%) — how credit, debt and the economy work ───────
  { id: 19, lane: "CREDIT_SYSTEMS", title: "How A Credit Score Is Actually Calculated", hook: "Five weighted inputs, not a mystery", payoff: "What moves it fastest, in order" },
  { id: 20, lane: "CREDIT_SYSTEMS", title: "What A 700 Credit Score Is Worth In Dollars", hook: "A score is a price, not a grade", payoff: "Same loan, three scores, the spread" },
  { id: 21, lane: "CREDIT_SYSTEMS", title: "Good Debt And Bad Debt — The One Test", hook: "Does it produce income or consume it", payoff: "The test applied to four real debts" },
  { id: 22, lane: "CREDIT_SYSTEMS", title: "Leverage Multiplies Both Directions", hook: "The same multiplier works on losses", payoff: "A 20% move, geared and ungeared" },
  { id: 23, lane: "CREDIT_SYSTEMS", title: "Why The Economy Runs On Credit", hook: "Credit is spending that has not happened yet", payoff: "How one loan becomes three incomes" },
  { id: 24, lane: "CREDIT_SYSTEMS", title: "What An Interest Rate Does Over Time", hook: "Rate compounds against you at the same speed", payoff: "The same balance at 6%, 12%, 24%" },
  { id: 25, lane: "CREDIT_SYSTEMS", title: "The Minimum Payment Is A Product", hook: "It shrinks as your balance shrinks", payoff: "12 years vs 4.7, same first payment" },
  { id: 26, lane: "CREDIT_SYSTEMS", title: "How Credit Utilisation Actually Works", hook: "It is measured on the statement date", payoff: "Why paying early changes the number" },

  // ── GROW × SYSTEMS (15%) — compounding and investing mechanics ───────────
  { id: 27, lane: "GROW_SYSTEMS", title: "What Compounding Returns Over 40 Years", hook: "Growth is exponential, intuition is linear", payoff: "The curve, decade by decade" },
  { id: 28, lane: "GROW_SYSTEMS", title: "Why Time Beats Amount", hook: "A 10-year head start outruns a bigger sum", payoff: "Two savers, same total, different end" },
  { id: 29, lane: "GROW_SYSTEMS", title: "What Actually Happens When You Buy A Share", hook: "The mechanics of ownership and settlement", payoff: "Where the money goes, step by step" },
  { id: 30, lane: "GROW_SYSTEMS", title: "What A 1% Fee Costs Over A Lifetime", hook: "Fees compound exactly like returns do", payoff: "Same portfolio, 1% apart, 30 years" },
  { id: 31, lane: "GROW_SYSTEMS", title: "Why Averaging In Works Mechanically", hook: "Fixed money buys more units when prices fall", payoff: "The arithmetic, not the reassurance" },
  { id: 32, lane: "GROW_SYSTEMS", title: "The Downside Nobody Puts In The Hook", hook: "Sequence risk and why timing still bites", payoff: "The same average return, two orders" },
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
    EARN_GROW: "A concrete method for making money, and what that money becomes if it is not spent. Voice reference: Hormozi on the method, Buffett on the compounding. Steps in order, real figures, no hype.",
    CREDIT_SYSTEMS: "How credit, debt and the economy actually work, and who the design pays. Voice reference: Dalio explaining the machine. Both directions of the arithmetic, always.",
    GROW_SYSTEMS: "The arithmetic of compounding and the mechanics of investing. Voice reference: Buffett to a beginner. Never a ticker, fund, broker or platform — the mechanism is the product, not the pick.",
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

  // Derived from LANES rather than hardcoded. The previous version named the
  // three lanes literally, so the 2026-09-12 pivot turned it into a TypeError
  // the moment the lane keys changed. Renaming a lane must never break the
  // scheduler again.
  const laneKeys = Object.keys(LANES);
  const quota = Object.fromEntries(
    laneKeys.map((k) => [k, Math.round(count * LANES[k].weight)]),
  );
  // Rounding can under or overshoot; settle the difference on the heaviest lane.
  const main = laneKeys.reduce((a, b) => (LANES[a].weight >= LANES[b].weight ? a : b));
  quota[main] += count - laneKeys.reduce((sum, k) => sum + quota[k], 0);

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
