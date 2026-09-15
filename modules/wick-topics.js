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
// Mix, enforced by pickTopic(). Dre, 2026-09-15: "Just keep it basic. The page
// teaches about money, investing, and credit. That's it." Equal thirds.

export const LANES = {
  MONEY:     { weight: 1 / 3, label: "Money" },
  INVESTING: { weight: 1 / 3, label: "Investing" },
  CREDIT:    { weight: 1 / 3, label: "Credit" },
};

// hook = the mechanic being taught. payoff = the number or method it lands on.
// Both are the SPINE of the post, not copy to be quoted verbatim.
//
// figures = exact numbers COMPUTED IN CODE (2026-09-13), for every topic whose
// proof depends on compounding, amortisation, a sequence of returns, or fee
// and margin arithmetic (EARN, added after #1's title promised $1,000 on a
// verified $790 net). The
// writer is told to use them verbatim. In testing it copied a reference table
// perfectly but invented numbers the moment a scenario needed real arithmetic,
// so the math lives here and the model only writes around it.
export const TOPICS = [
  // ── MONEY — how to make money and how money works ────────
  { id: 1,  lane: "MONEY", title: "Flip $500 Into $800 Reselling", hook: "Sourcing below market and the 2x rule", payoff: "The 14-day cycle, item by item", figures: "Assumptions stated: 20 items bought at $25 each ($500), all sold at $50 each, 13% marketplace fees, $4 shipping per item. Gross sales $1,000. Fees $130. Shipping $80. Cash back $790, a profit of $290 on $500. The honest round hook is $800, not $1,000." },
  { id: 2,  lane: "MONEY", title: "How To Price A Resale Item So It Sells", hook: "Price is a speed dial, not a value claim", payoff: "Sell-through rate vs margin" },
  { id: 3,  lane: "MONEY", title: "Where To Find Inventory Under $50", hook: "Arbitrage lives where convenience is low", payoff: "Five sourcing channels, real costs" },
  { id: 4,  lane: "MONEY", title: "Test Demand Before You Buy Anything", hook: "Sold listings, not active listings", payoff: "The 10-minute check that prevents dead stock" },
  { id: 5,  lane: "MONEY", title: "What $500 Of Inventory Becomes In A Year", hook: "Turns per year, not margin per item", payoff: "Six turns at 2x vs one turn at 4x", figures: "$500 of inventory, with 17% of every sale lost to fees and shipping. Selling at 2x and reinvesting everything, 6 times in a year: $10,462. Selling once at 4x: $1,660. Honest limit: finding 6 rounds of inventory that sells at 2x is the hard part, and most people cannot." },
  { id: 6,  lane: "MONEY", title: "Your Hourly Rate Is The Wrong Number", hook: "Price the outcome, not the hour", payoff: "Same work, three pricing models" },
  { id: 7,  lane: "MONEY", title: "How To Price Your Own Work", hook: "Anchoring and the first number said", payoff: "What a 20% raise on rate compounds to" },
  { id: 8,  lane: "MONEY", title: "The First $100 You Make Is The Hardest", hook: "Distribution beats product at the start", payoff: "The shortest honest path to a first sale" },
  { id: 9,  lane: "MONEY", title: "Why Most Resellers Quit In Month Two", hook: "Cash tied up in unsold stock", payoff: "Working capital, shown as a cycle" },
  { id: 10, lane: "MONEY", title: "One Skill Into A Paid Service In 30 Days", hook: "Narrow beats broad when you are unknown", payoff: "The 30-day sequence" },
  { id: 11, lane: "MONEY", title: "A $20 Profit, Repeated 50 Times", hook: "Frequency is the variable people ignore", payoff: "$1,000 a month from small margins", figures: "$20 profit per sale, 50 sales a month: $1,000 a month. 50 sales is about 12 a week, fewer than 2 a day." },
  { id: 12, lane: "MONEY", title: "What To Do With Your First $1,000 Of Profit", hook: "Reinvest, reserve, or take it", payoff: "The three-way split and what each costs" },
  { id: 13, lane: "MONEY", title: "Why Reinvesting Beats Withdrawing In Year One", hook: "Compounding applies to inventory too", payoff: "Same start, two paths, 12 months" },
  { id: 14, lane: "MONEY", title: "Negotiate A Raise With A Number", hook: "Evidence beats sentiment in salary talks", payoff: "What a 10% raise compounds to by 40", figures: "Two people, both getting 3% raises every year. One starts at $50,000, the other negotiated $55,000. The $5,000 gap grows with every raise. Over 15 years the second person earns $92,995 more from one conversation." },
  { id: 15, lane: "MONEY", title: "What Your Time Is Actually Worth Right Now", hook: "Opportunity cost when you have no clients", payoff: "When cheap work is the right call" },
  { id: 16, lane: "MONEY", title: "Scaling From 10 Sales To 100", hook: "What breaks first is always fulfilment", payoff: "The three bottlenecks in order" },
  { id: 17, lane: "MONEY", title: "Side Hustle Versus Side Business", hook: "One buys your time back, one does not", payoff: "The test: does it run without you" },
  { id: 18, lane: "MONEY", title: "The Margin You Actually Keep", hook: "Fees, shipping and returns eat the headline", payoff: "Gross to net on a real $100 sale", figures: "A $100 sale: 13% marketplace fee $13, shipping label $8, packaging $1. $78 reaches you. If the item cost $40, the real profit is $38, not the $60 the price suggests." },

  // ── CREDIT — what credit is and how to use it ───────
  { id: 19, lane: "CREDIT", title: "How A Credit Score Is Actually Calculated", hook: "Five weighted inputs, not a mystery", payoff: "What moves it fastest, in order", figures: "Credit score weights (FICO, published): payment history 35%, amounts owed 30%, length of history 15%, new credit 10%, credit mix 10%. Payment history and amounts owed together are 65% of the score." },
  { id: 20, lane: "CREDIT", title: "What A 700 Credit Score Is Worth In Dollars", hook: "A score is a price, not a grade", payoff: "Same loan, three scores, the spread", figures: "$30,000 car loan over 5 years, example rates by score: score 720 at 7% = $594 a month, $35,642 total; score 660 at 11% = $652 a month, $39,136 total; score 600 at 16% = $730 a month, $43,773 total. Score 720 vs 600 on the same car: $8,130 apart." },
  { id: 21, lane: "CREDIT", title: "Good Debt And Bad Debt — The One Test", hook: "Does it produce income or consume it", payoff: "The test applied to four real debts" },
  { id: 22, lane: "CREDIT", title: "Leverage Multiplies Both Directions", hook: "The same multiplier works on losses", payoff: "A 20% move, geared and ungeared", figures: "$10,000 of your own money. A 20% rise makes $12,000 (+20%); a 20% fall makes $8,000 (-20%). Borrow another $10,000 so $20,000 is invested. A 20% rise makes $24,000, minus the $10,000 loan = $14,000 of equity (+40%). A 20% fall makes $16,000, minus the $10,000 loan = $6,000 of equity (-40%). These are before interest on the loan, which makes the fall worse." },
  { id: 23, lane: "CREDIT", title: "Why The Economy Runs On Credit", hook: "Credit is spending that has not happened yet", payoff: "How one loan becomes three incomes" },
  { id: 24, lane: "CREDIT", title: "What An Interest Rate Does Over Time", hook: "Rate compounds against you at the same speed", payoff: "The same balance at 6%, 12%, 24%", figures: "$5,000 left unpaid for 5 years, compounded monthly: at 6% it becomes $6,744; at 12% $9,083; at 24% $16,405." },
  { id: 25, lane: "CREDIT", title: "The Minimum Payment Is A Product", hook: "It shrinks as your balance shrinks", payoff: "12 years vs 4.7, same first payment", figures: "$2,000 card balance at 24%. Paying only the minimum (1% of balance plus interest, $25 floor): 143 months (11.9 years), $4,887 paid in total. Paying a fixed $60 a month, the same as the first minimum, forever: 56 months (4.7 years), $3,329 total. Difference: $1,558 and 7.2 years." },
  { id: 26, lane: "CREDIT", title: "How Credit Utilisation Actually Works", hook: "It is measured on the statement date", payoff: "Why paying early changes the number", figures: "$3,000 credit limit. If $1,500 is on the card when the statement closes, 50% utilisation is reported. Pay $1,200 before the statement closes and $300 remains, so 10% is reported. Same spending, same card, paid in full either way. Only the timing of the payment changed the number." },

  // ── INVESTING — what to buy and how it makes money ───────────
  { id: 27, lane: "INVESTING", title: "What Compounding Returns Over 40 Years", hook: "Growth is exponential, intuition is linear", payoff: "The curve, decade by decade", figures: "$100 a month at 7% a year, compounded monthly: 10 years $17,308 (you put in $12,000) | 20 years $52,093 (you put in $24,000) | 30 years $121,997 (you put in $36,000) | 40 years $262,481 (you put in $48,000)." },
  { id: 28, lane: "INVESTING", title: "Why Time Beats Amount", hook: "A 10-year head start outruns a bigger sum", payoff: "Two savers, same total, different end", figures: "Both at 7% a year, compounded monthly, both measured at age 65. Saver A puts in $200 a month from 25 to 35, then stops forever: $280,968 (put in $24,000). Saver B puts in $200 a month from 35 to 65: $243,994 (put in $72,000). A put in $48,000 less and ends $36,974 ahead." },
  { id: 29, lane: "INVESTING", title: "What Actually Happens When You Buy A Share", hook: "The mechanics of ownership and settlement", payoff: "Where the money goes, step by step" },
  { id: 30, lane: "INVESTING", title: "What A 1% Fee Costs Over A Lifetime", hook: "Fees compound exactly like returns do", payoff: "Same portfolio, 1% apart, 30 years", figures: "$200 a month for 30 years. Earning 7%: $243,994. Earning 6% because of a 1% fee: $200,903. The fee cost $43,091. You put in $72,000 either way." },
  { id: 31, lane: "INVESTING", title: "Why Averaging In Works Mechanically", hook: "Fixed money buys more units when prices fall", payoff: "The arithmetic, not the reassurance", figures: "$100 invested on three dates, at prices $10, $5, then $10. $100 buys 10 units, then 20 units, then 10 units: 40 units for $300. Average cost per unit $7.50, while the average price was $8.33. The fixed amount bought more units when the price was low." },
  { id: 32, lane: "INVESTING", title: "The Downside Nobody Puts In The Hook", hook: "Sequence risk and why timing still bites", payoff: "The same average return, two orders", figures: "Start with $100,000. Same three yearly returns, two orders: -20%, +10%, +10% versus +10%, +10%, -20%. With no money added or taken out, both end at $96,800 and $96,800: order does not matter. Now take out $5,000 at the end of each year. Crash first ends at $80,250; crash last ends at $83,400. Once money is flowing out, a crash early costs $3,150 more." },

  // ── ADDED 2026-09-15 — Dre's list, and named funds/broker ────────────────
  { id: 33, lane: "INVESTING", title: "What VOO Is And Why You Should Buy It", hook: "One fund that owns the 500 biggest US companies", payoff: "What $100 a month in VOO becomes", figures: "VOO owns the S&P 500: about 500 of the biggest US companies in one fund. Its fee (expense ratio) is 0.03%, which is $3 a year on $10,000. $100 a month at 7% a year, compounded monthly: 10 years $17,308 (you put in $12,000) | 20 years $52,093 (you put in $24,000) | 30 years $121,997 (you put in $36,000). For comparison, in 2025 the average index stock ETF charged 0.14% and the average actively managed stock mutual fund charged 0.65% (Investment Company Institute). On $10,000 that is $14 and $65 a year, against $3 for VOO." },
  { id: 34, lane: "INVESTING", title: "VOO vs VTI vs SPY: Which One To Buy", hook: "Same idea, different size and fee", payoff: "The fees side by side on $10,000", figures: "VOO and SPY both track the S&P 500, about 500 of the biggest US companies. VTI owns the whole US stock market, including small and mid-size companies. Fees (expense ratios): VOO 0.03%, VTI 0.03%, SPY 0.0945%. On $10,000 that is $3 a year for VOO or VTI and $9.45 a year for SPY; over 10 years with no growth, $30 versus $94.50." },
  { id: 35, lane: "INVESTING", title: "How To Buy Your First ETF On Webull", hook: "Fractional shares mean a few dollars is enough to start", payoff: "The steps, in order", figures: "Webull charges $0 commission to buy US stocks and ETFs. Fractional shares let you buy a slice of an ETF with a dollar amount instead of a whole share, so $5 is enough to start. Steps in the Webull app: search the ETF (a green diamond means it can be bought in fractions), tap Trade, set the order type to Market, change Amount in from Share to USD, type the dollar amount ($5 minimum), and submit. Fractional orders are market orders only and fill during regular market hours, 9:30am to 4:00pm Eastern. A market order buys at the current price while the market is open, not at the day's opening price." },
  { id: 36, lane: "INVESTING", title: "How Investing Actually Makes You Money", hook: "Price growth plus dividends", payoff: "Where the return on $10,000 comes from", figures: "Example: $10,000 earning 7% a year, split into 5.5% price growth and 1.5% dividends. After one year the shares are worth $10,550 and paid $150 in dividends: $10,700 total, which is the 7%. Reinvesting the dividends is what lets that 7% compound." },
  { id: 37, lane: "INVESTING", title: "How To Create Your Own Investment", hook: "An asset is anything that pays you back", payoff: "Three ways to build one starting from $1,000", figures: "Two ways to build an investment from $1,000. Put $1,000 in VOO: at 7% a year that earns about $70 in the first year, and it keeps compounding. Or buy $1,000 of resale stock: 40 items at $25, sold at $50 each, with 13% fees ($260) and $4 shipping each ($160), returns $1,580, a $580 profit per round." },
  { id: 38, lane: "CREDIT", title: "What Credit Actually Is", hook: "Credit is borrowing against your future income", payoff: "What a lender is really buying from you", figures: "$1,000 on a credit card at 24% a year, paid off in 12 equal monthly payments: $94.56 a month, $1,134.72 total, $134.72 of interest. A $20,000 car loan at 7% a year over 5 years: $396.02 a month, $23,761 total, $3,761 of interest. Interest is the price of using money you have not earned yet." },
  { id: 39, lane: "CREDIT", title: "How To Take Advantage Of Credit", hook: "Use credit only where it earns more than it costs", payoff: "When borrowing makes you money", figures: "Pay the full statement balance every month and credit card interest is $0. On $1,000 a month of normal spending, a 2% cash back card returns $20 a month, $240 a year. Borrowing to buy something that earns more than the loan costs: $10,000 borrowed at 6% costs $600 a year; if it earns 10%, that is $1,000 a year, leaving $400 a year before taxes." },
  { id: 40, lane: "MONEY", title: "How Money Actually Works", hook: "Money flows toward whoever owns assets", payoff: "A paycheck versus an asset on the same $50,000", figures: "A $50,000 salary stops when the work stops. $50,000 invested at 7% a year earns about $3,500 a year with no work. Money flows toward whoever owns the thing that pays." },
  { id: 41, lane: "MONEY", title: "The Three Ways To Make Money", hook: "Sell your time, sell things, or own things", payoff: "What each one pays when you start", figures: "Sell your time: $20 an hour for 20 hours is $400 a week. Sell things: $500 of resale stock sold at double, after 13% fees and $4 shipping per item, returns $790, a $290 profit. Own things: $10,000 in VOO at 7% a year earns about $700 in a year with no hours worked." },
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
    MONEY: "How to make money and how money works. Concrete steps in order, real figures, no hype.",
    INVESTING: "What investing is, how to create investments, and how to make money from investing. Name the funds and broker and say buy them: VOO, VTI, SPY, Webull.",
    CREDIT: "What credit is and how to take advantage of credit. Plain steps, real numbers.",
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
