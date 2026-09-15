import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { pathToFileURL } from "url";
import supabase from "../supabase/client.js";

// ─── WICK TRENDS ─────────────────────────────────────────────────────────────
// Dre, 2026-09-15: "know what the algorithm is pushing and what the current
// culture on money is and always follow those."
//
// "Always" is the requirement. A brief written once is stale within a month, so
// this refreshes itself weekly (scheduler, Sunday 4:30am ET, before the 6am
// batch): web search for what Instagram rewards and what money content is
// trending right now, condensed into a short brief the writer reads on every
// post. A failed refresh keeps the last good brief. With no brief stored yet,
// the SEED below (researched 2026-09-15) is used, so writing never blocks.
//
//   node modules/wick-trends.js     refresh now and print the brief

const KEY = "wick_trend_brief";
const client = new Anthropic();

const SEED = {
  updated_at: "2026-09-15",
  brief: `WHAT INSTAGRAM IS PUSHING
- Watching to the end and replays are the top ranking signal for Reels. Cut filler.
- Sends by DM are the most heavily weighted signal. Write posts people forward to a specific friend.
- Reels up to 3 minutes now reach non-followers when people stay to the end.
- Original content gets 40 to 60 percent more reach. Reposts are punished.
- Viewers can type the topics they want more of, so name the topic plainly in the first line and caption: investing, credit score, VOO, budgeting.
- Infographic-style finance Reels are saved about 3 times more than talking heads. Faceless finance is a growing format.

MONEY CULTURE RIGHT NOW
- About two thirds of Gen Z learn money on social media (TikTok 39 percent, Instagram 34 percent). About 6 in 10 live paycheck to paycheck, so they want value and distrust anything that wastes their time.
- Moneymaxxing (2026): squeezing the most out of every dollar with high-yield savings, cashback stacking, bill negotiation and credit card points.
- No-buy and low-buy years, revenge saving and recession-indicator memes (2025) are still the mood: keep more of what you earn.
- Buy now, pay later keeps growing (Affirm, Klarna). What it really costs is a live topic.
- Relatable saving stories beat flexing wealth. Reality-check posts get the most comments. Passive income is the most-saved money topic on Instagram. "$200 a month to a million" style challenges are popular.

HOW WICK FOLLOWS IT
- Use the trend's own words when they fit the lesson: moneymaxxing, no-buy year, BNPL.
- Make every post sendable: say exactly who to send it to.
- Use numbers a paycheck-to-paycheck reader can start with ($5, $100 a month), not millionaire flexing.
- Stay in the lane: money, investing, credit. Name the funds and the broker.`,
};

async function readStored() {
  try {
    const { data } = await supabase.from("agent_kv").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) {
      const v = JSON.parse(data.value);
      if (v?.brief) return v;
    }
  } catch { /* fall through to the seed */ }
  return null;
}

// What the writer reads. Never throws: a missing or unreadable brief falls back
// to the seed rather than stopping a batch.
export async function trendBlock() {
  const b = (await readStored()) ?? SEED;
  return `

TREND BRIEF — what the algorithm rewards and what money culture looks like right
now (updated ${b.updated_at}). Dre, 2026-09-15: "know what the algorithm is
pushing and what the current culture on money is and always follow those."
Follow it in every post for the angle, the hook and the language. Statistics in
the brief are context only: put one on a slide only if the topic's own figures
contain it, because every number on a slide must come from those figures.
${b.brief}
`;
}

async function search(query) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  const call = async (withContent) => {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query, limit: 4,
        ...(withContent ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) throw new Error(`search "${query}": ${res.status} ${String(j.error ?? "").slice(0, 120)}`);
    return j.data ?? [];
  };
  // Page text makes a far better brief; titles and snippets are the fallback.
  let rows;
  try { rows = await call(true); } catch { rows = await call(false); }
  return rows.map((r) => ({
    title: String(r.title ?? ""), url: String(r.url ?? ""),
    text: String(r.markdown ?? r.description ?? "").slice(0, 3500),
  }));
}

export async function refreshTrendBrief() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "America/New_York" });
  const queries = [
    `Instagram algorithm update ${month} Reels ranking`,
    `viral personal finance money trends TikTok Instagram ${month}`,
    `money trends Gen Z millennials ${month}`,
  ];

  const results = [];
  for (const q of queries) {
    try { results.push(...(await search(q))); }
    catch (err) { console.warn(`[WickTrends] ${err.message}`); }
  }
  if (!results.length) throw new Error("no search results; keeping the current brief");

  const prev = (await readStored()) ?? SEED;
  const sources = results.map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.text}`).join("\n\n").slice(0, 30000);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: `You maintain a weekly trend brief for Wick's Wisdom, an Instagram page for a US audience that teaches money, investing and credit, names funds and brokers (VOO, VTI, SPY, Webull), and posts carousels and Reels.

Today is ${today}. Below are web results gathered this week. Use ONLY facts supported by these results or by the previous brief. Never invent a statistic or a trend.

Write plain text with exactly these three section headers, each followed by short bullets:
WHAT INSTAGRAM IS PUSHING
MONEY CULTURE RIGHT NOW   (name the specific trends and the phrases people are using)
HOW WICK FOLLOWS IT       (3 to 6 concrete instructions for writing this week's posts, inside the page's lane)

Keep what is still true from the previous brief and replace what is outdated. Maximum 350 words. No em dashes.

PREVIOUS BRIEF (updated ${prev.updated_at}):
${prev.brief}

WEB RESULTS:
${sources}` }],
  });

  const brief = String(msg.content?.[0]?.text ?? "").trim();
  const ok = ["WHAT INSTAGRAM IS PUSHING", "MONEY CULTURE RIGHT NOW", "HOW WICK FOLLOWS IT"].every((h) => brief.includes(h));
  if (!ok) throw new Error("model returned a brief without the three sections; keeping the current brief");

  const value = { brief, updated_at: today, sources: [...new Set(results.map((r) => r.url))].slice(0, 12) };
  const { error } = await supabase.from("agent_kv").upsert({ key: KEY, value: JSON.stringify(value), updated_at: now.toISOString() });
  if (error) throw new Error(`saving brief: ${error.message}`);
  console.log(`[WickTrends] brief refreshed from ${results.length} results`);
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  refreshTrendBrief()
    .then((v) => { console.log(`\n${v.brief}\n\nsources:\n- ${v.sources.join("\n- ")}`); process.exit(0); })
    .catch((e) => { console.error(`[WickTrends] ${e.message}`); process.exit(1); });
}
