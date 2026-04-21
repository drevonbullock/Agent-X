import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
// No extra dependencies — handles quoted fields and comma-separated values.
function parseCSV(raw) {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row + at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { values.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function parseJSON(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM = `You are a paid media performance analyst.
Given ad performance data, identify underperforming ads.
Flag any ad where: CTR < 1%, ROAS < 2x, or CPC above the account average provided.
Return a JSON array. Each object must have:
  ad_id (string), headline (string), description (string),
  ctr (string), roas (string), cpc (string),
  issue (string — plain English, one sentence),
  severity ("high" | "medium" | "low"),
  recommendation (string — one concrete action)
Return ONLY valid JSON. No markdown fences, no explanation.`;

const HEADLINE_SYSTEM = `You are a direct response copywriter.
Given an underperforming ad headline and its performance data, write 3 new headline variations.
Each variation must use a different technique: curiosity gap, stat-led, or benefit-first.
Keep all headlines under 30 characters.
Return a JSON array of exactly 3 objects with keys: headline, technique, why_it_will_work
Return ONLY valid JSON. No markdown fences, no explanation.`;

const DESCRIPTION_SYSTEM = `You are a conversion copywriter.
Given an underperforming ad description and its performance data, write 3 new description variations.
Each must open with a hook, deliver a clear value prop, and end with a CTA.
Return a JSON array of exactly 3 objects with keys: description, hook_type, cta
Return ONLY valid JSON. No markdown fences, no explanation.`;

// ─── SUB-AGENT 1: HEADLINE REWRITER ──────────────────────────────────────────
async function rewriteHeadlines(ad) {
  const prompt = `Underperforming ad:
Headline: "${ad.headline}"
CTR: ${ad.ctr} | ROAS: ${ad.roas} | CPC: ${ad.cpc}
Issue: ${ad.issue}

Write 3 new headlines under 30 characters each.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: HEADLINE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  return parseJSON(msg.content[0].text);
}

// ─── SUB-AGENT 2: DESCRIPTION REWRITER ───────────────────────────────────────
async function rewriteDescriptions(ad) {
  const prompt = `Underperforming ad:
Description: "${ad.description}"
CTR: ${ad.ctr} | ROAS: ${ad.roas} | CPC: ${ad.cpc}
Issue: ${ad.issue}

Write 3 new description variations with hook + value prop + CTA.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 768,
    system: DESCRIPTION_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  return parseJSON(msg.content[0].text);
}

// ─── MAIN: ANALYZE CSV ────────────────────────────────────────────────────────
export async function analyzeAdPerformance(csvPath) {
  console.log(`[AdPerf] Reading: ${csvPath}`);
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(raw);
  console.log(`[AdPerf] Parsed ${rows.length} ads`);

  // Calculate account average CPC from CSV data
  const stripCurrency = (v) => parseFloat(String(v ?? "0").replace(/[$,%x]/g, ""));
  const cpcs = rows
    .map((r) => stripCurrency(r.cpc ?? r.CPC ?? r["Cost per Click"] ?? 0))
    .filter((n) => !isNaN(n) && n > 0);
  const avgCPC = cpcs.length ? cpcs.reduce((a, b) => a + b, 0) / cpcs.length : 0;
  console.log(`[AdPerf] Account avg CPC: $${avgCPC.toFixed(2)}`);

  // Step 1: Claude flags underperformers
  const analyzePrompt = `Account average CPC: $${avgCPC.toFixed(2)}

Ad data (${rows.length} ads):
${JSON.stringify(rows, null, 2)}

Flag every ad where CTR < 1%, ROAS < 2x, or CPC above $${avgCPC.toFixed(2)}.`;

  const analysisMsg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: ANALYSIS_SYSTEM,
    messages: [{ role: "user", content: analyzePrompt }],
  });

  let flaggedAds;
  try {
    flaggedAds = parseJSON(analysisMsg.content[0].text);
  } catch (err) {
    throw new Error(`Claude analysis returned invalid JSON: ${err.message}`);
  }

  console.log(`[AdPerf] Flagged ${flaggedAds.length} underperforming ads`);

  // Step 2: Run headline + description sub-agents on each flagged ad
  const results = [];
  for (const ad of flaggedAds) {
    console.log(`[AdPerf] Rewriting: ${ad.ad_id} | ${ad.severity} severity`);

    const [headlines, descriptions] = await Promise.all([
      rewriteHeadlines(ad).catch((err) => {
        console.error(`[AdPerf] Headline rewrite failed (${ad.ad_id}): ${err.message}`);
        return [];
      }),
      rewriteDescriptions(ad).catch((err) => {
        console.error(`[AdPerf] Description rewrite failed (${ad.ad_id}): ${err.message}`);
        return [];
      }),
    ]);

    results.push({
      ad_id: ad.ad_id,
      severity: ad.severity,
      issue: ad.issue,
      recommendation: ad.recommendation,
      original: {
        headline: ad.headline,
        description: ad.description,
        ctr: ad.ctr,
        roas: ad.roas,
        cpc: ad.cpc,
      },
      new_headlines: headlines,
      new_descriptions: descriptions,
    });
  }

  return {
    analyzed_at: new Date().toISOString(),
    csv_file: csvPath,
    total_ads: rows.length,
    flagged_count: flaggedAds.length,
    account_avg_cpc: parseFloat(avgCPC.toFixed(2)),
    results,
  };
}

// ─── CLI RUNNER ───────────────────────────────────────────────────────────────
// Usage: node modules/ad-performance.js path/to/ads.csv [output.json]
const isMain = process.argv[1] && process.argv[1].endsWith("ad-performance.js");

if (isMain) {
  const csvPath = process.argv[2];
  const outPath = process.argv[3] ?? csvPath?.replace(/\.csv$/i, "-variations.json");

  if (!csvPath) {
    console.error("Usage: node modules/ad-performance.js <ads.csv> [output.json]");
    process.exit(1);
  }

  analyzeAdPerformance(csvPath)
    .then((output) => {
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log(`\n[AdPerf] Done.`);
      console.log(`[AdPerf] ${output.flagged_count} / ${output.total_ads} ads flagged`);
      console.log(`[AdPerf] Output: ${outPath}`);
    })
    .catch((err) => {
      console.error(`[AdPerf] Fatal: ${err.message}`);
      process.exit(1);
    });
}
