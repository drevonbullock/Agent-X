import Anthropic from "@anthropic-ai/sdk";
import { renderCheatsheet, renderVerticalCheatsheet } from "../images/render-cheatsheet.js";

const BRAND_HANDLE = process.env.BRAND_HANDLE ?? "@DrevonBullock";
const BRAND_AUTHOR = process.env.BRAND_AUTHOR ?? "Drevon Bullock";
import { renderNewsScreenshot } from "../images/render-news-screenshot.js";
import { fetchNewsUrl } from "./fetch-news-url.js";
import { generateGeminiImage } from "../images/gemini.js";
import { getRandomBackgroundBase64 } from "../images/background-library.js";
import { generateHiggsfieldImage } from "./generate-higgsfield.js";
import { getTheme } from "../analytics/design-variants.js";

const client = new Anthropic();

// ─── MODE SELECTION ───────────────────────────────────────────────────────────
// Claude picks between CHEATSHEET (default) or NEWS only.

async function selectImageMode(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are an art director selecting the visual treatment for a LinkedIn post image.

POST:
"""
${postText}
"""

---

MODE SELECTION — pick exactly one of these two:

CHEATSHEET — Structured educational card with labeled sections and bullet points.
This is the DEFAULT. Use for anything about AI, automation, business, productivity, tools, frameworks, comparisons, or actionable insights.
Return: {"mode":"cheatsheet"}

NEWS — Playwright screenshots a real news article related to the post.
Use ONLY when the post references a specific real company, product launch, or named announcement that would have a findable news article (e.g. "OpenAI just released...", "Google announced...", "New study from MIT shows...").
Return: {"mode":"news"}

When in doubt: return cheatsheet.

Respond with valid JSON only. No explanation, no markdown fences.`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  // Brace-walker — immune to } inside strings or trailing prose
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc)         { esc = false; continue; }
    if (ch === "\\") { esc = true;  continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return JSON.parse(raw.slice(start, i + 1)); }
  }
  throw new Error("No complete JSON object found in response");
}

// ─── CHEATSHEET CONTENT GENERATOR ────────────────────────────────────────────

async function generateCheatsheetContent(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: `You are building AMMUNITION, not education. The card is the receipt that proves the post's claim — the evidence sheet someone screenshots to win an argument.

Given a post, extract its core claim and build exactly 3 sections that prove it:
- Section 1 = WHAT (the reality of the claim, stated cold)
- Section 2 = WHY (the mechanism behind it, why it's already true)
- Section 3 = WHEN (the timeline, why this is now and not someday)
NEVER the HOW. How-to content is paid. This card argues, it does not teach implementation.

Rules:
- Title: punchy weapon-name energy, max 5 words (e.g. "The Desk-Job Exposure Sheet", "The Fake Founder Checklist") — never generic like "Guide to X"
- Subtitle: one blunt line, max 8 words
- 4 bullet points per section — specific, concrete, verifiable-sounding. Receipts, not opinions. No hedging anywhere.
- badge: 2-3 word ALL-CAPS label that does NOT repeat the section heading (e.g. "ALREADY TRUE", "NO ANNOUNCEMENT", "CLOSING NOW", "KEY RISK")
- what: one sharp sentence under 15 words — the section's claim stated as fact
- tags: 2-3 short keyword pills (1-2 words each)
- Section colors — use only: #FF6B00 (orange), #00D2FF (cyan), #22c55e (green) — one per section, no repeats
- NEVER mention the author's personal life, job history, or counts of his own work
- NEVER invent precise statistics or attribute made-up numbers to named companies or institutions. Use only widely known real facts, or state claims qualitatively. A fake stat loses the argument.
- NEVER use em dashes or en dashes anywhere. Rewrite as separate sentences or comma pauses.
Return only valid JSON. No explanation, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `LinkedIn post:\n\n${postText}\n\nReturn JSON:
{
  "title": "Short punchy title, max 6 words",
  "subtitle": "One-line description, max 8 words",
  "sections": [
    {
      "heading": "Section heading (2-4 words)",
      "color": "#FF6B00",
      "badge": "USE CASE LABEL",
      "what": "One sharp sentence — what this concept actually is.",
      "points": ["Specific actionable point 1", "Point 2", "Point 3", "Point 4"],
      "tags": ["Tag1", "Tag2", "Tag3"]
    }
  ],
  "footer": "${BRAND_HANDLE} • ${BRAND_AUTHOR}"
}`,
      },
    ],
  });

  const raw = message.content[0].text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  // Hard backstop for the no-dash voice rule
  return JSON.parse(raw.replace(/\s*[\u2014\u2013]\s*/g, ", "));
}

// ─── SHARED MODE DISPATCHER ───────────────────────────────────────────────────
// Allowed modes: news | cheatsheet. Any unknown mode falls back to cheatsheet.

async function dispatchMode(decision, postText, { isVertical = false, theme } = {}) {
  const mode = decision.mode;

  if (mode === "news") {
    try {
      const url = await fetchNewsUrl(postText);
      if (url) return await renderNewsScreenshot(url);
      console.warn("[Agent X] No news URL found — falling back to cheatsheet");
    } catch (err) {
      console.warn(`[Agent X] News screenshot failed — falling back to cheatsheet: ${err.message}`);
    }
  }

  // cheatsheet — default for everything
  try {
    const content = await generateCheatsheetContent(postText);

    // Background chain: Higgsfield live (CLI, unique per post) → Higgsfield
    // library (premium, committed to repo) → Gemini → solid.
    let bgBase64 = null;

    if (process.env.USE_HIGGSFIELD === "true") {
      try {
        const hfPrompt = `Premium abstract tech background for a business AI infographic card about "${(postText || "").slice(0, 120)}". Deep navy black base (#0d1830), subtle glowing orange (#FF6B00) geometric accents, soft volumetric light. No text, no letters, no people, no faces, no logos. Dark enough for white text overlays.`;
        const url = await generateHiggsfieldImage(hfPrompt, { aspectRatio: isVertical ? "4:5" : "16:9" });
        const res = await fetch(url);
        if (res.ok) {
          bgBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
          console.log(`[Agent X] Higgsfield live background generated`);
        }
      } catch (hfErr) {
        console.warn(`[Agent X] Higgsfield live bg unavailable (${hfErr.message.slice(0, 80)}) — trying library`);
      }
    }

    if (!bgBase64) {
      bgBase64 = getRandomBackgroundBase64();
      if (bgBase64) console.log(`[Agent X] Higgsfield library background selected`);
    }

    if (!bgBase64) {
      try {
        const bgPrompt = isVertical
          ? `Dark abstract digital art background for a business AI cheatsheet. Deep navy and black tones (#080E1C). Subtle glowing orange circuit-trace geometry, faint grid lines, soft light beams. No text, no characters, no faces. Premium editorial feel. Vertical portrait format.`
          : `Dark abstract tech background for a business AI infographic card. Deep navy-black (#080E1C). Faint glowing orange geometric patterns, subtle circuit lines, soft light rays. No text, no people. Clean premium look. Wide landscape format.`;
        const bgBuf = await generateGeminiImage(bgPrompt);
        bgBase64 = Buffer.from(bgBuf).toString("base64");
        console.log(`[Agent X] Gemini background generated for cheatsheet`);
      } catch (bgErr) {
        console.warn(`[Agent X] Gemini bg failed — using solid bg: ${bgErr.message}`);
      }
    }

    return isVertical
      ? await renderVerticalCheatsheet(content, bgBase64, theme)
      : await renderCheatsheet(content, bgBase64, theme);
  } catch (err) {
    console.warn(`[Agent X] Cheatsheet failed: ${err.message}`);
    return null;
  }
}

// ─── INSTAGRAM — 1080x1920 vertical (9:16) ───────────────────────────────────

export async function generateImageForInstagram(postText, variantId = null) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Instagram] Mode selection failed, defaulting to cheatsheet: ${err.message}`);
    decision = { mode: "cheatsheet" };
  }

  console.log(`[Instagram] Image mode: ${decision.mode.toUpperCase()} (9:16 vertical)`);
  return dispatchMode(decision, postText, { isVertical: true, theme: getTheme(variantId) });
}

// ─── LINKEDIN — 1080x1350 vertical (4:5) ─────────────────────────────────────
// Vertical shows much larger text on mobile. LinkedIn supports 4:5 natively
// and displays it full-height in the feed — far more readable than landscape.

export async function generateImage(postText, variantId = null) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Agent X] Mode selection failed, defaulting to cheatsheet: ${err.message}`);
    decision = { mode: "cheatsheet" };
  }

  console.log(`[Agent X] Image mode: ${decision.mode.toUpperCase()} (4:5 vertical)`);
  return dispatchMode(decision, postText, { isVertical: true, theme: getTheme(variantId) });
}
